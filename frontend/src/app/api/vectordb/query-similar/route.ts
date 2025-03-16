import { AptosClient } from 'aptos';
import type { Types } from 'aptos';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { HexString } from 'aptos';
import { AptosAccount } from 'aptos';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * API endpoint to query similar vectors based on a provided text query
 * This generates embeddings via OpenAI and then queries the VectorDB contract
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json() as { query: string; topK?: number };
    const { query, topK = 2 } = body;
    
    if (!query) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'query (text to search) is required' 
        },
        { status: 400 }
      );
    }
    
    // Generate embedding using OpenAI's ada-002 model
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: query,
    });
    
    // Extract the embedding from the response
    const queryEmbedding = embeddingResponse.data[0]?.embedding;
    
    if (!queryEmbedding) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to generate embedding from OpenAI' 
        },
        { status: 500 }
      );
    }
    
    // Check if embedding has the right dimension (1536 for the ada-002 model)
    if (queryEmbedding.length !== 1536) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Unexpected embedding dimension: got ${queryEmbedding.length}, expected 1536` 
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
    
    // Limit values to a safe range that won't overflow u64 in Move
    const vectorData = queryEmbedding.map((val: number) => {
      const scaled = Math.floor(val * 1000000);
      const safeBound = Math.max(0, Math.min(scaled, 4294967295)); // Ensure positive and within u64 range
      return safeBound.toString(); // Convert to string as required by the Aptos API
    });
    
    // Call the view function to query similar vectors
    const payload: Types.ViewRequest = {
      function: `${contractAddress}::vector_db::query_similar_vectors`,
      type_arguments: [],
      arguments: [account.address().hex(), vectorData, topK.toString()]
    };
    
    // Execute the view function
    const response = await client.view(payload);
    
    // The response is an array of similar vectors' IPFS hashes in hex format
    const similarVectorsHex = response[0] as string[];
    
    // Convert hex-encoded IPFS hashes to numbers/integers where possible
    const similarVectors = similarVectorsHex.map(hexValue => {
      try {
        // Remove 0x prefix if present
        const cleanHex = hexValue.startsWith('0x') ? hexValue.slice(2) : hexValue;
        
        // Convert hex to ASCII string
        const asciiString = Buffer.from(cleanHex, 'hex').toString('ascii');
        
        // Try to parse as integer if it looks like a number
        const parsedInt = parseInt(asciiString, 10);
        
        // Return the integer if valid, otherwise return the ASCII string
        return !isNaN(parsedInt) ? parsedInt : asciiString;
      } catch (e) {
        // In case of any error, return the original hex
        return hexValue;
      }
    });
    
    // Return the response
    return NextResponse.json({ 
      success: true, 
      similarVectors: similarVectors || [],
      count: similarVectors ? similarVectors.length : 0,
      topK
    });
  } catch (error) {
    console.error('Error querying similar vectors:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 