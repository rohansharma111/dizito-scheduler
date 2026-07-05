export type NotificationType =
  | "TARGET_PUBLISHED"
  | "TARGET_FAILED"
  | "TARGET_RETRY_SCHEDULED"
  | "TARGET_PERMANENT_FAILED"
  | "ACCOUNT_CONNECTED"
  | "ACCOUNT_DISCONNECTED"
  | "ACCOUNT_EXPIRED"
  | "SCHEDULER_CYCLE_FAILED";

export function getNotificationIcon(type: string): string {
  switch (type) {
    case "TARGET_PUBLISHED":
      return "✅";

    case "TARGET_FAILED":
      return "❌";

    case "TARGET_RETRY_SCHEDULED":
      return "⚠️";

    case "TARGET_PERMANENT_FAILED":
      return "🚫";

    case "ACCOUNT_CONNECTED":
      return "🔗";

    case "ACCOUNT_DISCONNECTED":
      return "🔌";

    case "ACCOUNT_EXPIRED":
      return "⏰";

    case "SCHEDULER_CYCLE_FAILED":
      return "💥";

    default:
      return "🔔";
  }
}

export function getNotificationColor(type: string): string {
  switch (type) {
    case "TARGET_PUBLISHED":
      return "text-green-600";

    case "ACCOUNT_CONNECTED":
      return "text-green-600";

    case "TARGET_RETRY_SCHEDULED":
      return "text-yellow-600";

    case "ACCOUNT_EXPIRED":
      return "text-yellow-600";

    case "TARGET_FAILED":
      return "text-red-600";

    case "TARGET_PERMANENT_FAILED":
      return "text-red-700";

    case "ACCOUNT_DISCONNECTED":
      return "text-gray-600";

    case "SCHEDULER_CYCLE_FAILED":
      return "text-red-700";

    default:
      return "text-blue-600";
  }
}

export function getNotificationBg(type: string): string {
  switch (type) {
    case "TARGET_PUBLISHED":
    case "ACCOUNT_CONNECTED":
      return "bg-green-50";

    case "TARGET_RETRY_SCHEDULED":
    case "ACCOUNT_EXPIRED":
      return "bg-yellow-50";

    case "TARGET_FAILED":
    case "TARGET_PERMANENT_FAILED":
    case "SCHEDULER_CYCLE_FAILED":
      return "bg-red-50";

    case "ACCOUNT_DISCONNECTED":
      return "bg-gray-50";

    default:
      return "bg-blue-50";
  }
}

export function getNotificationBorder(type: string): string {
  switch (type) {
    case "TARGET_PUBLISHED":
    case "ACCOUNT_CONNECTED":
      return "border-green-200";

    case "TARGET_RETRY_SCHEDULED":
    case "ACCOUNT_EXPIRED":
      return "border-yellow-200";

    case "TARGET_FAILED":
    case "TARGET_PERMANENT_FAILED":
    case "SCHEDULER_CYCLE_FAILED":
      return "border-red-200";

    case "ACCOUNT_DISCONNECTED":
      return "border-gray-200";

    default:
      return "border-blue-200";
  }
}
