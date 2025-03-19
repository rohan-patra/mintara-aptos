import { AptosClient, Types } from 'aptos';
import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint to debug a transaction and get detailed information about it
 * Useful for understanding why a transaction failed
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const txnHash = searchParams.get('txnHash');
    
    if (!txnHash) {
      return NextResponse.json(
        { success: false, error: 'Transaction hash is required' },
        { status: 400 }
      );
    }
    
    // Initialize the Aptos client
    const client = new AptosClient('https://fullnode.devnet.aptoslabs.com/v1');
    
    // Get transaction details
    const txnInfo = await client.getTransactionByHash(txnHash) as any;
    
    // Get the contract address if available in the transaction payload
    let contractAddress = null;
    if (txnInfo.payload && 
        txnInfo.payload.type === 'entry_function_payload' && 
        txnInfo.payload.function) {
      const parts = txnInfo.payload.function.split('::');
      if (parts.length > 0) {
        contractAddress = parts[0];
      }
    }
    
    // Check if it's a bonding curve initialization
    let isInitialization = false;
    if (txnInfo.payload && 
        txnInfo.payload.type === 'entry_function_payload' && 
        txnInfo.payload.function && 
        txnInfo.payload.function.includes('::bonding_curve::initialize')) {
      isInitialization = true;
    }
    
    // Get additional information for initialization transactions
    let resourceAccountInfo = null;
    if (isInitialization && contractAddress) {
      try {
        // Try to get the resource address
        const viewRequest: Types.ViewRequest = {
          function: `${contractAddress}::bonding_curve::get_resource_address_view`,
          type_arguments: [],
          arguments: []
        };
        
        const response = await client.view(viewRequest);
        if (response && response.length > 0) {
          const resourceAddress = response[0] as string;
          
          // Check if the resource address exists on chain
          let resourceExists = false;
          try {
            const resources = await client.getAccountResources(resourceAddress);
            resourceExists = true;
            
            // Filter for specific resource types
            const resourceTypes = resources.map(r => r.type);
            
            // Look for the CurveInfo and BondingCurveCapabilities resources
            const curveInfo = resources.find(r => r.type.includes('::bonding_curve::CurveInfo'));
            const capabilities = resources.find(r => r.type.includes('::bonding_curve::BondingCurveCapabilities'));
            
            resourceAccountInfo = {
              address: resourceAddress,
              exists: true,
              resourceTypes,
              hasCurveInfo: !!curveInfo,
              hasCapabilities: !!capabilities,
              curveInfoData: curveInfo?.data,
              capabilitiesData: capabilities?.data
            };
          } catch (error) {
            resourceAccountInfo = {
              address: resourceAddress,
              exists: false,
              error: 'Resource account not found on chain'
            };
          }
        }
      } catch (error) {
        resourceAccountInfo = {
          error: `Error getting resource address: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    }
    
    // If it's an initialization, check if the resource account might already exist
    if (isInitialization && contractAddress) {
      try {
        // Try using the account module to recover a resource account address
        const seed = "mintara_bonding_curve"; // This should match the seed in your contract
        
        // Try to calculate what the resource address should be
        try {
          const resourceAddrRequest: Types.ViewRequest = {
            function: "0x1::account::create_resource_address",
            type_arguments: [],
            arguments: [contractAddress, Array.from(Buffer.from(seed))]
          };
          
          const derivedResponse = await client.view(resourceAddrRequest);
          const derivedAddress = derivedResponse[0] as string;
          
          // Now calculate what the resource address would be if using the original @mintara address
          const mintaraResourceRequest: Types.ViewRequest = {
            function: "0x1::account::create_resource_address",
            type_arguments: [],
            arguments: ["0xmintara", Array.from(Buffer.from(seed))]
          };
          
          let mintaraDerivedAddress = null;
          try {
            const mintaraResponse = await client.view(mintaraResourceRequest);
            mintaraDerivedAddress = mintaraResponse[0] as string;
          } catch (error) {
            console.error("Error calculating @mintara resource address:", error);
          }
          
          // Try to get resources at the derived address to see if anything exists there
          let derivedResourcesExist = false;
          let derivedResources: string[] = [];
          try {
            const resources = await client.getAccountResources(derivedAddress);
            derivedResourcesExist = resources.length > 0;
            derivedResources = resources.map(r => r.type);
          } catch (error) {
            console.log("No resources at derived address:", error);
          }
          
          // Return this debugging info to help understand what's happening
          return NextResponse.json({
            success: true,
            txnHash,
            txnInfo,
            contractAddress,
            isInitialization,
            resourceSeed: seed,
            derivedResourceAddress: derivedAddress,
            derivedResourcesExist,
            derivedResources,
            mintaraDerivedAddress,
            resourceAccountInfo,
            message: `Successfully retrieved debug information for transaction ${txnHash}`
          });
        } catch (error) {
          console.error("Error calling create_resource_address view function:", error);
        }
      } catch (error) {
        console.error("Error checking resource account:", error);
      }
    }
    
    return NextResponse.json({
      success: true,
      txnHash,
      txnInfo,
      contractAddress,
      isInitialization,
      resourceAccountInfo,
      message: `Successfully retrieved debug information for transaction ${txnHash}`
    });
  } catch (error) {
    console.error('Error debugging transaction:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { 
      moduleAddress: string
    };
    
    const { moduleAddress } = body;
    
    if (!moduleAddress) {
      return NextResponse.json(
        { success: false, error: 'Module address is required' },
        { status: 400 }
      );
    }
    
    // Initialize the Aptos client
    const client = new AptosClient('https://fullnode.devnet.aptoslabs.com/v1');
    
    // Try to derive the resource address used by the contract
    const seed = "mintara_bonding_curve"; // This should match the seed in your contract
    
    // Try to calculate what the resource address should be
    try {
      // There might be a better way to calculate this without using the view function
      // For now, let's print out the info we have and instruct the user to get the resource address
      // from initializing the bonding curve
      
      // Try to see if the contract is deployed
      let moduleExists = false;
      try {
        await client.getAccountModule(moduleAddress, "bonding_curve");
        moduleExists = true;
      } catch (error) {
        console.error("Module not found:", error);
      }
      
      return NextResponse.json({
        success: true,
        moduleAddress,
        moduleExists,
        howToGetResourceAddress: {
          step1: "Initialize the bonding curve using the initialize endpoint",
          step2: "The response will contain the resource address",
          step3: "Use this resource address for all subsequent API calls",
          sampleInitialize: `curl -X POST http://localhost:3000/api/bonding-curve/initialize -H "Content-Type: application/json" -d '{"tokenName":"Test Token","tokenSymbol":"TST","basePrice":1000000,"priceIncrement":100000,"moduleAddress":"${moduleAddress}"}'`,
          note: "The resource address is generated during initialization"
        },
        howToUse: {
          buyFunction: `${moduleAddress}::bonding_curve::buy_tokens_direct`,
          sellFunction: `${moduleAddress}::bonding_curve::sell_tokens_direct`,
          totalSupplyFunction: `${moduleAddress}::bonding_curve::get_total_supply_direct`,
          buyArguments: ["amount", "resource_address"],
          sellArguments: ["amount", "resource_address"],
          totalSupplyArguments: ["resource_address"],
          tip: "Pass the 'resourceAddress' parameter to the API endpoints to bypass the hardcoded @mintara address"
        }
      });
    } catch (error) {
      return NextResponse.json({
        success: false,
        moduleAddress,
        error: `Error calculating resource address: ${error instanceof Error ? error.message : 'Unknown error'}`
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in debug POST:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 