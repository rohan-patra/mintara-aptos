import { AptosClient, AptosAccount, HexString } from 'aptos';
import { NextResponse } from 'next/server';

/**
 * API endpoint to get information about the account being used
 */
export async function GET() {
  try {
    const privateKeyHex = process.env.APTOS_PRIVATE_KEY;
    
    if (!privateKeyHex) {
      return NextResponse.json(
        { success: false, error: 'Private key not configured' },
        { status: 500 }
      );
    }
    
    const privateKey = new HexString(privateKeyHex).toUint8Array();
    const account = new AptosAccount(privateKey);
    
    const accountAddress = account.address().toString();
    
    const contractAddress = '0xf7bd6bcfd99df30871e14572eb9d0e42b10a326011d263ddaf808acc2eaa3448';
    
    const client = new AptosClient('https://fullnode.devnet.aptoslabs.com/v1');
    
    const accountPayload = {
      function: `${contractAddress}::graph_db::exists_graph_db`,
      type_arguments: [],
      arguments: [accountAddress]
    };
    
    const contractPayload = {
      function: `${contractAddress}::graph_db::exists_graph_db`,
      type_arguments: [],
      arguments: [contractAddress]
    };
    
    let accountHasGraphDB = false;
    let contractHasGraphDB = false;
    
    try {
      const accountResponse = await client.view(accountPayload);
      accountHasGraphDB = accountResponse[0] as boolean;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
    }
    
    try {
      const contractResponse = await client.view(contractPayload);
      contractHasGraphDB = contractResponse[0] as boolean;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
    }
    
    return NextResponse.json({
      success: true,
      accountAddress,
      contractAddress,
      accountHasGraphDB,
      contractHasGraphDB,
      sameAddress: accountAddress === contractAddress
    });
  } catch (error) {
    console.error('Error getting account info:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 