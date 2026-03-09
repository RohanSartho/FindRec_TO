import { NextRequest, NextResponse } from "next/server";

// POST /api/admin/auth — validate passphrase, set admin_token cookie, redirect
export async function POST(req: NextRequest) {
  const body = await req.formData();
  const submitted = body.get("secret")?.toString() ?? "";
  const secret    = process.env.ADMIN_SECRET ?? "";

  if (!secret || submitted !== secret) {
    // Back to login with a fail indicator
    return NextResponse.redirect(
      new URL("/internal-ops-findrecto/login?error=1", req.url)
    );
  }

  const res = NextResponse.redirect(
    new URL("/internal-ops-findrecto", req.url)
  );

  // 8-hour httpOnly cookie
  res.cookies.set("admin_token", secret, {
    httpOnly:  true,
    secure:    process.env.NODE_ENV === "production",
    sameSite:  "strict",
    maxAge:    60 * 60 * 8,
    path:      "/",
  });

  return res;
}
