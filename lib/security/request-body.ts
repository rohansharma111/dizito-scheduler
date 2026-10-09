export type LimitedRequestBody =
  | { ok: true; body: Uint8Array }
  | { ok: false };

export async function readRequestBodyWithLimit(
  request: Request,
  maxBytes: number,
): Promise<LimitedRequestBody> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) {
    throw new Error("maxBytes must be a non-negative safe integer");
  }

  if (!request.body) {
    return { ok: true, body: new Uint8Array() };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return { ok: false };
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return { ok: true, body };
}
