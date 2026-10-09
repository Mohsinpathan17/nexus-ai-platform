interface FirebaseClaims {
  sub: string;
  aud: string;
  iss: string;
  exp: number;
  iat: number;
  email_verified?: boolean;
  email?: string;
}
let cached:
  | { until: number; keys: (JsonWebKey & { kid?: string })[] }
  | undefined;
function decode(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(
    atob(value.replaceAll("-", "+").replaceAll("_", "/")),
    (c) => c.charCodeAt(0),
  );
}
export async function authenticate(
  request: Request,
  project: string,
  fetcher: typeof fetch = fetch,
): Promise<FirebaseClaims> {
  const token = request.headers
    .get("Authorization")
    ?.match(/^Bearer ([\w.-]+)$/)?.[1];
  if (!token || token.length > 8192 || !project)
    throw new Error("Unauthorized");
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Unauthorized");
  const header = JSON.parse(new TextDecoder().decode(decode(parts[0]))) as {
    alg?: string;
    kid?: string;
  };
  const claims = JSON.parse(
    new TextDecoder().decode(decode(parts[1])),
  ) as FirebaseClaims;
  const now = Math.floor(Date.now() / 1000);
  if (
    header.alg !== "RS256" ||
    typeof header.kid !== "string" ||
    claims.aud !== project ||
    claims.iss !== `https://securetoken.google.com/${project}` ||
    typeof claims.sub !== "string" ||
    !claims.sub ||
    claims.sub.length > 128 ||
    !Number.isFinite(claims.exp) ||
    claims.exp <= now ||
    !Number.isFinite(claims.iat) ||
    claims.iat > now + 60
  )
    throw new Error("Unauthorized");
  if (
    !cached ||
    cached.until < Date.now() ||
    !cached.keys.some((key) => key.kid === header.kid)
  ) {
    const response = await fetcher(
      "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
      { redirect: "manual", signal: AbortSignal.timeout(10000) },
    );
    if (!response.ok) throw new Error("Identity service unavailable");
    const data = (await response.json()) as {
      keys: (JsonWebKey & { kid?: string })[];
    };
    cached = { keys: data.keys, until: Date.now() + 3600000 };
  }
  const jwk = cached.keys.find((key) => key.kid === header.kid);
  if (!jwk) throw new Error("Unauthorized");
  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  if (
    !(await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      decode(parts[2]),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
    ))
  )
    throw new Error("Unauthorized");
  return claims;
}
