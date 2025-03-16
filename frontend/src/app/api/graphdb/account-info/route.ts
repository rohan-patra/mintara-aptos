import { AptosClient, AptosAccount, HexString } from 'aptos';
import { NextResponse } from 'next/server';

/**
 * API endpoint to get information about the account being used
 */
export async function GET() {
  try {
    // Private key for the account from environment variable
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
    
    // Get account address
    const accountAddress = account.address().toString();
    
    // Contract address (for comparison)
    const contractAddress = '0xf7bd6bcfd99df30871e14572eb9d0e42b10a326011d263ddaf808acc2eaa3448';
    
    // Initialize the Aptos client
    const client = new AptosClient('https://fullnode.devnet.aptoslabs.com/v1');
    
    // Check if GraphDB exists at account address
    const accountPayload = {
      function: `${contractAddress}::graph_db::exists_graph_db`,
      type_arguments: [],
      arguments: [accountAddress]
    };
    
    // Check if GraphDB exists at contract address
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
      // Ignore error, default is false
    }
    
    try {
      const contractResponse = await client.view(contractPayload);
      contractHasGraphDB = contractResponse[0] as boolean;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      // Ignore error, default is false
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