"use client";

import { getEventIcon } from "@/lib/eventIcons";
import { getEventTitle } from "@/lib/eventFormatter";
import { getEventDescription } from "@/lib/eventDescription";

type EventDetailsModalProps = {
  event: any | null;
  onClose: () => void;
};

export default function EventDetailsModal({
  event,
  onClose,
}: EventDetailsModalProps) {
  if (!event) return null;

  const payload = event.payload || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{getEventIcon(event.event_type)}</span>

            <div>
              <h2 className="text-xl font-bold">{getEventTitle(event)}</h2>

              <p className="text-sm text-gray-500">
                {new Date(event.created_at).toLocaleString()}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="rounded p-2 hover:bg-gray-100">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="space-y-6 p-6">
          {/* Description */}
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase text-gray-500">
              Description
            </h3>

            <div className="rounded-lg border bg-gray-50 p-4">
              {getEventDescription(event) || "No description"}
            </div>
          </div>

          {/* Event Information */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase text-gray-500">
              Event Information
            </h3>

            <div className="overflow-hidden rounded-lg border">
              <table className="w-full">
                <tbody>
                  <Row label="Event Type" value={event.event_type} />

                  <Row label="Entity Type" value={event.entity_type} />

                  <Row label="Entity ID" value={event.entity_id} />

                  <Row label="User ID" value={event.user_id} />

                  <Row
                    label="Created At"
                    value={new Date(event.created_at).toLocaleString()}
                  />
                </tbody>
              </table>
            </div>
          </div>

          {/* Payload */}
          {Object.keys(payload).length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase text-gray-500">
                Event Data
              </h3>

              <div className="rounded-lg border bg-gray-900 p-4">
                <pre className="overflow-auto text-sm text-green-400">
                  {JSON.stringify(payload, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t p-4">
          <button
            onClick={onClose}
            className="rounded bg-gray-800 px-4 py-2 text-white hover:bg-black"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <tr className="border-b last:border-b-0">
      <td className="w-40 bg-gray-50 px-4 py-3 font-medium">{label}</td>

      <td className="px-4 py-3">{value?.toString() || "-"}</td>
    </tr>
  );
}
