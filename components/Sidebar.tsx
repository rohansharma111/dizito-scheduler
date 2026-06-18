import Link from "next/link";
import LogoutButton from "./LogoutButton";
export default function Sidebar({
  user,
}: {
  user: {
    name?: string | null;
    email?: string | null;
  };
}) {
  return (
    <aside className="w-64 border-r bg-white p-4 flex flex-col">
      <div>
        <h1 className="text-2xl font-bold mb-8">Dizito</h1>

        <nav className="space-y-2">
          <Link
            className="block px-3 py-2 rounded hover:bg-gray-100"
            href="/dashboard"
          >
            Dashboard
          </Link>

          <Link
            className="block px-3 py-2 rounded hover:bg-gray-100"
            href="/posts"
          >
            Posts
          </Link>

          <Link
            className="block px-3 py-2 rounded hover:bg-gray-100"
            href="/drafts"
          >
            Drafts
          </Link>

          <Link
            className="block px-3 py-2 rounded hover:bg-gray-100"
            href="/accounts"
          >
            Accounts
          </Link>

          <Link
            className="block px-3 py-2 rounded hover:bg-gray-100"
            href="/settings"
          >
            Settings
          </Link>
        </nav>
      </div>

      <div className="mt-auto border-t pt-4">
        <div className="font-medium">{user.name}</div>

        <div className="text-sm text-gray-500">{user.email}</div>

        <LogoutButton />
      </div>
    </aside>
  );
}
