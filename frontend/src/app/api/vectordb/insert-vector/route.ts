import { AptosClient, AptosAccount, HexString } from 'aptos';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * API endpoint to insert a vector (embedding) into the VectorDB
 * This accepts a text content, generates embeddings via OpenAI, and inserts into VectorDB
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json() as { content: string; ipfsHash: string };
    const { content, ipfsHash } = body;
    
    if (!content || !ipfsHash) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Both content (text to embed) and ipfsHash are required' 
        },
        { status: 400 }
      );
    }
    
    // Generate embedding using OpenAI's ada-002 model
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: content,
    });
    
    // Extract the embedding from the response
    const embedding = embeddingResponse.data[0]?.embedding;
    console.log(embedding);
    
    if (!embedding) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to generate embedding from OpenAI' 
        },
        { status: 500 }
      );
    }
    
    // Check if embedding has the right dimension (1536 for the ada-002 model)
    if (embedding.length !== 1536) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Unexpected embedding dimension: got ${embedding.length}, expected 1536` 
        },
        { status: 500 }
      );
    }
    
    // Initialize the Aptos client (using devnet for this example)
    const client = new AptosClient('https://fullnode.devnet.aptoslabs.com/v1');
    
    // Contract address
    const contractAddress = '0xac202ad8925ededdcc1bfa283818ee9dfae219113356d5f37d6d89ba9f83a937';
    
    // Private key for the account that will sign the transaction
    const privateKeyHex = process.env.APTOS_PRIVATE_KEY;
    
    if (!privateKeyHex) {
      return NextResponse.json(
        { success: false, error: 'Private key not configured' },
        { status: 500 }
      );
    }
    
    // Create an account from the private key
    const privateKey = new HexString(privateKeyHex).toUint8Array();
    const account = new AptosAccount(privateKey);
    
    // For vector data, convert to integers as required by the Move contract
    // Limit values to a safe range that won't overflow u64 in Move
    const vectorData = embedding.map((val: number) => {
      // Ada002 embeddings are typically in the range of -1 to 1
      // Clamp values to ensure they don't exceed Move's u64 range
      const scaled = Math.floor(val * 1000000); // Scale to integers
      const safeBound = Math.max(0, Math.min(scaled, 4294967295)); // Ensure positive and within u64 range
      return safeBound.toString(); // Convert to string as required by the Aptos API
    });
    
    // Convert the ipfsHash to a hex string
    const ipfsHashHex = '0x' + Buffer.from(ipfsHash).toString('hex');
    
    // Create a transaction payload to call the insert_vector function
    const payload = {
      function: `${contractAddress}::vector_db::insert_vector`,
      type_arguments: [],
      arguments: [vectorData, ipfsHashHex]
    };
    
    // Build and submit the transaction
    const rawTxn = await client.generateTransaction(account.address(), payload);
    const signedTxn = await client.signTransaction(account, rawTxn);
    const txnResult = await client.submitTransaction(signedTxn);
    
    // Wait for the transaction to complete
    await client.waitForTransaction(txnResult.hash);
    
    // Return the response
    return NextResponse.json({
      success: true,
      transactionHash: txnResult.hash,
      ipfsHash,
      message: 'Vector inserted successfully'
    });
  } catch (error) {
    console.error('Error inserting vector:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 