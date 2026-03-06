import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { headers } from "next/headers";
import { NextRequest } from "next/server";

export function constantTimeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}

function base64url(input: string | Buffer) {
  return Buffer.from(input).toString("base64url");
}

function fromBase64url(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function getCsrfSecret() {
  const secret = process.env.CSRF_SECRET;
  if (!secret) {
    throw new Error("Missing CSRF_SECRET");
  }
  return secret;
}

export function createSignedCsrfToken(ttlSeconds = 30 * 60) {
  const payload = JSON.stringify({
    nonce: randomUUID(),
    exp: Math.floor(Date.now() / 1000) + ttlSeconds
  });
  const payloadB64 = base64url(payload);
  const signature = createHmac("sha256", getCsrfSecret()).update(payloadB64).digest("base64url");
  return `${payloadB64}.${signature}`;
}

export function verifySignedCsrfToken(token: string) {
  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) {
    return false;
  }

  const expected = createHmac("sha256", getCsrfSecret()).update(payloadB64).digest("base64url");
  if (!constantTimeEqual(signature, expected)) {
    return false;
  }

  try {
    const parsed = JSON.parse(fromBase64url(payloadB64)) as { exp?: number };
    if (!parsed.exp || typeof parsed.exp !== "number") {
      return false;
    }
    return parsed.exp >= Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export async function requestOriginFromHeaders() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) {
    return null;
  }
  return `${proto}://${host}`;
}

export async function assertSameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  const currentOrigin = await requestOriginFromHeaders();

  if (!origin || !currentOrigin || origin !== currentOrigin) {
    return false;
  }

  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "same-site") {
    return false;
  }

  return true;
}
