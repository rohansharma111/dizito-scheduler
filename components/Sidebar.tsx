import SidebarClient from "./SidebarClient";

export default function Sidebar({
  user,
  plan,
  mobileOpen,
  onClose,
}: {
  user: {
    name?: string | null;
    email?: string | null;
  };
  plan: string;
  mobileOpen?: boolean;
  onClose?: () => void;
}) {
  return (
    <SidebarClient
      user={user}
      plan={plan}
      mobileOpen={mobileOpen}
      onClose={onClose}
    />
  );
}
