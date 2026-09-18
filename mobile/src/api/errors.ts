/** An unsuccessful HTTP response with a machine-readable status. */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`API request failed: ${status}`);
    this.name = "ApiError";
    this.status = status;
  }
}
