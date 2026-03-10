import { NextRequest, NextResponse } from "next/server";

const LINEAR_API = "https://api.linear.app/graphql";

/**
 * POST /api/feedback/upload
 * Accepts a FormData body with a single "file" field (image).
 * 1. Asks Linear for a signed S3 upload URL via the fileUpload mutation.
 * 2. PUTs the file binary to S3.
 * 3. Returns { ok: true, assetUrl } — embed this URL in the issue description.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ ok: false }, { status: 400 });

    // Step 1 — get signed upload URL from Linear
    const uploadRes = await fetch(LINEAR_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: process.env.LINEAR_API_KEY!,
      },
      body: JSON.stringify({
        query: `
          mutation FileUpload($filename: String!, $contentType: String!, $size: Int!) {
            fileUpload(filename: $filename, contentType: $contentType, size: $size) {
              success
              uploadFile {
                uploadUrl
                assetUrl
                headers { key value }
              }
            }
          }
        `,
        variables: {
          filename: file.name,
          contentType: file.type,
          size: file.size,
        },
      }),
    });

    const uploadJson = await uploadRes.json();
    const uploadFile = uploadJson.data?.fileUpload?.uploadFile;
    if (!uploadFile) throw new Error("Linear fileUpload mutation failed");

    // Step 2 — PUT file binary to the signed S3 URL
    const fileBuffer = await file.arrayBuffer();
    const s3Headers: Record<string, string> = { "Content-Type": file.type };
    for (const h of uploadFile.headers ?? []) {
      s3Headers[h.key] = h.value;
    }

    await fetch(uploadFile.uploadUrl, {
      method: "PUT",
      headers: s3Headers,
      body: fileBuffer,
    });

    return NextResponse.json({ ok: true, assetUrl: uploadFile.assetUrl });
  } catch (err) {
    console.error("[feedback/upload]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
