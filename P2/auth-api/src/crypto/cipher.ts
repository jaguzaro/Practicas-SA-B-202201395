export interface Cipher {
  encrypt(plainText: string): string;
  decrypt(cipherText: string): string;
}
