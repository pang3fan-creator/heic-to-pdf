// src/app/api/auth/google/token/route.ts
// Proxies OAuth token exchange to Google's token endpoint,
// adding client_secret server-side so it's never exposed to the client.
import { NextRequest, NextResponse } from "next/server";
import { fetch as undiciFetch, ProxyAgent } from "undici";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const params = new URLSearchParams(body);

  const clientSecret =
    process.env.GOOGLE_CLIENT_SECRET ||
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET;
  if (clientSecret) {
    params.set("client_secret", clientSecret);
  }

  const proxyUrl =
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.ALL_PROXY ||
    process.env.all_proxy ||
    "";
  const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;

  let lastErr: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const resp = await undiciFetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params,
        signal: AbortSignal.timeout(10000),
        dispatcher,
      });
      return new NextResponse(await resp.text(), {
        status: resp.status,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      lastErr = err;
      if (attempt < 3) {
        console.warn(`[google/token] attempt ${attempt} failed, retrying...`);
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }
  console.error("[google/token] all 3 attempts failed:", lastErr);
  return NextResponse.json({ error: "token_exchange_failed" }, { status: 502 });
}
