import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const keyRaw = process.env.ENCRYPTION_KEY!;
const key = keyRaw.length === 44 && keyRaw.endsWith("=")
  ? Buffer.from(keyRaw, "base64")
  : Buffer.from(keyRaw, "hex");

export function encrypt(json: any): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.from(JSON.stringify(json));
  const enc = Buffer.concat([cipher.update(data), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decrypt<T=any>(b64: string): T {
  const buf = Buffer.from(b64, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return JSON.parse(dec.toString("utf8"));
}
