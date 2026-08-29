import type { NewUserRecord, UserRecord } from "./user.types.js";

export interface UserRepository {
  findByEncryptedEmail(correoCifrado: string): Promise<UserRecord | null>;
  create(user: NewUserRecord): Promise<UserRecord>;
}
