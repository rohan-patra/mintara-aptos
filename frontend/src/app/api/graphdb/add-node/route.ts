import { AptosClient, AptosAccount, HexString } from 'aptos';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * API endpoint to add a node to the GraphDB contract
 * This requires a POST request with a JSON body containing the CID
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json() as { cid: string };
    const { cid } = body;
    
    if (!cid) {
      return NextResponse.json(
        { success: false, error: 'CID is required' },
        { status: 400 }
      );
    }
    
    // Initialize the Aptos client (using devnet for this example)
    const client = new AptosClient('https://fullnode.devnet.aptoslabs.com/v1');
    
    // Contract address
    const contractAddress = '0xac202ad8925ededdcc1bfa283818ee9dfae219113356d5f37d6d89ba9f83a937';
    
    // Private key for the account that will sign the transaction
    // In a real application, you would get this from a secure environment variable
    // or a secure key management service
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

    // Create a transaction payload to call the add_node function
    const payload = {
      function: `${contractAddress}::graph_db::add_node`,
      type_arguments: [],
      arguments: [cid]
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
      cid,
      message: 'Node added successfully'
    });
  } catch (error) {
    console.error('Error adding node to GraphDB:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 