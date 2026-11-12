import type { User } from "better-auth";
import { auth } from "@/lib/server/auth";

export function jsonResponse(data: unknown, status = 200) {
  return Response.json({ data }, { status, headers: { "Cache-Control": "no-store" } });
}

export function errorResponse(code: string, message: string, status: number) {
  return Response.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function getRequestUser(request: Request): Promise<User | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user ?? null;
}

export function unauthorizedResponse() {
  return errorResponse("UNAUTHORIZED", "Sign in to access your workspace.", 401);
}
