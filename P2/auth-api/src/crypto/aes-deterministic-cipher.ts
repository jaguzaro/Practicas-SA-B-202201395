import { createCipheriv, createDecipheriv, createHmac } from "node:crypto";
import type { Cipher } from "./cipher.js";

const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;

export class AesDeterministicCipher implements Cipher {
  constructor(private readonly key: Buffer) {}

  private deriveIv(plainText: string): Buffer {
    return createHmac("sha256", this.key)
      .update(plainText)
      .digest()
      .subarray(0, IV_LENGTH);
  }

  encrypt(plainText: string): string {
    const iv = this.deriveIv(plainText);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
    return Buffer.concat([iv, encrypted]).toString("base64");
  }

  decrypt(cipherText: string): string {
    const raw = Buffer.from(cipherText, "base64");
    const iv = raw.subarray(0, IV_LENGTH);
    const encrypted = raw.subarray(IV_LENGTH);
    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString("utf8");
  }
}
