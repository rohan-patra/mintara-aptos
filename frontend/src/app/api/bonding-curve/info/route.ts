import { AptosClient, HexString, Types, AptosAccount } from 'aptos';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * API endpoint to get information about the bonding curve token
 * Returns total supply, metadata, and current pricing information
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const moduleAddress = searchParams.get('moduleAddress');
    const requestedResourceAddress = searchParams.get('resourceAddress');
    
    // Initialize the Aptos client (using devnet for this example)
    const client = new AptosClient('https://fullnode.devnet.aptoslabs.com/v1');
    
    // Get the bonding curve contract address from query params, env or use a default
    const contractAddress = moduleAddress || process.env.BONDING_CURVE_ADDRESS || 
      '0xf15a9be44d5a140c69702d2bce3260aeb176bf878ef59bc19703b20a31bcd4c2';
    
    // Check if the module exists
    try {
      await client.getAccountModule(contractAddress, "bonding_curve");
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: "Bonding curve module not found at the specified address.",
        contractAddress
      }, { status: 404 });
    }
    
    // Get the resource account address that holds the token
    let resourceAddress = requestedResourceAddress;
    
    // Only try to get the resource address from the contract if not provided
    if (!resourceAddress) {
      try {
        // Try to get the resource address from the view function
        try {
          const viewRequest: Types.ViewRequest = {
            function: `${contractAddress}::bonding_curve::get_resource_address_view`,
            type_arguments: [],
            arguments: []
          };
          const response = await client.view(viewRequest);
          if (response && response.length > 0) {
            resourceAddress = response[0] as string;
            console.log("Resource account address from view function:", resourceAddress);
          }
        } catch (error) {
          console.log("Could not get resource address from view function:", error);
          // Try to derive it from module source?
        }
      } catch (error) {
        console.error("Error getting resource address:", error);
      }
    } else {
      console.log("Using provided resource address:", resourceAddress);
    }
    
    // The private key for the account that will be used for view transactions
    const privateKeyHex = process.env.APTOS_PRIVATE_KEY;
    if (!privateKeyHex) {
      return NextResponse.json(
        { success: false, error: 'Private key not configured for query transactions' },
        { status: 500 }
      );
    }
    
    const privateKey = new HexString(privateKeyHex).toUint8Array();
    const account = new AptosAccount(privateKey);
    
    // Try to get the total supply using the view function
    let totalSupply = 0;
    try {
      // Only try to get total supply if we have a resource address
      if (resourceAddress) {
        const viewRequest: Types.ViewRequest = {
          function: `${contractAddress}::bonding_curve::get_total_supply_direct`,
          type_arguments: [],
          arguments: [resourceAddress]
        };
        const response = await client.view(viewRequest);
        if (response && response.length > 0) {
          totalSupply = parseInt(response[0] as string, 10);
          console.log("Total supply from view function:", totalSupply);
        }
      } else {
        // Try original function as fallback
        const viewRequest: Types.ViewRequest = {
          function: `${contractAddress}::bonding_curve::get_total_supply`,
          type_arguments: [],
          arguments: []
        };
        const response = await client.view(viewRequest);
        if (response && response.length > 0) {
          totalSupply = parseInt(response[0] as string, 10);
          console.log("Total supply from original view function:", totalSupply);
        }
      }
    } catch (error) {
      console.log("Could not get total supply from view function:", error);
    }
    
    // Get metadata directly from resources
    let tokenName = "";
    let tokenSymbol = "";
    let basePrice = 0;
    let priceIncrement = 0;
    let metadataObj: any = "";
    let admin = "";
    
    try {
      // If we have a resource address, get resources from there
      const accountToQuery = resourceAddress || contractAddress;
      
      // Try to get resources that contain token information
      const resources = await client.getAccountResources(accountToQuery);
      
      // Look for the CurveInfo resource
      const curveInfoResource = resources.find(r => 
        r.type === `${contractAddress}::bonding_curve::CurveInfo` || 
        r.type.endsWith("::bonding_curve::CurveInfo")
      );
      
      // Look for the BondingCurveCapabilities resource
      const capabilitiesResource = resources.find(r => 
        r.type === `${contractAddress}::bonding_curve::BondingCurveCapabilities` ||
        r.type.endsWith("::bonding_curve::BondingCurveCapabilities")
      );
      
      if (curveInfoResource?.data) {
        const data = curveInfoResource.data as any;
        // Extract admin, base price and increment if available
        admin = data.admin || "";
        basePrice = parseInt(data.base_price || "0", 10);
        priceIncrement = parseInt(data.price_increment || "0", 10);
      }
      
      if (capabilitiesResource?.data) {
        const data = capabilitiesResource.data as any;
        if (data.metadata) {
          metadataObj = data.metadata;
          
          // Get token info from the metadata object if possible
          try {
            const metadataAddress = typeof metadataObj === 'object' && metadataObj.inner ? 
              metadataObj.inner : metadataObj;
            const metadataResource = await client.getAccountResource(
              metadataAddress, 
              `0x1::fungible_asset::Metadata`
            );
            
            if (metadataResource?.data) {
              const data = metadataResource.data as any;
              tokenName = data.name || "";
              tokenSymbol = data.symbol || "";
            }
          } catch (error) {
            console.warn("Could not fetch token metadata details");
          }
        }
      }
    } catch (error) {
      console.warn("Error fetching resources:", error);
    }
    
    return NextResponse.json({
      success: true,
      contractAddress,
      resourceAddress,
      totalSupply,
      metadata: metadataObj,
      tokenName,
      tokenSymbol,
      basePrice,
      priceIncrement,
      admin,
      message: "Successfully retrieved bonding curve info."
    });
  } catch (error) {
    console.error('Error getting bonding curve info:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 