import { AptosClient, AptosAccount, HexString, type Types } from "aptos";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

interface TransactionInfo {
  success?: boolean;
  vm_status?: string;
  gas_used?: string;
}

/**
 * API endpoint to sell tokens back to the bonding curve
 * This requires a POST request with a JSON body containing the amount to sell
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = (await request.json()) as {
      amount: number;
      moduleAddress?: string;
      resourceAddress?: string;
    };

    const {
      amount,
      moduleAddress,
      resourceAddress: requestedResourceAddress,
    } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Amount must be a positive number" },
        { status: 400 },
      );
    }

    // Initialize the Aptos client (using devnet for this example)
    const client = new AptosClient("https://fullnode.devnet.aptoslabs.com/v1");

    // Get the bonding curve contract address from request, env or use a default
    const contractAddress =
      moduleAddress ??
      process.env.BONDING_CURVE_ADDRESS ??
      "0xf15a9be44d5a140c69702d2bce3260aeb176bf878ef59bc19703b20a31bcd4c2";

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
    console.log("Contract address:", contractAddress);

    // Check if the module exists
    try {
      await client.getAccountModule(contractAddress, "bonding_curve");
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: "Bonding curve module not found at the specified address.",
          contractAddress,
        },
        { status: 404 },
      );
    }

    // If resourceAddress was provided directly in the request, use it
    let resourceAddress = requestedResourceAddress;

    // Only try to get resource address from contract if not explicitly provided
    if (!resourceAddress) {
      try {
        const resourceAddrRequest: Types.ViewRequest = {
          function: `${contractAddress}::bonding_curve::get_resource_address_view`,
          type_arguments: [],
          arguments: [],
        };
        const resourceAddrResponse = await client.view(resourceAddrRequest);
        resourceAddress = resourceAddrResponse[0] as string;

        console.log("Resource account address from contract:", resourceAddress);
      } catch (error) {
        console.log("Error getting resource address from contract:", error);
      }
    } else {
      console.log("Using provided resource address:", resourceAddress);
    }

    if (!resourceAddress) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Could not determine resource address. Please provide it explicitly.",
          contractAddress,
        },
        { status: 400 },
      );
    }

    // Check token balance before selling
    try {
      const tokenBalanceRequest: Types.ViewRequest = {
        function: `${contractAddress}::bonding_curve::get_token_balance_direct`,
        type_arguments: [],
        arguments: [accountAddress, resourceAddress],
      };

      const tokenBalanceResponse = await client.view(tokenBalanceRequest);
      const tokenBalance = parseInt(tokenBalanceResponse[0] as string, 10);

      console.log("Token balance:", tokenBalance);

      if (tokenBalance < amount) {
        return NextResponse.json(
          {
            success: false,
            error: `Not enough tokens to sell. You have ${tokenBalance} tokens.`,
            contractAddress,
            resourceAddress,
            balance: tokenBalance,
            requested: amount,
          },
          { status: 400 },
        );
      }
    } catch (error) {
      console.warn("Error checking token balance:", error);
      // Continue anyway, the transaction will fail if not enough tokens
    }

    // Use the direct function call with explicit resource address
    const payload = {
      function: `${contractAddress}::bonding_curve::sell_tokens_direct`,
      type_arguments: [],
      arguments: [amount.toString(), resourceAddress],
    };

    console.log(
      "Trying direct function call with resource address:",
      JSON.stringify(payload),
    );

    // Build and submit the transaction
    const rawTxn = await client.generateTransaction(account.address(), payload);
    console.log("Raw transaction generated");

    const signedTxn = await client.signTransaction(account, rawTxn);
    console.log("Transaction signed");

    const txnResult = await client.submitTransaction(signedTxn);
    console.log("Transaction submitted with hash:", txnResult.hash);

    // Add a small delay before checking the transaction
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Check transaction status with retry
    let txnInfo: TransactionInfo | null = null;
    let retries = 0;
    const maxRetries = 5;

    while (retries < maxRetries) {
      try {
        console.log(
          `Checking transaction status (attempt ${retries + 1}/${maxRetries})...`,
        );
        txnInfo = (await client.getTransactionByHash(
          txnResult.hash,
        )) as TransactionInfo;
        console.log(
          "Transaction status:",
          txnInfo?.success ? "Success" : "Failed",
        );
        break;
      } catch (error) {
        console.log(
          `Error checking transaction (attempt ${retries + 1}/${maxRetries}):`,
          error,
        );
        retries++;

        if (retries < maxRetries) {
          // Wait longer between retries
          await new Promise((resolve) => setTimeout(resolve, 2000 * retries));
        }
      }
    }

    // If we got transaction info, check if it was successful
    if (txnInfo && !txnInfo.success) {
      console.error("Transaction failed with VM status:", txnInfo.vm_status);

      return NextResponse.json(
        {
          success: false,
          transactionHash: txnResult.hash,
          error: txnInfo.vm_status ?? "Transaction failed",
          amount,
          txnInfo,
          resourceAddress,
          message: `Sell transaction for ${amount} tokens failed`,
          details: `VM Error: ${txnInfo.vm_status}`,
        },
        { status: 400 },
      );
    }

    try {
      return NextResponse.json({
        success: true,
        transactionHash: txnResult.hash,
        txnInfo: txnInfo
          ? {
              vmStatus: txnInfo.vm_status ?? "",
              gasUsed: txnInfo.gas_used ?? 0,
            }
          : { message: "Transaction submitted, check explorer for status" },
        amount,
        message: `Sell transaction for ${amount} tokens submitted successfully`,
        explorer: `https://explorer.aptoslabs.com/txn/${txnResult.hash}?network=devnet`,
      });
    } catch (error) {
      console.error("Error processing transaction response:", error);

      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          transactionHash: txnResult.hash,
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Error in sell tokens endpoint:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
