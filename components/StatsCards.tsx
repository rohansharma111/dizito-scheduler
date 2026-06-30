import {
  CalendarClock,
  CheckCircle,
  XCircle,
  Link2,
  TrendingUp,
} from "lucide-react";

export default function StatsCards({ stats }: any) {
  const successRate =
    stats.published + stats.failed > 0
      ? Math.round((stats.published / (stats.published + stats.failed)) * 100)
      : 100;

  const cards = [
    {
      title: "Scheduled",
      value: stats.scheduled,
      icon: CalendarClock,
      valueClass: "text-gray-900",
    },
    {
      title: "Published",
      value: stats.published,
      icon: CheckCircle,
      valueClass: "text-green-600",
    },
    {
      title: "Failed",
      value: stats.failed,
      icon: XCircle,
      valueClass: "text-red-600",
    },
    {
      title: "Accounts",
      value: stats.accounts,
      icon: Link2,
      valueClass: "text-gray-900",
    },
    {
      title: "Success Rate",
      value: `${successRate}%`,
      icon: TrendingUp,
      valueClass: "text-green-600",
    },
  ];

  return (
    <div
      className="
        grid
        grid-cols-2
        md:grid-cols-3
        xl:grid-cols-5
        gap-4
      "
    >
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.title}
            className="
                bg-white
                border
                rounded-xl
                p-4
                md:p-5
                shadow-sm
                hover:shadow-md
                hover:scale-[1.02]
                active:scale-[0.98]
                transition-all
                cursor-pointer
              "
          >
            <div
              className="
                  flex
                  items-center
                  justify-between
                  mb-3
                "
            >
              <h3
                className="
                    text-xs
                    md:text-sm
                    font-medium
                    text-gray-500
                  "
              >
                {card.title}
              </h3>

              <Icon
                className="
                    h-4
                    w-4
                    md:h-5
                    md:w-5
                    text-gray-400
                  "
              />
            </div>

            <p
              className={`
                  text-2xl
                  md:text-3xl
                  font-bold
                  ${card.valueClass}
                `}
            >
              {card.value}
            </p>
          </div>
        );
      })}
    </div>
  );
}
