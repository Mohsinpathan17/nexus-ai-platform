export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
export async function api<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    csrf?: string | null;
    signal?: AbortSignal;
  } = {},
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method: options.method ?? "GET",
    credentials: "same-origin",
    signal: options.signal,
    headers:
      options.body !== undefined
        ? {
            "Content-Type": "application/json",
            ...(options.csrf ? { "X-CSRF-Token": options.csrf } : {}),
          }
        : options.csrf
          ? { "X-CSRF-Token": options.csrf }
          : {},
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new ApiError(
      response.status,
      "The workspace service returned an unreadable response.",
    );
  }
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith("/auth/"))
      window.dispatchEvent(new Event("nexyral:session-expired"));
    const error =
      data &&
      typeof data === "object" &&
      "error" in data &&
      typeof data.error === "string"
        ? data.error
        : "Unable to complete this request.";
    throw new ApiError(response.status, error);
  }
  return data as T;
}
export function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Unable to complete this request.";
}
