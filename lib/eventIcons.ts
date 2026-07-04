export function getEventIcon(type: string) {
  switch (type) {
    case "TARGET_PUBLISHED":
      return "✅";

    case "TARGET_FAILED":
      return "❌";

    case "TARGET_RETRY_SCHEDULED":
      return "⚠";

    case "ACCOUNT_CONNECTED":
      return "🔗";

    default:
      return "ℹ";
  }
}
