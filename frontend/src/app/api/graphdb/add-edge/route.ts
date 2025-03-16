import { AptosClient, AptosAccount, HexString } from 'aptos';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * API endpoint to add an edge between two CIDs in the GraphDB contract
 * This requires a POST request with a JSON body containing the fromCid and toCid
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json() as { fromCid: string; toCid: string };
    const { fromCid, toCid } = body;
    
    if (!fromCid || !toCid) {
      return NextResponse.json(
        { success: false, error: 'Both fromCid and toCid are required' },
        { status: 400 }
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
    

    // Create a transaction payload to call the add_edge function
    const payload = {
      function: `${contractAddress}::graph_db::add_edge`,
      type_arguments: [],
      arguments: [fromCid, toCid]
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
      fromCid,
      toCid,
      message: 'Edge added successfully'
    });
  } catch (error) {
    console.error('Error adding edge to GraphDB:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 