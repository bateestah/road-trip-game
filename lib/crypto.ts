import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

let keyBuf: Buffer | null = null;

function getKey(): Buffer {
  if (keyBuf) return keyBuf;
  const keyRaw = process.env.ENCRYPTION_KEY;
  if (!keyRaw) {
    // Don’t crash at build; fail clearly at runtime if used without key
    throw new Error("ENCRYPTION_KEY is missing. Set it in your environment variables.");
  }
  // Accept base64 (44 chars ending with =) or hex (64 chars)
  keyBuf = (keyRaw.length === 44 && keyRaw.endsWith("="))
    ? Buffer.from(keyRaw, "base64")
    : Buffer.from(keyRaw, "hex");
  if (keyBuf.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be 32 bytes (256-bit) in hex or base64.");
  }
  return keyBuf;
}

export function encrypt(json: any): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.from(JSON.stringify(json));
  const enc = Buffer.concat([cipher.update(data), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decrypt<T = any>(b64: string): T {
  const key = getKey();
  const buf = Buffer.from(b64, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return JSON.parse(dec.toString("utf8"));
}
