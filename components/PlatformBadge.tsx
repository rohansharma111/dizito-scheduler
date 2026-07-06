interface PlatformBadgeProps {
  platform?: string | null;
  size?: "sm" | "md";
}

export default function PlatformBadge({
  platform,
  size = "sm",
}: PlatformBadgeProps) {
  const normalized = platform?.toLowerCase() || "";

  const config = {
    instagram: {
      icon: "📸",
      label: "Instagram",
      classes: "bg-pink-100 text-pink-700 border-pink-200",
    },

    facebook: {
      icon: "📘",
      label: "Facebook",
      classes: "bg-blue-100 text-blue-700 border-blue-200",
    },

    linkedin: {
      icon: "💼",
      label: "LinkedIn",
      classes: "bg-sky-100 text-sky-700 border-sky-200",
    },
  };

  const current = config[normalized as keyof typeof config] || {
    icon: "🔗",
    label: platform || "Unknown",
    classes: "bg-gray-100 text-gray-700 border-gray-200",
  };

  const sizeClasses =
    size === "md" ? "px-3 py-1.5 text-sm" : "px-2 py-1 text-xs";

  return (
    <span
      className={`
        inline-flex
        items-center
        gap-1.5
        rounded-full
        border
        font-medium
        whitespace-nowrap
        ${sizeClasses}
        ${current.classes}
      `}
    >
      <span>{current.icon}</span>

      <span>{current.label}</span>
    </span>
  );
}
