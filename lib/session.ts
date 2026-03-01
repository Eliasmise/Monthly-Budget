import { APP_SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/constants";
import type { SessionPayload } from "@/lib/types";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64(bytes: Uint8Array) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(base64: string) {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(base64, "base64"));
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function toBase64Url(input: string | Uint8Array) {
  const bytes = typeof input === "string" ? encoder.encode(input) : input;
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(input: string) {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return base64ToBytes(padded);
}

async function sign(input: string, secret: string) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(input));
  return toBase64Url(new Uint8Array(signature));
}

async function verify(input: string, secret: string, signature: string) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  return crypto.subtle.verify("HMAC", cryptoKey, fromBase64Url(signature), encoder.encode(input));
}

export async function createSessionToken(
  user: Pick<SessionPayload, "userId" | "username" | "role">,
  secret: string
) {
  const payload: SessionPayload = {
    ...user,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS
  };

  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = await sign(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

export async function verifySessionToken(token: string, secret: string): Promise<SessionPayload | null> {
  if (!token || !token.includes(".")) return null;
  const [encodedPayload, providedSignature] = token.split(".");
  if (!encodedPayload || !providedSignature) return null;

  const isValid = await verify(encodedPayload, secret, providedSignature);
  if (!isValid) return null;

  try {
    const payload = JSON.parse(decoder.decode(fromBase64Url(encodedPayload))) as SessionPayload;
    if (!payload.userId || !payload.username || !payload.role || !payload.exp) {
      return null;
    }
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function getSessionCookieConfig() {
  return {
    name: APP_SESSION_COOKIE,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS
    }
  };
}
