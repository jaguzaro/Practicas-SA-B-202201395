import type { Response } from "express";
import ms from "ms";
import { env } from "../config/env.js";

export const AUTH_COOKIE_NAME = "token";

function cookieMaxAgeMs(): number {
  const expiration = ms(env.jwtExpiration as ms.StringValue);
  const grace = ms(env.jwtGracePeriod as ms.StringValue);
  return expiration + grace;
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: cookieMaxAgeMs(),
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME);
}
