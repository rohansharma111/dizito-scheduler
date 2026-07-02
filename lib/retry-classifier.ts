export function isPermanentError(error: string) {
  const permanent = [
    "OAuthException",
    "Malformed access token",
    "Invalid OAuth",
    "Permission denied",
    "Page not found",
  ];

  return permanent.some((e) => error.includes(e));
}
