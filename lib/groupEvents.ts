import {
  ActivityEvent,
  ActivityGroup,
} from "@/types/activity";

export type GroupedEvents = {
  label: string;
  events: ActivityEvent[];
}[];

/*
  Returns:

  [
    {
      label: "Today",
      events: [...]
    },
    {
      label: "Yesterday",
      events: [...]
    },
    {
      label: "July 5, 2026",
      events: [...]
    }
  ]
*/

export function groupEvents(events: ActivityEvent[]): GroupedEvents {
  const groups: Record<string, ActivityEvent[]> = {};

  const now = new Date();

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const yesterday = new Date(today);

  yesterday.setDate(yesterday.getDate() - 1);

  for (const event of events) {
    const date = new Date(event.created_at);

    const eventDay = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );

    let label = "";

    if (eventDay.getTime() === today.getTime()) {
      label = "Today";
    } else if (eventDay.getTime() === yesterday.getTime()) {
      label = "Yesterday";
    } else {
      label = date.toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }

    if (!groups[label]) {
      groups[label] = [];
    }

    groups[label].push(event);
  }

  const orderedLabels = Object.keys(groups).sort((a, b) => {
    const getDate = (label: string) => {
      if (label === "Today") return today;

      if (label === "Yesterday") return yesterday;

      return new Date(label);
    };

    return getDate(b).getTime() - getDate(a).getTime();
  });

  return orderedLabels.map((label) => ({
    label,
    events: groups[label],
  }));
}
