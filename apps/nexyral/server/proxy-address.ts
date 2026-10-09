import { isIP } from "node:net";
import { HttpError } from "./http.ts";
export function normalizeAddress(value: string) {
  if (!isIP(value) || value.includes("%")) throw new Error("Expected a literal IP address without a zone or CIDR.");
  if (isIP(value) === 4) return value;
  const canonical = new URL(`http://[${value}]/`).hostname.slice(1, -1);
  const mapped = canonical.match(/^::ffff:([a-f0-9]+):([a-f0-9]+)$/);
  if (!mapped) return canonical;
  const high = parseInt(mapped[1], 16); const low = parseInt(mapped[2], 16);
  return `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
}
export function proxyAddresses(values: string[]) {
  return new Set(values.map(value => normalizeAddress(value.trim())));
}
export function rateLimitAddress(remote: string | undefined, forwarded: string | string[] | undefined, trusted: ReadonlySet<string>) {
  const address = remote ? normalizeAddress(remote) : "unknown";
  if (!trusted.has(address)) return address;
  // A controlled proxy must replace, not append to, this header. Chains and
  // other forwarding headers cannot define a requester's rate-limit identity.
  if (typeof forwarded !== "string" || forwarded !== forwarded.trim()) throw new HttpError(400, "Invalid proxy client address.");
  try { return normalizeAddress(forwarded); }
  catch { throw new HttpError(400, "Invalid proxy client address."); }
}
