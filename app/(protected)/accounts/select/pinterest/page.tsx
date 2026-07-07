"use client";

import { useEffect, useState } from "react";

type PinterestBoard = {
  id: string;
  name: string;
  description?: string;
  privacy?: string;
};

export default function PinterestBoardSelectionPage() {
  const [boards, setBoards] = useState<PinterestBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/pinterest/boards");

        const data = await response.json();

        setBoards(data || []);

        const initial: Record<string, boolean> = {};

        for (const board of data || []) {
          initial[board.id] = false;
        }

        setSelected(initial);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  function selectedCount() {
    return Object.values(selected).filter(Boolean).length;
  }

  async function connectBoards() {
    const selectedBoards = boards
      .filter((board) => selected[board.id])
      .map((board) => ({
        boardId: board.id,
        boardName: board.name,
      }));

    if (selectedBoards.length === 0) {
      alert("Please select at least one board");

      return;
    }

    try {
      setConnecting(true);

      const response = await fetch("/api/pinterest/connect", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          boards: selectedBoards,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        window.location.href = data.redirect || "/accounts";
      } else {
        alert(data.error || "Failed to connect Pinterest boards");
      }
    } catch (error) {
      console.error(error);

      alert("Failed to connect Pinterest boards");
    } finally {
      setConnecting(false);
    }
  }

  if (loading) {
    return <div className="p-8">Loading Pinterest boards...</div>;
  }

  if (boards.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="border rounded-xl bg-white p-10 text-center">
          <div className="text-5xl mb-4">📌</div>

          <h1 className="text-2xl font-bold">No Pinterest Boards Found</h1>

          <p className="text-gray-500 mt-3">
            Create a board in Pinterest first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2">Select Pinterest Boards</h1>

      <p className="text-gray-500 mb-8">
        Choose which Pinterest boards to connect.
      </p>

      <div className="space-y-4">
        {boards.map((board) => (
          <div key={board.id} className="border rounded-lg p-5 bg-white">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-semibold text-lg">📌 {board.name}</div>

                {board.description && (
                  <div className="text-gray-500 mt-2">{board.description}</div>
                )}

                <div className="text-sm text-gray-400 mt-2">
                  {board.privacy || "PUBLIC"}
                </div>
              </div>

              <input
                type="checkbox"
                checked={selected[board.id] || false}
                onChange={(e) =>
                  setSelected((prev) => ({
                    ...prev,
                    [board.id]: e.target.checked,
                  }))
                }
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center gap-4">
        <button
          disabled={connecting}
          onClick={connectBoards}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg"
        >
          {connecting
            ? "Connecting..."
            : `Connect Selected (${selectedCount()})`}
        </button>

        <div className="text-gray-500">
          Selected: {selectedCount()} board(s)
        </div>
      </div>
    </div>
  );
}
