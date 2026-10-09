import Link from "next/link";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import { DizitoBadge, DizitoCard, DizitoPage, DizitoPageHeader } from "@/components/dizito/DizitoUI";

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
    <DizitoPage className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
        <DizitoPageHeader eyebrow="Account connection" title={error.title} description={error.description} />
        <div className="mb-5 flex flex-wrap items-center gap-2"><DizitoBadge tone="danger"><AlertTriangle size={13} /> Connection needs attention</DizitoBadge><DizitoBadge>{platform}</DizitoBadge></div>
        <DizitoCard tone="soft">
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
        </DizitoCard>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/accounts"
            className="dizito-button dizito-button-secondary flex-1 justify-center"
          >
            <ArrowLeft size={16} /> Back to Accounts
          </Link>

          <Link
            href="/accounts"
            className="dizito-button dizito-button-primary flex-1 justify-center"
          >
            <RefreshCw size={16} /> Try Again
          </Link>
        </div>
    </DizitoPage>
  );
}
