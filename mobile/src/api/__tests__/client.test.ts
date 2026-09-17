import { apiFetch } from "../client";

describe("apiFetch", () => {
  it("returns parsed JSON for a successful response", async () => {
    const payload = { status: "ok" };
    const response = new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

    const fetchMock = jest.spyOn(globalThis, "fetch").mockResolvedValue(response);

    const result = await apiFetch<{ status: string }>("/health");

    expect(result).toEqual(payload);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("defaults the request content type to JSON", async () => {
    const payload = { status: "ok" };
    const response = new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

    const fetchMock = jest.spyOn(globalThis, "fetch").mockResolvedValue(response);

    await apiFetch<{ status: string }>("/health");
    const requestOptions = fetchMock.mock.calls[0][1];
    const headers = new Headers(requestOptions?.headers);

    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("preserves caller-provided headers", async () => {
    const payload = { status: "ok" };
    const response = new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

    const fetchMock = jest.spyOn(globalThis, "fetch").mockResolvedValue(response);

    await apiFetch<{ status: string }>("/health", {
      headers: {
        "content-type": "text/plain",
        Authorization: "Bearer test-token",
      },
    });
    const requestOptions = fetchMock.mock.calls[0][1];
    const headers = new Headers(requestOptions?.headers);

    expect(headers.get("Content-Type")).toBe("text/plain");
    expect(headers.get("Authorization")).toBe("Bearer test-token");
  });

  it("adds the default content type alongside caller headers", async () => {
    const payload = { status: "ok" };
    const response = new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

    const fetchMock = jest.spyOn(globalThis, "fetch").mockResolvedValue(response);

    await apiFetch<{ status: string }>("/health", {
      headers: { Authorization: "Bearer test-token" },
    });
    const requestOptions = fetchMock.mock.calls[0][1];
    const headers = new Headers(requestOptions?.headers);

    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("Authorization")).toBe("Bearer test-token");
  });

  it("rejects unsuccessful HTTP responses", async () => {
    const response = new Response(JSON.stringify({ detail: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });

    jest.spyOn(globalThis, "fetch").mockResolvedValue(response);

    await expect(apiFetch("/health")).rejects.toThrow("API request failed: 401");
  });

  it("propagates network failures", async () => {
    const error = new TypeError("Network request failed");

    jest.spyOn(globalThis, "fetch").mockRejectedValue(error);

    await expect(apiFetch("/health")).rejects.toBe(error);
  });
});
