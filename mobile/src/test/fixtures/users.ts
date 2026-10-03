import type { UserResponse } from "@/types/auth";

const EMAIL = "test@example.com";
const USER_ID = "test-user-id";

export function makeUserResponse(overrides: Partial<UserResponse> = {}): UserResponse {
  const baseUserResponse = {
    id: USER_ID,
    email: EMAIL,
  };
  return {
    ...baseUserResponse,
    ...overrides,
  };
}
