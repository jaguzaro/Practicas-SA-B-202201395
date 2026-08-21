import { env } from "../config/env.js";
import { AesRandomCipher } from "./aes-random-cipher.js";
import { AesDeterministicCipher } from "./aes-deterministic-cipher.js";

function loadKey(): Buffer {
  return Buffer.from(env.aesSecretKey, "hex");
}

export const secureCipher = new AesRandomCipher(loadKey());
export const lookupCipher = new AesDeterministicCipher(loadKey());
