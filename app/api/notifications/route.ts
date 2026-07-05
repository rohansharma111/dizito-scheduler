import { pool } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";

const NOTIFICATION_EVENTS = [
  "TARGET_PUBLISHED",
  "TARGET_FAILED",
  "TARGET_RETRY_SCHEDULED",
  "TARGET_PERMANENT_FAILED",
  "ACCOUNT_CONNECTED",
  "ACCOUNT_DISCONNECTED",
  "ACCOUNT_EXPIRED",
];

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return Response.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const userId = (session.user as any).id;

    const result = await pool.query(
      `
        SELECT
          id,
          event_type,
          entity_type,
          entity_id,
          payload,
          is_read,
          created_at
        FROM system_events
        WHERE
          user_id = $1
          AND
          event_type = ANY($2)
        ORDER BY
          created_at DESC
        LIMIT 50
        `,
      [userId, NOTIFICATION_EVENTS],
    );

    const notifications = result.rows.map((event) => ({
      id: event.id,

      type: event.event_type,

      title: getTitle(event.event_type),

      message: getMessage(event),

      entityType: event.entity_type,

      entityId: event.entity_id,

      payload: event.payload,

      isRead: event.is_read,

      createdAt: event.created_at,
    }));

    return Response.json(notifications);
  } catch (error) {
    console.error("Notifications API error:", error);

    return Response.json(
      {
        error: "Failed to load notifications",
      },
      {
        status: 500,
      },
    );
  }
}

function getTitle(type: string) {
  switch (type) {
    case "TARGET_PUBLISHED":
      return "Post Published";

    case "TARGET_FAILED":
      return "Publish Failed";

    case "TARGET_RETRY_SCHEDULED":
      return "Retry Scheduled";

    case "TARGET_PERMANENT_FAILED":
      return "Permanent Failure";

    case "ACCOUNT_CONNECTED":
      return "Account Connected";

    case "ACCOUNT_DISCONNECTED":
      return "Account Disconnected";

    case "ACCOUNT_EXPIRED":
      return "Account Expired";

    default:
      return type;
  }
}

function getMessage(event: any) {
  const payload = event.payload || {};

  switch (event.event_type) {
    case "TARGET_PUBLISHED":
      return `${payload.platform ?? "Post"} published successfully`;

    case "TARGET_FAILED":
      return `${payload.platform ?? "Post"} publishing failed`;

    case "TARGET_RETRY_SCHEDULED":
      return `${payload.platform ?? "Post"} will retry in ${
        payload.retryDelay ?? "some"
      } minutes`;

    case "TARGET_PERMANENT_FAILED":
      return `${payload.platform ?? "Post"} failed permanently`;

    case "ACCOUNT_CONNECTED":
      return `${payload.accountName ?? "Account"} connected`;

    case "ACCOUNT_DISCONNECTED":
      return `${payload.accountName ?? "Account"} disconnected`;

    case "ACCOUNT_EXPIRED":
      return `${payload.accountName ?? "Account"} needs reconnection`;

    default:
      return JSON.stringify(payload);
  }
}
