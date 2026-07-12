export type QueryErrorCode = "NOT_FOUND" | "DB_ERROR" | "EMPTY";

export type QueryResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: QueryErrorCode; message: string };

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

export function isOk<T>(
  result: QueryResult<T> | ActionResult<T>,
): result is { ok: true; data: T } {
  return result.ok;
}

export function isNotFound(result: QueryResult<unknown>): boolean {
  return !result.ok && result.code === "NOT_FOUND";
}