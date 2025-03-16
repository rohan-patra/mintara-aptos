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
    
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: content,
    });
    
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
    
    if (embedding.length !== 1536) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Unexpected embedding dimension: got ${embedding.length}, expected 1536` 
        },
        { status: 500 }
      );
    }
    
    const client = new AptosClient('https://fullnode.devnet.aptoslabs.com/v1');
    
    const contractAddress = '0xac202ad8925ededdcc1bfa283818ee9dfae219113356d5f37d6d89ba9f83a937';
    
    const privateKeyHex = process.env.APTOS_PRIVATE_KEY;
    
    if (!privateKeyHex) {
      return NextResponse.json(
        { success: false, error: 'Private key not configured' },
        { status: 500 }
      );
    }
    
    const privateKey = new HexString(privateKeyHex).toUint8Array();
    const account = new AptosAccount(privateKey);
    
    const vectorData = embedding.map((val: number) => {
      const scaled = Math.floor(val * 1000000); 
      const safeBound = Math.max(0, Math.min(scaled, 4294967295)); 
      return safeBound.toString(); 
    });
    
    const ipfsHashHex = '0x' + Buffer.from(ipfsHash).toString('hex');
    
    const payload = {
      function: `${contractAddress}::vector_db::insert_vector`,
      type_arguments: [],
      arguments: [vectorData, ipfsHashHex]
    };
    
    const rawTxn = await client.generateTransaction(account.address(), payload);
    const signedTxn = await client.signTransaction(account, rawTxn);
    const txnResult = await client.submitTransaction(signedTxn);
    
    await client.waitForTransaction(txnResult.hash);
    
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