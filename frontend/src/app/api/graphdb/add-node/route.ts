import { AptosClient, AptosAccount, HexString } from 'aptos';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * API endpoint to add a node to the GraphDB contract
 * This requires a POST request with a JSON body containing the CID
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { cid: string };
    const { cid } = body;
    
    if (!cid) {
      return NextResponse.json(
        { success: false, error: 'CID is required' },
        { status: 400 }
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

    const payload = {
      function: `${contractAddress}::graph_db::add_node`,
      type_arguments: [],
      arguments: [cid]
    };
    
    const rawTxn = await client.generateTransaction(account.address(), payload);
    const signedTxn = await client.signTransaction(account, rawTxn);
    const txnResult = await client.submitTransaction(signedTxn);
    
    await client.waitForTransaction(txnResult.hash);
    
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