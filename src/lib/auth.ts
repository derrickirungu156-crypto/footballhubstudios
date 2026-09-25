import { SignJWT, jwtVerify } from "jose";
import { scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

// PHASE 2 NOTE: this is intentionally minimal — one admin account, credentials
// from environment variables, a signed session cookie. It satisfies §63
// ("only authorized administrators can access the dashboard") without pulling
// in a full auth provider yet. Swap this module for NextAuth/Clerk/etc. later
// without touching call sites — everything else calls requireAdmin().

const COOKIE_NAME = "studio_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set — refusing to issue or verify sessions.");
  }
  return new TextEncoder().encode(secret);
}

/**
 * Generate a value for ADMIN_PASSWORD_HASH: node -e "console.log(require('./src/lib/auth').hashPassword('yourpassword'))"
 * Format: scrypt$<saltHex>$<hashHex>
 */
export function hashPassword(password: string): string {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Buffer.from(salt).toString("hex");
  const hash = scryptSync(password, saltHex, 64).toString("hex");
  return `scrypt$${saltHex}$${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const candidate = scryptSync(password, saltHex, 64);
  const expected = Buffer.from(hashHex, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export function verifyCredentials(email: string, password: string): boolean {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminHash = process.env.ADMIN_PASSWORD_HASH;
  if (!adminEmail || !adminHash) return false;
  if (email.trim().toLowerCase() !== adminEmail.trim().toLowerCase()) return false;
  return verifyPassword(password, adminHash);
}

export async function createSession(email: string) {
  const token = await new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());

  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE_NAME);
}

export async function getSession(): Promise<{ email: string } | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return { email: payload.email as string };
  } catch {
    return null;
  }
}
