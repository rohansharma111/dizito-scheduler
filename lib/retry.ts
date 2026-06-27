export function getRetryDelay(
  retryCount: number
) {
  const delays = [
    5,
    15,
    30,
    60,
    180,
  ];

  return delays[
    Math.min(
      retryCount - 1,
      delays.length - 1
    )
  ];
}