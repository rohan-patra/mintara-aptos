import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import lighthouse from "@lighthouse-web3/sdk";

interface LighthouseUploadResponse {
  data: {
    Hash: string;
    Name: string;
    Size: string;
  };
}

/**
 * API endpoint to upload text content to Lighthouse
 * POST /api/lighthouse/upload
 */
export async function POST(request: NextRequest) {
  try {
    // Get request body
    const body = (await request.json()) as { text?: string; name?: string };

    // Check if text is provided
    if (!body.text) {
      return NextResponse.json(
        { success: false, error: "Text content is required" },
        { status: 400 },
      );
    }

    // Get text content and optional name
    const { text, name } = body;

    // Get API key from environment variables
    const apiKey = process.env.LIGHTHOUSE_API_KEY;

    // Check if API key is available
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "Lighthouse API key not configured" },
        { status: 500 },
      );
    }

    // Upload text to Lighthouse
    const response = (await lighthouse.uploadText(
      text,
      apiKey,
      name ?? undefined, // Pass name if provided, otherwise undefined
    )) as LighthouseUploadResponse;

    // Return the response with CID
    return NextResponse.json({
      success: true,
      data: {
        cid: response.data.Hash,
        name: response.data.Name,
        size: response.data.Size,
      },
    });
  } catch (error) {
    console.error("Error uploading to Lighthouse:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    );
  }
}
