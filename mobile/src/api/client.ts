const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

/** Fetch JSON from the API, throwing on unsuccessful HTTP responses. */
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}
