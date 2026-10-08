const SIGNATURES = {
  "image/jpeg": (buffer: Buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  "image/png": (buffer: Buffer) =>
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a,
  "image/gif": (buffer: Buffer) =>
    buffer.length >= 6 &&
    buffer.subarray(0, 6).toString("ascii") === "GIF87a" ||
    buffer.length >= 6 &&
    buffer.subarray(0, 6).toString("ascii") === "GIF89a",
  "video/webm": (buffer: Buffer) =>
    buffer.length >= 4 &&
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3,
  "video/mp4": (buffer: Buffer) => {
    if (buffer.length < 12) return false;
    return buffer.subarray(4, 8).toString("ascii") === "ftyp";
  },
  "video/quicktime": (buffer: Buffer) => {
    if (buffer.length < 12) return false;
    return buffer.subarray(4, 8).toString("ascii") === "ftyp" &&
      buffer.subarray(8, 12).toString("ascii") === "qt  ";
  },
} satisfies Record<string, (buffer: Buffer) => boolean>;

export function matchesDeclaredMediaType(buffer: Buffer, mimeType: string): boolean {
  const matcher = SIGNATURES[mimeType as keyof typeof SIGNATURES];
  return matcher ? matcher(buffer) : false;
}
