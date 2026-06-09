import Link from "next/link";

export default function AccountsPage() {
  return (
    <div className="p-8">

      <h1 className="text-3xl font-bold">
        Connected Accounts
      </h1>

      <Link
        href="/api/meta/login"
        className="inline-block mt-6 bg-blue-600 text-white px-6 py-3 rounded"
      >
        Connect Instagram Account
      </Link>

    </div>
  );
}