import {
  FaInstagram,
  FaFacebook,
  FaLinkedin,
  FaPinterest,
  FaLink,
} from "react-icons/fa";
import GoogleBusinessIcon from "@/components/icons/GoogleBusinessIcon";

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
      icon: FaInstagram,
      label: "Instagram",
      classes: "bg-pink-100 text-pink-700 border-pink-200",
    },

    facebook: {
      icon: FaFacebook,
      label: "Facebook",
      classes: "bg-blue-100 text-blue-700 border-blue-200",
    },

    pinterest: {
      icon: FaPinterest,
      label: "Pinterest",
      classes: "bg-red-100 text-red-700 border-red-200",
    },

    linkedin: {
      icon: FaLinkedin,
      label: "LinkedIn",
      classes: "bg-sky-100 text-sky-700 border-sky-200",
    },

    "google-business": {
      icon: GoogleBusinessIcon,
      label: "Google Business Profile",
      classes: "bg-green-100 text-green-700 border-green-200",
    },
  };

  const current = config[normalized as keyof typeof config] || {
    icon: FaLink,
    label: platform || "Unknown",
    classes: "bg-gray-100 text-gray-700 border-gray-200",
  };

  const sizeClasses =
    size === "md" ? "px-3 py-1.5 text-sm" : "px-2 py-1 text-xs";

  const Icon = current.icon;

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
      <Icon size={size === "md" ? 18 : 14} />
 
      <span>{current.label}</span>
    </span>
  );
}
