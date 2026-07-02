export function isPermanentError(error: string) {
  const permanent = [
    "OAuthException",
    "Malformed access token",
    "Invalid OAuth",
    "Permission denied",
    "Page not found",
    "INVALID_ACCESS_TOKEN"
  ];

  return permanent.some((e) => error.includes(e));
}
