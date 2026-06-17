import { createRemoteJWKSet, jwtVerify } from "jose";

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
