import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/app-error.js";

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  console.error(error);
  res.status(500).json({ message: "Error interno del servidor" });
}
