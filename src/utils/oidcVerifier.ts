import crypto from 'crypto';

import jwt from 'jsonwebtoken';

interface Jwk {
  kid: string;
  kty: string;
  [key: string]: unknown;
}

interface JwksResponse {
  keys: Jwk[];
}

const JWKS_CACHE_TTL_MS = 60 * 60 * 1000;
const jwksCache = new Map<string, { keys: Jwk[]; fetchedAt: number }>();

async function getJwks(jwksUri: string): Promise<Jwk[]> {
  const cached = jwksCache.get(jwksUri);
  if (cached && Date.now() - cached.fetchedAt < JWKS_CACHE_TTL_MS) {
    return cached.keys;
  }

  const response = await fetch(jwksUri);
  if (!response.ok) {
    throw new Error(`Failed to fetch JWKS from ${jwksUri}: ${response.status}`);
  }

  const body = (await response.json()) as JwksResponse;
  jwksCache.set(jwksUri, { keys: body.keys, fetchedAt: Date.now() });
  return body.keys;
}

/**
 * Verifies an OIDC ID token (Google/Apple Sign-In) against the issuer's live JWKS —
 * no vendor SDK required. Used by Google/Apple login, which only need ID-token
 * verification (audience + signature + issuer), not a full OAuth client secret flow.
 */
export async function verifyOidcIdToken(params: {
  idToken: string;
  jwksUri: string;
  issuer: string;
  audience: string;
}): Promise<jwt.JwtPayload> {
  const decoded = jwt.decode(params.idToken, { complete: true });
  if (!decoded || typeof decoded === 'string' || !decoded.header.kid) {
    throw new Error('Malformed ID token');
  }

  const keys = await getJwks(params.jwksUri);
  const jwk = keys.find((key) => key.kid === decoded.header.kid);
  if (!jwk) {
    throw new Error('No matching JWKS key for this ID token');
  }

  const publicKey = crypto.createPublicKey({ key: jwk as unknown as crypto.JsonWebKeyInput['key'], format: 'jwk' });

  const payload = jwt.verify(params.idToken, publicKey, {
    algorithms: ['RS256'],
    issuer: params.issuer,
    audience: params.audience,
  });

  if (typeof payload === 'string') {
    throw new Error('Unexpected ID token payload shape');
  }

  return payload;
}
