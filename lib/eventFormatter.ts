export function getEventTitle(event: any) {
  switch (event.event_type) {
    case "TARGET_PUBLISHED":
      return `${event.payload.platform} post published`;

    case "TARGET_FAILED":
      return `${event.payload.platform} publish failed`;

    case "TARGET_RETRY_SCHEDULED":
      return `${event.payload.platform} retry scheduled`;

    case "ACCOUNT_CONNECTED":
      return `${event.payload.platform} account connected`;

    case "ACCOUNT_DISCONNECTED":
      return `${event.payload.platform} account disconnected`;

    default:
      return event.event_type;
  }
}
