import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { UnauthorizedError } from "@/lib/auth";

export class AppError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 400, code = "BAD_REQUEST") {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
  }
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function created<T>(data: T) {
  return NextResponse.json({ success: true, data }, { status: 201 });
}

export function errorResponse(message: string, status: number, code: string, details?: unknown) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {}),
      },
    },
    { status }
  );
}

export function handleApiError(err: unknown) {
  if (err instanceof UnauthorizedError) {
    return errorResponse(err.message, 401, "UNAUTHORIZED");
  }
  if (err instanceof ZodError) {
    return errorResponse("Validation failed", 422, "VALIDATION_ERROR", err.flatten());
  }
  if (err instanceof AppError) {
    return errorResponse(err.message, err.status, err.code);
  }
  if (err && typeof err === "object" && "code" in err) {
    const prismaErr = err as { code?: string };
    if (prismaErr.code === "P2002") {
      return errorResponse("A matching record already exists", 409, "CONFLICT");
    }
    if (prismaErr.code === "P2025") {
      return errorResponse("Record not found", 404, "NOT_FOUND");
    }
  }
  console.error("[API Error]", err);
  return errorResponse("An unexpected server error occurred", 500, "INTERNAL_SERVER_ERROR");
}
