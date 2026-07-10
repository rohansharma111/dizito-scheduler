import Link from "next/link";

type Props = {
  searchParams: Promise<{
    platform?: string;
    code?: string;
  }>;
};

function getErrorDetails(code?: string) {
  switch (code) {
    case "NO_RESOURCES":
      return {
        icon: "📭",
        title: "No Resources Found",
        description:
          "The selected account doesn't contain any pages, boards, locations or other publishable resources. Try a different account or create one first.",
      };

    case "AUTH_FAILED":
      return {
        icon: "🔒",
        title: "Authentication Failed",
        description:
          "Authentication could not be completed. Please reconnect your account.",
      };

    case "PERMISSION_DENIED":
      return {
        icon: "🚫",
        title: "Permission Denied",
        description:
          "Dizito doesn't have permission to access the selected resource. Please review the permissions and try again.",
      };

    case "API_UNAVAILABLE":
      return {
        icon: "⏳",
        title: "Service Temporarily Unavailable",
        description:
          "The platform's API is currently unavailable or temporarily limiting requests. Please try again in a few minutes.",
      };

    case "PLAN_LIMIT":
      return {
        icon: "💎",
        title: "Plan Limit Reached",
        description:
          "Your current plan doesn't allow connecting additional accounts. Upgrade your plan to continue.",
      };

    case "DUPLICATE":
      return {
        icon: "ℹ️",
        title: "Already Connected",
        description: "This account is already connected to Dizito.",
      };

    case "OAUTH_CANCELLED":
      return {
        icon: "❌",
        title: "Connection Cancelled",
        description:
          "You cancelled the authorization process. No changes were made.",
      };

    case "INVALID_RECONNECT":
      return {
        icon: "🔄",
        title: "Reconnect Failed",
        description:
          "The selected account doesn't match the original account you're trying to reconnect. Please reconnect the same account.",
      };

    case "QUOTA_EXCEEDED":
      return {
        icon: "📊",
        title: "Rate Limit Reached",
        description:
          "The platform is temporarily limiting requests. Please wait a few minutes before trying again.",
      };

    case "API_DISABLED":
      return {
        icon: "⚙️",
        title: "Platform API Unavailable",
        description:
          "This platform's API is currently unavailable. Please try again later.",
      };

    default:
      return {
        icon: "⚠️",
        title: "Connection Failed",
        description:
          "Something went wrong while connecting your account. Please try again.",
      };
  }
}

export default async function ConnectErrorPage({ searchParams }: Props) {
  const params = await searchParams;

  const platform = (params.platform ?? "Platform")
    .replaceAll("-", " ")
    .replaceAll("_", " ");

  const error = getErrorDetails(params.code);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-xl w-full bg-white rounded-2xl border shadow-sm p-10">
        <div className="text-center">
          <div className="text-6xl">{error.icon}</div>

          <h1 className="mt-6 text-3xl font-bold">{error.title}</h1>

          <p className="mt-5 text-gray-600 leading-7">{error.description}</p>

          <div className="mt-8 inline-flex items-center rounded-full bg-gray-100 px-4 py-2 text-sm">
            Platform:
            <span className="ml-2 font-semibold capitalize">{platform}</span>
          </div>
        </div>

        <div className="mt-10 rounded-xl bg-blue-50 border border-blue-100 p-5">
          <div className="font-semibold">What can you do?</div>

          <ul className="mt-3 space-y-2 text-sm text-gray-700 list-disc list-inside">
            <li>Verify that the correct account is being used.</li>

            <li>Ensure you've granted all requested permissions.</li>

            <li>
              If this is a temporary provider issue, wait a few minutes and try
              again.
            </li>

            <li>If the issue persists, reconnect the account.</li>
          </ul>
        </div>

        <div className="mt-10 flex flex-col sm:flex-row gap-4">
          <Link
            href="/accounts"
            className="flex-1 text-center rounded-lg border px-5 py-3 hover:bg-gray-100 transition"
          >
            Back to Accounts
          </Link>

          <Link
            href="/accounts"
            className="flex-1 text-center rounded-lg bg-blue-600 text-white px-5 py-3 hover:bg-blue-700 transition"
          >
            Try Again
          </Link>
        </div>
      </div>
    </div>
  );
}
