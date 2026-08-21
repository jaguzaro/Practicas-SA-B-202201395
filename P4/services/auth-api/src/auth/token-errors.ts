export class TokenExpiredError extends Error {
  constructor() {
    super("El token ha expirado");
    this.name = "TokenExpiredError";
  }
}

export class TokenInvalidError extends Error {
  constructor() {
    super("El token es inválido");
    this.name = "TokenInvalidError";
  }
}
