export function getEventDescription(event: any) {
  const payload = event.payload || {};

  switch (event.event_type) {
    case "TARGET_PUBLISHED":
      return payload.accountName || "Published successfully";

    case "TARGET_FAILED":
      return payload.error || "Publishing failed";

    case "TARGET_RETRY_SCHEDULED":
      return `Retry #${payload.retry}`;

    default:
      return "";
  }
}
