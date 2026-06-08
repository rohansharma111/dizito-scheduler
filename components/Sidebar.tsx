export default function Sidebar() {
  return (
    <div className="w-64 bg-gray-900 text-white p-6">
      <h2 className="text-2xl font-bold mb-8">
        Dizito Social
      </h2>

      <ul className="space-y-4">
        <li>Dashboard</li>
        <li>Create Post</li>
        <li>Scheduled Posts</li>
        <li>Analytics</li>
        <li>Settings</li>
      </ul>
    </div>
  );
}