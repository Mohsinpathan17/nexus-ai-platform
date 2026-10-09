import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeAddress, proxyAddresses, rateLimitAddress } from "./proxy-address.ts";
import { createRateLimiter } from "./auth.ts";
import { openDatabase } from "./database.ts";
import { createApp } from "./app.ts";
import type { AddressInfo } from "node:net";
test("untrusted forwarding headers cannot rotate a rate-limit identity", () => {
  const trusted = proxyAddresses(["127.0.0.1"]);
  const limit = createRateLimiter({ max: 1 });
  limit(rateLimitAddress("192.0.2.1", "198.51.100.1", trusted));
  assert.throws(() => limit(rateLimitAddress("192.0.2.1", "198.51.100.2", trusted)), /Too many/);
  assert.equal(rateLimitAddress("192.0.2.1", ["invalid", "headers"], trusted), "192.0.2.1");
});
test("trusted peers require one literal IP and canonicalize equivalent IPv6 and mapped forms", () => {
  const trusted = proxyAddresses(["127.0.0.1"]);
  assert.equal(rateLimitAddress("::ffff:127.0.0.1", "198.51.100.1", trusted), "198.51.100.1");
  assert.equal(normalizeAddress("2001:0db8:0000:0000:0000:0000:0000:0001"), normalizeAddress("2001:db8::1"));
  assert.equal(normalizeAddress("::ffff:c000:201"), "192.0.2.1");
  for (const value of [undefined, "192.0.2.1,198.51.100.2", " 192.0.2.1", "spoof.example", "fe80::1%eth0", ["192.0.2.1"]])
    assert.throws(() => rateLimitAddress("127.0.0.1", value, trusted), /Invalid proxy/);
  assert.throws(() => proxyAddresses(["127.0.0.0/8"]), /literal IP/);
});
test("proxied recovery clients have separate budgets and a single client still reaches its limit", async () => {
  const db = openDatabase(":memory:"); const server = createApp({ db, origins: ["https://app.fixture.test"], trustedProxies: ["127.0.0.1"] });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/auth/recovery`;
  const request = (ip: string) => fetch(url, { method: "POST", headers: { Origin: "https://app.fixture.test", "Content-Type": "application/json", "X-Forwarded-For": ip }, body: JSON.stringify({ token: "0".repeat(64), password: "a-new-password-123" }) });
  try {
    for (let index = 0; index < 5; index++) assert.equal((await request("192.0.2.1")).status, 400);
    assert.equal((await request("192.0.2.1")).status, 429);
    assert.equal((await request("192.0.2.2")).status, 400);
    assert.equal((await request("192.0.2.1,192.0.2.2")).status, 400);
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); db.close(); }
});
