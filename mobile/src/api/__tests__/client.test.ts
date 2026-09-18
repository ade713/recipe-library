import { apiFetch } from "../client";
import { ApiError } from "../errors";

const HEALTH_PATH = "/health";
const TEST_AUTHORIZATION = "Bearer test-token";

type HealthResponse = { status: string };

/** Mock fetch with a fresh JSON response so response bodies are never shared. */
function mockJsonResponse(payload: unknown = { status: "ok" }, status = 200) {
  const response = new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

  return jest.spyOn(globalThis, "fetch").mockResolvedValue(response);
}

describe("apiFetch", () => {
  it("returns parsed JSON for a successful response", async () => {
    const payload = { status: "ok" };
    const fetchMock = mockJsonResponse(payload);

    const result = await apiFetch<HealthResponse>(HEALTH_PATH);

    expect(result).toEqual(payload);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("defaults the request content type to JSON", async () => {
    const fetchMock = mockJsonResponse();

    await apiFetch<HealthResponse>(HEALTH_PATH);
    const requestOptions = fetchMock.mock.calls[0][1];
    const headers = new Headers(requestOptions?.headers);

    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("preserves caller-provided headers", async () => {
    const fetchMock = mockJsonResponse();

    await apiFetch<HealthResponse>(HEALTH_PATH, {
      headers: {
        "content-type": "text/plain",
        Authorization: TEST_AUTHORIZATION,
      },
    });
    const requestOptions = fetchMock.mock.calls[0][1];
    const headers = new Headers(requestOptions?.headers);

    expect(headers.get("Content-Type")).toBe("text/plain");
    expect(headers.get("Authorization")).toBe(TEST_AUTHORIZATION);
  });

  it("adds the default content type alongside caller headers", async () => {
    const fetchMock = mockJsonResponse();

    await apiFetch<HealthResponse>(HEALTH_PATH, {
      headers: { Authorization: TEST_AUTHORIZATION },
    });
    const requestOptions = fetchMock.mock.calls[0][1];
    const headers = new Headers(requestOptions?.headers);

    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("Authorization")).toBe(TEST_AUTHORIZATION);
  });

  it.each([401, 500])("rejects HTTP %i responses with an ApiError", async (status) => {
    mockJsonResponse({ detail: "Not authenticated" }, status);
    const request = apiFetch(HEALTH_PATH);

    await expect(request).rejects.toBeInstanceOf(ApiError);
    await expect(request).rejects.toMatchObject({
      status,
      message: `API request failed: ${status}`,
    });
  });

  it("propagates network failures", async () => {
    const error = new TypeError("Network request failed");

    jest.spyOn(globalThis, "fetch").mockRejectedValue(error);

    await expect(apiFetch(HEALTH_PATH)).rejects.toBe(error);
  });

  it("returns undefined for a 204 response without parsing JSON", async () => {
    const response = new Response(null, { status: 204 });
    const jsonSpy = jest.spyOn(response, "json");

    jest.spyOn(globalThis, "fetch").mockResolvedValue(response);

    const result = await apiFetch<void>("/recipes/test-recipe", {
      method: "DELETE",
    });

    expect(result).toBeUndefined();
    expect(jsonSpy).not.toHaveBeenCalled();
  });
});
