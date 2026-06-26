import { createRemoteJWKSet, jwtVerify } from "jose";
import { getEnv } from "fastedge::env";

const CLAIM_NAMES = ["email", "name", "picture", "given_name", "family_name"] as const;
type ClaimName = (typeof CLAIM_NAMES)[number];

export type SsoIdentity = { sub: string } & Partial<Record<ClaimName, string>>;

/**
 * Verify an ES256 JWT from the saml-app cookie variant against the
 * JWKS endpoint at jwksUrl. Returns the identity (sub + any standard
 * identity claims present in the token) on success, null on any failure.
 */
export async function verifySsoToken(
  token: string,
  jwksUrl: string,
): Promise<SsoIdentity | null> {
  try {
    const JWKS = createRemoteJWKSet(new URL(jwksUrl));
    const { payload } = await jwtVerify(token, JWKS, { algorithms: ["ES256"] });
    if (typeof payload.sub !== "string") return null;
    const identity: SsoIdentity = { sub: payload.sub };
    for (const claim of CLAIM_NAMES) {
      if (typeof payload[claim] === "string") {
        identity[claim] = payload[claim] as string;
      }
    }
    return identity;
  } catch {
    return null;
  }
}

/**
 * Verify an ES256 mfa_proof JWT issued by totp-app against the JWKS endpoint
 * at jwksUrl. Binds the proof to expectedSub (must match payload.sub) and
 * optionally checks audience/issuer via MFA_AUDIENCE/MFA_ISSUER env vars.
 * Returns { sub } on success, null on any failure (expired, bad sig, sub
 * mismatch, missing claims, etc.).
 */
export async function verifyMfaProof(
  proof: string,
  jwksUrl: string,
  expectedSub: string,
): Promise<{ sub: string } | null> {
  try {
    const JWKS = createRemoteJWKSet(new URL(jwksUrl));
    const opts: Record<string, unknown> = { algorithms: ["ES256"] };
    const aud = getEnv("MFA_AUDIENCE");
    const iss = getEnv("MFA_ISSUER");
    if (aud) opts.audience = aud;
    if (iss) opts.issuer = iss;
    const { payload } = await jwtVerify(proof, JWKS, opts);
    if (typeof payload.sub !== "string" || payload.sub !== expectedSub) return null;
    return { sub: payload.sub };
  } catch {
    return null;
  }
}
