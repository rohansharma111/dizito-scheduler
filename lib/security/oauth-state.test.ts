import { describe, expect, it } from "vitest";
import { createOAuthState, verifyOAuthState } from "@/lib/security/oauth-state";

describe("OAuth state", () => {
  it("creates unpredictable non-empty state values", () => {
    const first = createOAuthState();
    const second = createOAuthState();
    expect(first).toBeTruthy();
    expect(first).not.toBe(second);
  });

  it("accepts the exact state and rejects missing or altered values", () => {
    const state = createOAuthState();
    expect(verifyOAuthState(state, state)).toBe(true);
    expect(verifyOAuthState(state, state + "x")).toBe(false);
    expect(verifyOAuthState(state, null)).toBe(false);
    expect(verifyOAuthState(null, state)).toBe(false);
  });
});