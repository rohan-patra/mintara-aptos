import { AptosClient, type Types } from "aptos";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * API endpoint to get the resource account address for the bonding curve
 * This is the address that holds the token
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const moduleAddress = searchParams.get("moduleAddress");

    // Initialize the Aptos client (using devnet for this example)
    const client = new AptosClient("https://fullnode.devnet.aptoslabs.com/v1");

    // Get the bonding curve contract address from query params, env or use a default
    const contractAddress =
      moduleAddress ??
      process.env.BONDING_CURVE_ADDRESS ??
      "0xf15a9be44d5a140c69702d2bce3260aeb176bf878ef59bc19703b20a31bcd4c2";

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

    // Try to get the resource address from the view function
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
          contractAddress,
          resourceAddress,
          message: "Successfully retrieved resource address",
        });
      } else {
        return NextResponse.json(
          {
            success: false,
            contractAddress,
            error:
              "Resource address not found. The bonding curve may not be initialized yet.",
          },
          { status: 404 },
        );
      }
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          contractAddress,
          error:
            "Error getting resource address. The bonding curve may not be initialized properly.",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Error getting resource address:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
