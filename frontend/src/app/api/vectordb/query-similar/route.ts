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
    
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: query,
    });
    
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
    
    if (queryEmbedding.length !== 1536) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Unexpected embedding dimension: got ${queryEmbedding.length}, expected 1536` 
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
    
    const vectorData = queryEmbedding.map((val: number) => {
      const scaled = Math.floor(val * 1000000);
      const safeBound = Math.max(0, Math.min(scaled, 4294967295));
      return safeBound.toString();
    });
    
    const payload: Types.ViewRequest = {
      function: `${contractAddress}::vector_db::query_similar_vectors`,
      type_arguments: [],
      arguments: [account.address().hex(), vectorData, topK.toString()]
    };
    
    const response = await client.view(payload);
    
    const similarVectorsHex = response[0] as string[];
    
        
    const similarVectors = similarVectorsHex.map(hexValue => {
      try {
        const cleanHex = hexValue.startsWith('0x') ? hexValue.slice(2) : hexValue;
        
        const asciiString = Buffer.from(cleanHex, 'hex').toString('ascii');
        
        const parsedInt = parseInt(asciiString, 10);
        
        return !isNaN(parsedInt) ? parsedInt : asciiString;
      } catch (e) {
        
        return hexValue;
      }
    });
    
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