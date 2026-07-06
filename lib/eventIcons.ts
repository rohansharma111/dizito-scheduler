export function getEventIcon(type: string) {
  switch (type) {
    /*
      Publishing
    */

    case "TARGET_PUBLISHED":
      return "✅";

    case "TARGET_FAILED":
      return "❌";

    case "TARGET_RETRY_SCHEDULED":
      return "⚠️";

    case "TARGET_PERMANENT_FAILED":
      return "🚫";

    /*
      Scheduler
    */

    case "SCHEDULER_CYCLE_STARTED":
      return "▶️";

    case "SCHEDULER_CYCLE_COMPLETED":
      return "✔️";

    case "SCHEDULER_CYCLE_FAILED":
      return "💥";

    /*
      Accounts
    */

    case "ACCOUNT_CONNECTED":
      return "🔗";

    case "ACCOUNT_DISCONNECTED":
      return "🔌";

    case "ACCOUNT_RECONNECTED":
      return "🔄";

    case "ACCOUNT_EXPIRED":
      return "⏳";

    case "ACCOUNT_HEALTH_WARNING":
      return "🩺";

    /*
      Posts
    */

    case "POST_CREATED":
      return "📝";

    case "POST_UPDATED":
      return "✏️";

    case "POST_DELETED":
      return "🗑️";

    case "POST_DUPLICATED":
      return "📄";

    case "POST_SCHEDULED":
      return "📅";

    case "POST_PUBLISHED":
      return "🚀";

    /*
      Drafts
    */

    case "DRAFT_CREATED":
      return "📋";

    case "DRAFT_UPDATED":
      return "🖊️";

    case "DRAFT_DELETED":
      return "❎";

    /*
      Bulk Upload
    */

    case "BULK_UPLOAD_STARTED":
      return "📤";

    case "BULK_UPLOAD_COMPLETED":
      return "📥";

    case "BULK_UPLOAD_FAILED":
      return "🚨";

    /*
      Authentication
    */

    case "USER_LOGIN":
      return "👤";

    case "USER_LOGOUT":
      return "🚪";

    /*
      Plans
    */

    case "PLAN_CHANGED":
      return "💳";

    case "PLAN_LIMIT_REACHED":
      return "⚡";

    /*
      Notifications
    */

    case "NOTIFICATION_CREATED":
      return "🔔";

    /*
      Generic
    */

    default:
      return "ℹ️";
  }
}
