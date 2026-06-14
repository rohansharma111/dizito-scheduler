export default function StatsCards({ stats }: any) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="bg-white shadow rounded p-4">
        <h3 className="font-bold">Scheduled</h3>

        <p className="text-3xl">{stats.scheduled}</p>
      </div>

      <div className="bg-white shadow rounded p-4">
        <h3 className="font-bold">Published</h3>

        <p className="text-3xl">{stats.published}</p>
      </div>

      <div className="bg-white shadow rounded p-4">
        <h3 className="font-bold">Failed</h3>

        <p className="text-3xl">{stats.failed}</p>
      </div>

      <div className="bg-white shadow rounded p-4">
        <h3 className="font-bold">Drafts</h3>

        <p className="text-3xl">{stats.draft}</p>
      </div>
      
      <div className="bg-white shadow rounded p-4">
        <h3 className="font-bold">Accounts</h3>

        <p className="text-3xl">{stats.accounts}</p>
      </div>
    </div>
  );
}
