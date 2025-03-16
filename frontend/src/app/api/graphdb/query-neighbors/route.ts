import { AptosClient, AptosAccount, HexString } from 'aptos';
import type { Types } from 'aptos';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * API endpoint to query neighbors of a CID within a specified radius
 * This requires a GET request with search params containing rootCid and radius
 */
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const rootCid = searchParams.get('rootCid');
    const radiusParam = searchParams.get('radius');
    
    if (!rootCid) {
      return NextResponse.json(
        { success: false, error: 'rootCid is required' },
        { status: 400 }
      );
    }
    
    // Default radius to 1 if not provided
    const radius = radiusParam ? parseInt(radiusParam, 10) : 1;
    
    if (isNaN(radius) || radius < 1) {
      return NextResponse.json(
        { success: false, error: 'radius must be a positive integer' },
        { status: 400 }
      );
    }
    
    // Initialize the Aptos client
    const client = new AptosClient('https://fullnode.devnet.aptoslabs.com/v1');
    
    // Contract address
    const contractAddress = '0xac202ad8925ededdcc1bfa283818ee9dfae219113356d5f37d6d89ba9f83a937';
    
    // Private key for the account from environment variable
    const privateKeyHex = process.env.APTOS_PRIVATE_KEY;
    
    if (!privateKeyHex) {
      return NextResponse.json(
        { success: false, error: 'Private key not configured' },
        { status: 500 }
      );
    }
    
    // Create an account from the private key to get the account address
    const privateKey = new HexString(privateKeyHex).toUint8Array();
    const account = new AptosAccount(privateKey);
    const accountAddress = account.address().toString();

    // First check if the GraphDB exists by calling exists_graph_db
    const existsPayload: Types.ViewRequest = {
      function: `${contractAddress}::graph_db::exists_graph_db`,
      type_arguments: [],
      arguments: [accountAddress]
    };
    
    const existsResponse = await client.view(existsPayload);
    const exists = existsResponse[0] as boolean;
    
    if (!exists) {
      return NextResponse.json({
        success: false,
        error: 'GraphDB has not been initialized for this account',
        accountAddress
      }, { status: 404 });
    }

    // Call the view function to query neighbors
    // Use accountAddress as db_owner since that's where the GraphDB is stored
    const payload: Types.ViewRequest = {
      function: `${contractAddress}::graph_db::query_neighbors`,
      type_arguments: [],
      arguments: [accountAddress, rootCid, radius.toString()]
    };
    
    // Execute the view function
    const response = await client.view(payload);
    
    // The response is an array of strings (vector<String> in Move)
    const neighbors = response[0] as string[];
    
    // Return the response
    return NextResponse.json({ 
      success: true, 
      rootCid,
      radius,
      accountAddress,
      neighbors: neighbors || [],
      count: neighbors ? neighbors.length : 0
    });
  } catch (error) {
    console.error('Error querying neighbors:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 