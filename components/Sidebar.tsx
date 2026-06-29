import SidebarClient from "./SidebarClient";

export default function Sidebar({
  user,
}: {
  user: {
    name?: string | null;
    email?: string | null;
  };
}) {
  return <SidebarClient user={user} />;
}
