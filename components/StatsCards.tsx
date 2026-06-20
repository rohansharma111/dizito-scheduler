export default function StatsCards({
  stats,
}: any) {

  const successRate =
    stats.published + stats.failed > 0
      ? Math.round(
          (stats.published /
            (stats.published +
              stats.failed)) *
            100
        )
      : 100;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">

      <div className="bg-white shadow rounded p-4">
        <h3 className="font-bold text-gray-600">
          Scheduled
        </h3>

        <p className="text-3xl font-bold">
          {stats.scheduled}
        </p>
      </div>

      <div className="bg-white shadow rounded p-4">
        <h3 className="font-bold text-gray-600">
          Published
        </h3>

        <p className="text-3xl font-bold text-green-600">
          {stats.published}
        </p>
      </div>

      <div className="bg-white shadow rounded p-4">
        <h3 className="font-bold text-gray-600">
          Failed
        </h3>

        <p className="text-3xl font-bold text-red-600">
          {stats.failed}
        </p>
      </div>

      <div className="bg-white shadow rounded p-4">
        <h3 className="font-bold text-gray-600">
          Accounts
        </h3>

        <p className="text-3xl font-bold">
          {stats.accounts}
        </p>
      </div>

      <div className="bg-white shadow rounded p-4">
        <h3 className="font-bold text-gray-600">
          Success Rate
        </h3>

        <p className="text-3xl font-bold text-green-600">
          {stats.successRate}%
        </p>
      </div>

    </div>
  );
}