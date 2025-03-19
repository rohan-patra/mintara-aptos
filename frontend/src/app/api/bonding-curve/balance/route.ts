import { AptosClient } from 'aptos';
import type { Types } from 'aptos';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * API endpoint to check the token balance for a given address
 * This requires a GET request with the address as a query parameter
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');
    const moduleAddress = searchParams.get('moduleAddress');
    
    if (!address) {
      return NextResponse.json(
        { success: false, error: 'Address parameter is required' },
        { status: 400 }
      );
    }
    
    // Initialize the Aptos client
    const client = new AptosClient('https://fullnode.devnet.aptoslabs.com/v1');
    
    // Get the bonding curve contract address from query params, env or use a default
    const contractAddress = moduleAddress ?? process.env.BONDING_CURVE_ADDRESS ?? 
      '0xf15a9be44d5a140c69702d2bce3260aeb176bf878ef59bc19703b20a31bcd4c2';
    
    // Check if the module exists
    try {
      await client.getAccountModule(contractAddress, "bonding_curve");
    } catch (_moduleError) {
      return NextResponse.json({
        success: false,
        error: "Bonding curve module not found at the specified address.",
        contractAddress
      }, { status: 404 });
    }
    
    // Get token information from resources directly
    let metadataObj = null;
    
    try {
      // Try to get resources that contain token information
      const resources = await client.getAccountResources(contractAddress);
      
      // Look for the BondingCurveCapabilities resource to find the metadata
      const capabilitiesResource = resources.find(r => 
        r.type === `${contractAddress}::bonding_curve::BondingCurveCapabilities`
      );
      
      if (capabilitiesResource?.data) {
        const data = capabilitiesResource.data as Record<string, unknown>;
        if (data.metadata) {
          metadataObj = data.metadata;
        }
      }
      
      if (!metadataObj) {
        return NextResponse.json({
          success: false,
          error: "Could not find token metadata. The bonding curve may not be initialized.",
          contractAddress
        }, { status: 400 });
      }

      // Check balance of the requested address
      const tokenBalance = 0;
      let aptBalance = 0;
      
      try {
        // Get APT balance
        try {
          const aptBalancePayload: Types.ViewRequest = {
            function: `0x1::coin::balance`,
            type_arguments: ["0x1::aptos_coin::AptosCoin"],
            arguments: [address]
          };
          
          const aptBalanceResponse = await client.view(aptBalancePayload);
          aptBalance = parseInt(aptBalanceResponse[0] as string, 10);
        } catch (error) {
          console.warn('Error getting APT balance:', error);
        }
        
        // Try to find token balance in user's resources
        try {
          const _userResources = await client.getAccountResources(address);
          
          // TODO: This is a simplification. For fungible assets, 
          // we should properly check for primary_fungible_store resources
          // that correspond to our token metadata
          
          // For now, just return what we have
          return NextResponse.json({
            success: true,
            address,
            aptBalance,
            tokenMetadata: metadataObj,
            note: "Please check the token balance manually for now. The API needs to be updated to correctly check fungible asset balances."
          });
        } catch (error) {
          console.warn('Error getting user resources:', error);
          return NextResponse.json({
            success: true,
            address,
            tokenBalance,
            aptBalance,
            tokenMetadata: metadataObj,
            message: "Account might not have any resources yet"
          });
        }
      } catch (error) {
        // Return what we have with a warning
        return NextResponse.json({
          success: true,
          address,
          tokenBalance,
          aptBalance,
          tokenMetadata: metadataObj,
          warning: "Error when trying to check token balance",
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    } catch (error) {
      console.error('Error checking contract resources:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error',
          message: "Failed to fetch contract resources"
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error checking token balance:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 