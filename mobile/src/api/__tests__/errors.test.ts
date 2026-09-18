import { ApiError } from "../errors";

describe("ApiError", () => {
  it("preserves the HTTP status and standard error behaviour", () => {
    const error = new ApiError(401);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(401);
    expect(error.name).toBe("ApiError");
    expect(error.message).toBe("API request failed: 401");
  });
});
