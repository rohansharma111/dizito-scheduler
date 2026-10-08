import { describe, expect, it } from "vitest";
import { assertMediaStateTransition, canTransitionMediaState } from "@/lib/media/state";

describe("media processing state machine", () => {
  it("allows the upload lifecycle to progress to ready", () => {
    expect(canTransitionMediaState("pending", "uploading")).toBe(true);
    expect(canTransitionMediaState("uploading", "processing")).toBe(true);
    expect(canTransitionMediaState("processing", "ready")).toBe(true);
  });

  it("allows failures to retry from failed", () => {
    expect(canTransitionMediaState("uploading", "failed")).toBe(true);
    expect(canTransitionMediaState("failed", "pending")).toBe(true);
  });

  it("does not allow terminal ready state to regress", () => {
    expect(canTransitionMediaState("ready", "processing")).toBe(false);
    expect(() => assertMediaStateTransition("ready", "failed")).toThrow();
  });
});
