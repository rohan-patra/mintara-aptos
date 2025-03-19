import { AptosClient, Types } from 'aptos';
import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint to get the resource address for the bonding curve contract
 * This endpoint calls the get_resource_address_view function from the contract
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const moduleAddress = searchParams.get('moduleAddress');
    
    // Initialize the Aptos client
    const client = new AptosClient('https://fullnode.devnet.aptoslabs.com/v1');
    
    // Get the bonding curve contract address from query params, env or use a default
    const contractAddress = moduleAddress || process.env.BONDING_CURVE_ADDRESS || 
      '0xf15a9be44d5a140c69702d2bce3260aeb176bf878ef59bc19703b20a31bcd4c2';
    
    // Call the view function to get the resource address
    try {
      const payload: Types.ViewRequest = {
        function: `${contractAddress}::bonding_curve::get_resource_address_view`,
        type_arguments: [],
        arguments: []
      };
      
      const response = await client.view(payload);
      
      // The view function should return an address as the first element in the response array
      const resourceAddress = response[0] as string;

      // Get accounts resources for more information
      let resourceExists = false;
      let resourceAccountResources: Types.MoveResource[] = [];
      let moduleStatus = null;

      try {
        // Check if module exists
        moduleStatus = await client.getAccountModule(contractAddress, "bonding_curve");
        
        // Try to get resources at the calculated resource address
        try {
          resourceAccountResources = await client.getAccountResources(resourceAddress);
          resourceExists = true;
        } catch (error) {
          console.log("Resource account not found on chain:", error);
        }
      } catch (error) {
        console.log("Error checking module or resources:", error);
      }
      
      return NextResponse.json({
        success: true,
        contractAddress,
        resourceAddress,
        resourceExists,
        moduleExists: !!moduleStatus,
        resourceAccountResources: resourceAccountResources.map(r => r.type),
        message: "Successfully retrieved bonding curve resource address"
      });
    } catch (error) {
      console.error('Error getting resource address:', error);
      
      return NextResponse.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        message: "Could not get resource address from view function. Try initializing the contract first.",
        howToInitialize: {
          endpoint: "/api/bonding-curve/initialize",
          method: "POST",
          body: {
            tokenName: "Example Token",
            tokenSymbol: "EXT",
            basePrice: 1000000,
            priceIncrement: 100000,
            moduleAddress: contractAddress
          },
          curl: `curl -X POST http://localhost:3000/api/bonding-curve/initialize -H "Content-Type: application/json" -d '{"tokenName":"Example Token","tokenSymbol":"EXT","basePrice":1000000,"priceIncrement":100000,"moduleAddress":"${contractAddress}"}'`
        }
      }, { status: 404 });
    }
  } catch (error) {
    console.error('Error getting resource address:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 