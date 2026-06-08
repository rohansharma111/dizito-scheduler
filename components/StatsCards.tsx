export default function StatsCards({ posts }: any) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-white shadow rounded p-4">
        <h3 className="font-bold">Total Posts</h3>
        <p className="text-3xl">{posts.length}</p>{" "}
      </div>

      <div className="bg-white shadow rounded p-4">
        <h3 className="font-bold">Scheduled</h3>

        <p className="text-3xl">{posts.length}</p>
      </div>

      <div className="bg-white shadow rounded p-4">
        <h3 className="font-bold">Published</h3>

        <p className="text-3xl">0</p>
      </div>
    </div>
  );
}
