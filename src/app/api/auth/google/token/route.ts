// src/app/api/auth/google/token/route.ts
// Proxies OAuth token exchange to Google's token endpoint,
// adding client_secret server-side so it's never exposed to the client.
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const params = new URLSearchParams(body);

  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET;
  if (clientSecret) {
    params.set("client_secret", clientSecret);
  }

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  return new NextResponse(await resp.text(), {
    status: resp.status,
    headers: { "Content-Type": "application/json" },
  });
}
