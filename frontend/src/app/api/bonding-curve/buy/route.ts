import { AptosClient, AptosAccount, HexString, type Types } from "aptos";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

interface TransactionInfo {
  success?: boolean;
  vm_status?: string;
  gas_used?: string;
}

/**
 * API endpoint to buy tokens from the bonding curve
 * This requires a POST request with a JSON body containing the amount to purchase
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
    console.log(
      "Replacing original @mintara address with contract address in the module",
    );

    // Check APT balance before attempting purchase
    try {
      const aptBalancePayload: Types.ViewRequest = {
        function: `0x1::coin::balance`,
        type_arguments: ["0x1::aptos_coin::AptosCoin"],
        arguments: [accountAddress],
      };

      const aptBalanceResponse = await client.view(aptBalancePayload);
      const aptBalance = parseInt(aptBalanceResponse[0] as string, 10);
      console.log(
        "APT balance:",
        aptBalance,
        `(${aptBalance / 100000000} APT)`,
      );
    } catch (error) {
      console.log("Error checking APT balance:", error);
    }

    // Check if the module exists
    try {
      await client.getAccountModule(contractAddress, "bonding_curve");
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bonding curve module not found at the specified address. Please deploy the contract first and initialize it.",
          deploymentInstructions: {
            step1:
              "Compile the Move contract: aptos move compile --named-addresses mintara=<your_address>",
            step2:
              "Deploy the Move contract as an object: aptos move deploy-object --address-name mintara",
            step3:
              "After deployment, initialize the bonding curve using the initialize endpoint",
            notes: "Replace <your_address> with your actual account address",
          },
        },
        { status: 404 },
      );
    }

    // If resourceAddress was provided directly in the request, use it instead of deriving it
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

    // Check if the resource account exists and has the necessary resources
    try {
      const resources = await client.getAccountResources(resourceAddress);
      console.log("Resource account has", resources.length, "resources");

      // Look for specific resources
      const curveInfoResource = resources.find(
        (r) =>
          r.type.includes("::bonding_curve::CurveInfo") ||
          r.type.endsWith("::CurveInfo"),
      );

      const capsResource = resources.find(
        (r) =>
          r.type.includes("::bonding_curve::BondingCurveCapabilities") ||
          r.type.endsWith("::BondingCurveCapabilities"),
      );

      if (!curveInfoResource) {
        console.warn("⚠️ CurveInfo resource NOT found at resource address");
      } else {
        console.log("✅ CurveInfo resource found!");
      }

      if (!capsResource) {
        console.warn("⚠️ BondingCurveCapabilities resource NOT found");
      } else {
        console.log("✅ BondingCurveCapabilities resource found!");
      }
    } catch (error) {
      console.error("Error checking resource account resources:", error);
    }

    // Using the new direct function call payload with explicit resource address
    const payload = {
      function: `${contractAddress}::bonding_curve::buy_tokens_direct`,
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

    // Add a small delay before checking
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
          message: `Purchase transaction for ${amount} tokens failed`,
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
        message: `Purchase transaction for ${amount} tokens submitted successfully`,
        explorer: `https://explorer.aptoslabs.com/txn/${txnResult.hash}?network=devnet`,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Error details:", errorMessage);

      if (errorMessage.includes("bonding_curve::initialize")) {
        return NextResponse.json(
          {
            success: false,
            error:
              "The bonding curve has not been initialized yet. Please initialize it first.",
            moduleExists: true,
            contractAddress,
          },
          { status: 400 },
        );
      }

      if (errorMessage.includes("INVALID_ARGUMENT_ERROR")) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Invalid arguments to buy_tokens function. Check the contract signature.",
            contractAddress,
            resourceAddress,
            details: errorMessage,
            correctSignature: "buy_tokens(buyer: &signer, amount: u64)",
            note: "The 'buyer' parameter is implicit (transaction signer)",
          },
          { status: 400 },
        );
      }

      if (errorMessage.includes("E_NOT_INITIALIZED")) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Contract resources not initialized properly. Please provide the correct resource address or reinitialize the bonding curve.",
            contractAddress,
            resourceAddress,
            details: errorMessage,
          },
          { status: 400 },
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          contractAddress,
          resourceAddress,
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Error in buy tokens endpoint:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
