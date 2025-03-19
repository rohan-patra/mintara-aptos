import { AptosClient, AptosAccount, HexString, Types, TxnBuilderTypes } from 'aptos';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * API endpoint to initialize the bonding curve contract
 * This requires a POST request with a JSON body containing token name, symbol, base price, and price increment
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json() as { 
      tokenName: string;
      tokenSymbol: string;
      basePrice: number;
      priceIncrement: number;
      moduleAddress?: string;
    };
    
    const { tokenName, tokenSymbol, basePrice, priceIncrement, moduleAddress } = body;
    
    if (!tokenName || !tokenSymbol) {
      return NextResponse.json(
        { success: false, error: 'Token name and symbol are required' },
        { status: 400 }
      );
    }
    
    if (basePrice <= 0 || priceIncrement <= 0) {
      return NextResponse.json(
        { success: false, error: 'Base price and price increment must be positive numbers' },
        { status: 400 }
      );
    }
    
    // Initialize the Aptos client (using devnet for this example)
    const client = new AptosClient('https://fullnode.devnet.aptoslabs.com/v1');
    
    // Get the bonding curve contract address from request, env, or use a default
    const contractAddress = moduleAddress || process.env.BONDING_CURVE_MODULE_ADDRESS || 
      '0xf15a9be44d5a140c69702d2bce3260aeb176bf878ef59bc19703b20a31bcd4c2';
    
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
    
    // Check if the module exists
    try {
      await client.getAccountModule(contractAddress, "bonding_curve");
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: "Bonding curve module not found at the specified address. Please deploy the contract first.",
        deploymentInstructions: {
          step1: "Compile the Move contract: aptos move compile --named-addresses mintara=<your_address>",
          step2: "Deploy the Move contract as an object: aptos move deploy-object --address-name mintara",
          step3: "After deployment, use the contract address in your API calls",
          notes: "Replace <your_address> with your actual account address"
        }
      }, { status: 404 });
    }

    // Verify this account is the module deployer (mintara address) since initialize is restricted
    const accountAddr = account.address().hex();
    
    try {
      // Get the account module to check if it's the mintara address
      const moduleInfo = await client.getAccountModule(contractAddress, "bonding_curve");
      
      // This is a simple check - in production, verify address more rigorously
      console.log(`Account address: ${accountAddr}`);
      console.log(`Module address: ${contractAddress}`);
      
      // Let user know they may need proper permissions
      if (accountAddr !== contractAddress) {
        console.log("Warning: The initializing account may not be the module deployer.");
      }
    } catch (error) {
      console.error("Error checking module deployer:", error);
    }

    // Create a transaction payload to call the initialize function
    const payload = {
      function: `${contractAddress}::bonding_curve::initialize`,
      type_arguments: [],
      arguments: [
        tokenName,
        tokenSymbol,
        basePrice.toString(),
        priceIncrement.toString()
      ]
    };
    
    console.log("Initialize payload:", JSON.stringify(payload, null, 2));
    console.log("Using signer account:", account.address().hex());
    console.log("Target contract address:", contractAddress);
    
    // Build and submit the transaction
    const rawTxn = await client.generateTransaction(account.address(), payload);
    const signedTxn = await client.signTransaction(account, rawTxn);
    const txnResult = await client.submitTransaction(signedTxn);
    
    // Wait for the transaction to complete
    await client.waitForTransaction(txnResult.hash);
    
    // Attempt to get the resource account address
    let resourceAddress = null;
    try {
      try {
        const viewRequest: Types.ViewRequest = {
          function: `${contractAddress}::bonding_curve::get_resource_address_view`,
          type_arguments: [],
          arguments: []
        };
        const response = await client.view(viewRequest);
        if (response && response.length > 0) {
          resourceAddress = response[0] as string;
          console.log("Resource account address:", resourceAddress);
        }
      } catch (error) {
        console.log("Could not get resource address from view function");
      }
    } catch (error) {
      console.error("Error getting resource address:", error);
    }
    
    return NextResponse.json({
      success: true,
      transactionHash: txnResult.hash,
      tokenName,
      tokenSymbol,
      basePrice,
      priceIncrement,
      admin: accountAddr,
      resourceAddress,
      message: 'Bonding curve initialized successfully'
    });
  } catch (error) {
    console.error('Error initializing bonding curve:', error);
    
    // Check for common errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage.includes("E_UNAUTHORIZED")) {
      return NextResponse.json({
        success: false,
        error: "Unauthorized: Only the module owner (@mintara) can initialize the bonding curve",
        details: errorMessage
      }, { status: 403 });
    }
    
    if (errorMessage.includes("E_ALREADY_INITIALIZED")) {
      return NextResponse.json({
        success: false,
        error: "The bonding curve has already been initialized",
        details: errorMessage
      }, { status: 400 });
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage
      },
      { status: 500 }
    );
  }
} 