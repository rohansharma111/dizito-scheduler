import SidebarClient from "./SidebarClient";

export default function Sidebar({
  user,
  mobileOpen,
  onClose,
}: {
  user: {
    name?: string | null;
    email?: string | null;
  };
  mobileOpen?: boolean;
  onClose?: () => void;
}) {
  return (
    <SidebarClient user={user} mobileOpen={mobileOpen} onClose={onClose} />
  );
}
