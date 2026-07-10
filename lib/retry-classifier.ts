export function isPermanentError(error: string) {
  const message = error.toLowerCase();

  const permanentErrors = [
    "invalid_access_token",
    "malformed access token",
    "invalid oauth",
    "permission denied",
    "page not found",
    "board not found",
    "location not found",
    "member not found",
    "unsupported platform",
    "validation_error",
    "invalid_reconnect",
    "invalid_reconnect_board",
    "invalid_reconnect_location",
    "invalid_reconnect_platform",
    "plan_limit",
    "unsupported media",
    "unsupported image",
    "invalid image",
    "invalid request",
  ];

  return permanentErrors.some((e) => message.includes(e.toLowerCase()));
}
