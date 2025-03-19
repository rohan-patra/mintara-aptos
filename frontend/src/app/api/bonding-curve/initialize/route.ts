import {
  AptosClient,
  AptosAccount,
  HexString,
  type Types,
  type TxnBuilderTypes,
} from "aptos";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

interface TransactionInfo {
  success?: boolean;
  vm_status?: string;
  gas_used?: string;
  [key: string]: unknown;
}

/**
 * API endpoint to initialize the bonding curve with a new token
 * This creates a new token with the specified parameters and sets up the bonding curve
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = (await request.json()) as {
      tokenName: string;
      tokenSymbol: string;
      basePrice?: string | number;
      priceIncrement?: string | number;
      moduleAddress?: string;
    };

    const {
      tokenName,
      tokenSymbol,
      basePrice: rawBasePrice,
      priceIncrement: rawPriceIncrement,
      moduleAddress,
    } = body;

    if (!tokenName || !tokenSymbol) {
      return NextResponse.json(
        { success: false, error: "Token name and symbol are required" },
        { status: 400 },
      );
    }

    // Parse the price parameters as numbers
    const basePrice =
      typeof rawBasePrice === "string"
        ? parseInt(rawBasePrice, 10)
        : typeof rawBasePrice === "number"
          ? rawBasePrice
          : 1000000; // Default to 0.01 APT

    const priceIncrement =
      typeof rawPriceIncrement === "string"
        ? parseInt(rawPriceIncrement, 10)
        : typeof rawPriceIncrement === "number"
          ? rawPriceIncrement
          : 100000; // Default to 0.001 APT

    // Initialize the Aptos client (using devnet for this example)
    const client = new AptosClient("https://fullnode.devnet.aptoslabs.com/v1");

    // Get the bonding curve contract address from query params, env or use a default
    const contractAddress =
      moduleAddress ??
      process.env.BONDING_CURVE_ADDRESS ??
      "0xf15a9be44d5a140c69702d2bce3260aeb176bf878ef59bc19703b20a31bcd4c2";

    console.log("Contract address:", contractAddress);

    // Private key for the account that will sign the transaction
    const privateKeyHex = process.env.APTOS_PRIVATE_KEY;

    if (!privateKeyHex) {
      return NextResponse.json(
        { success: false, error: "Private key not configured" },
        { status: 500 },
      );
    }

    // Create an account from the private key
    const privateKey = new HexString(privateKeyHex).toUint8Array();
    const account = new AptosAccount(privateKey);
    const accountAddress = account.address().hex();

    console.log("Account address:", accountAddress);

    // Check if the module exists
    try {
      await client.getAccountModule(contractAddress, "bonding_curve");
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bonding curve module not found at the specified address. Please deploy the contract first.",
          deploymentInstructions: {
            step1:
              "Compile the Move contract: aptos move compile --named-addresses mintara=<your_address>",
            step2:
              "Deploy the Move contract: aptos move publish --named-addresses mintara=<your_address>",
            notes: "Replace <your_address> with your actual account address",
          },
        },
        { status: 404 },
      );
    }

    // Get information about the module if needed
    try {
      const moduleInfo = await client.getAccountModule(
        contractAddress,
        "bonding_curve",
      );
      // You can use this to check if the module is properly deployed
    } catch {
      // Module not found, but we already checked above
    }

    // Payload for the initialization
    // Note: The exact function signature might vary based on your contract
    const payload = {
      function: `${contractAddress}::bonding_curve::initialize`,
      type_arguments: [],
      arguments: [
        tokenName,
        tokenSymbol,
        basePrice.toString(),
        priceIncrement.toString(),
      ],
    };

    console.log(
      "Initializing bonding curve with payload:",
      JSON.stringify(payload),
    );

    // Build and submit the transaction
    const rawTxn = await client.generateTransaction(account.address(), payload);
    console.log("Raw transaction generated");

    const signedTxn = await client.signTransaction(account, rawTxn);
    console.log("Transaction signed");

    const txnResult = await client.submitTransaction(signedTxn);
    console.log("Transaction submitted with hash:", txnResult.hash);

    // Wait for transaction to be processed
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Check transaction status
    try {
      const txnInfo = (await client.getTransactionByHash(
        txnResult.hash,
      )) as TransactionInfo;
      const isSuccess =
        txnInfo && typeof txnInfo.success === "boolean"
          ? txnInfo.success
          : false;

      console.log("Transaction status:", isSuccess ? "Success" : "Failed");

      if (!isSuccess) {
        console.error("Transaction failed:", txnInfo.vm_status);

        return NextResponse.json(
          {
            success: false,
            transactionHash: txnResult.hash,
            error: txnInfo.vm_status,
            message:
              "Initialization failed. The bonding curve might already be initialized.",
            explorer: `https://explorer.aptoslabs.com/txn/${txnResult.hash}?network=devnet`,
          },
          { status: 400 },
        );
      }

      // Try to get the resource address
      try {
        const viewRequest: Types.ViewRequest = {
          function: `${contractAddress}::bonding_curve::get_resource_address_view`,
          type_arguments: [],
          arguments: [],
        };

        const response = await client.view(viewRequest);
        if (response && response.length > 0) {
          const resourceAddress = response[0] as string;

          return NextResponse.json({
            success: true,
            transactionHash: txnResult.hash,
            contractAddress,
            resourceAddress,
            tokenName,
            tokenSymbol,
            basePrice,
            priceIncrement,
            message: "Bonding curve initialized successfully",
            explorer: `https://explorer.aptoslabs.com/txn/${txnResult.hash}?network=devnet`,
          });
        }
      } catch (error) {
        console.warn("Could not get resource address:", error);
      }

      return NextResponse.json({
        success: true,
        transactionHash: txnResult.hash,
        contractAddress,
        tokenName,
        tokenSymbol,
        basePrice,
        priceIncrement,
        message:
          "Bonding curve initialized successfully (resource address unknown)",
        explorer: `https://explorer.aptoslabs.com/txn/${txnResult.hash}?network=devnet`,
      });
    } catch (error) {
      console.error("Error checking transaction:", error);

      return NextResponse.json(
        {
          success: false,
          transactionHash: txnResult.hash,
          error: error instanceof Error ? error.message : "Unknown error",
          message: "Error while checking transaction status",
          explorer: `https://explorer.aptoslabs.com/txn/${txnResult.hash}?network=devnet`,
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Error initializing bonding curve:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
