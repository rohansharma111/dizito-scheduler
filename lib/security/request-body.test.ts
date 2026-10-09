import { describe, expect, it, vi } from "vitest";
import { readRequestBodyWithLimit } from "./request-body";

describe("readRequestBodyWithLimit", () => {
  it("returns a bounded body unchanged", async () => {
    const request = new Request("http://localhost/test", {
      method: "POST",
      body: new Uint8Array([1, 2, 3, 4]),
    });

    const result = await readRequestBodyWithLimit(request, 4);
    expect(result).toEqual({ ok: true, body: new Uint8Array([1, 2, 3, 4]) });
  });

  it("rejects streamed bodies that exceed the limit without a Content-Length header", async () => {
    const cancel = vi.fn();
    const request = new Request("http://localhost/test", {
      method: "POST",
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3]));
          controller.enqueue(new Uint8Array([4, 5, 6]));
        },
        cancel,
      }),
      // No Content-Length: exercise the actual stream-size guard.
      duplex: "half",
    } as RequestInit);

    const result = await readRequestBodyWithLimit(request, 5);
    expect(result).toEqual({ ok: false });
    expect(cancel).toHaveBeenCalled();
  });

  it("allows an empty request body", async () => {
    const result = await readRequestBodyWithLimit(new Request("http://localhost/test"), 0);
    expect(result).toEqual({ ok: true, body: new Uint8Array() });
  });
});
