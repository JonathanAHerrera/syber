// Server-only — verifies Firebase ID tokens using jose (ESM) via dynamic import
// Replaces firebase-admin to avoid the jwks-rsa → jose ESM/CJS incompatibility

const JWKS_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

export async function verifyFirebaseToken(idToken: string): Promise<string> {
  const { createRemoteJWKSet, jwtVerify } = await import("jose");

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const JWKS = createRemoteJWKSet(new URL(JWKS_URL));

  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });

  if (!payload.sub) throw new Error("No uid in token");
  return payload.sub;
}
