// ABOUTME: Tests for JWT authentication in Cloudflare Worker
// ABOUTME: Validates token verification and payload extraction

import { describe, it, expect, vi } from "vitest";

// Mock the jose library to avoid issues with dynamic imports in test environment
vi.mock("jose", () => ({
  jwtVerify: vi.fn(),
}));

describe("validateJWT", () => {
  const testSecret = "test-secret-key-minimum-32-chars-long!!";

  it("should validate a correct JWT token", async () => {
    // Mock jwtVerify to return a valid payload
    const mockPayload = {
      userId: "user123",
      interviewId: "interview456",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const { jwtVerify } = await import("jose");
    vi.mocked(jwtVerify).mockResolvedValue({ payload: mockPayload });

    const { validateJWT } = await import("../auth");
    const result = await validateJWT("valid-token", testSecret);

    expect(result.userId).toBe(mockPayload.userId);
    expect(result.interviewId).toBe(mockPayload.interviewId);
    expect(result.iat).toBe(mockPayload.iat);
    expect(result.exp).toBe(mockPayload.exp);

    // Verify jwtVerify was called with correct parameters
    expect(jwtVerify).toHaveBeenCalledWith(
      "valid-token",
      expect.any(Uint8Array),
      { algorithms: ["HS256"] }
    );
  });

  it("should reject an expired token", async () => {
    // Mock jwtVerify to throw an error (simulating expired token)
    const { jwtVerify } = await import("jose");
    vi.mocked(jwtVerify).mockRejectedValue(new Error("JWT expired"));

    const { validateJWT } = await import("../auth");
    await expect(validateJWT("expired-token", testSecret)).rejects.toThrow(
      "JWT validation failed",
    );
  });

  it("should reject a token with wrong secret", async () => {
    // Mock jwtVerify to throw an error (simulating wrong secret)
    const { jwtVerify } = await import("jose");
    vi.mocked(jwtVerify).mockRejectedValue(new Error("Invalid signature"));

    const { validateJWT } = await import("../auth");
    await expect(validateJWT("wrong-secret-token", testSecret)).rejects.toThrow(
      "JWT validation failed",
    );
  });

  it("should reject an invalid token format", async () => {
    // Mock jwtVerify to throw an error (simulating invalid format)
    const { jwtVerify } = await import("jose");
    vi.mocked(jwtVerify).mockRejectedValue(new Error("Invalid token"));

    const { validateJWT } = await import("../auth");
    await expect(validateJWT("invalid-token-format", testSecret)).rejects.toThrow(
      "JWT validation failed",
    );
  });
});
