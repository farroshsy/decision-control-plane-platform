import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { SignJWT } from "jose";

const outputPath = process.env.E2E_STORAGE_STATE ?? "e2e/.auth/local-storage-state.json";
const openId = process.env.E2E_OPEN_ID;
const name = process.env.E2E_USER_NAME ?? "Local E2E user";
const appId = process.env.VITE_APP_ID;
const secret = process.env.JWT_SECRET;
if (!openId || !appId || !secret) throw new Error("E2E_OPEN_ID, VITE_APP_ID, and JWT_SECRET are required to mint a local-only authenticated test state.");

const expiresAt = Math.floor(Date.now() / 1000) + 15 * 60;
const token = await new SignJWT({ openId, appId, name })
  .setProtectedHeader({ alg: "HS256", typ: "JWT" })
  .setExpirationTime(expiresAt)
  .sign(new TextEncoder().encode(secret));

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, JSON.stringify({
  cookies: [{ name: "app_session_id", value: token, domain: "127.0.0.1", path: "/", expires: expiresAt, httpOnly: true, secure: false, sameSite: "None" }],
  origins: [],
}, null, 2));
console.log(`Wrote short-lived local browser-test state to ${outputPath}`);
