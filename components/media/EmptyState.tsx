import { ImageIcon } from "lucide-react";

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 py-20 px-6 text-center">
      <div className="mb-6 rounded-full bg-white p-5 shadow">
        <ImageIcon className="h-12 w-12 text-gray-400" />
      </div>

      <h2 className="text-2xl font-semibold text-gray-900">
        No media uploaded yet
      </h2>

      <p className="mt-3 max-w-md text-gray-500">
        Upload your first image or video to start building your media library.
      </p>

      <p className="mt-2 text-sm text-gray-400">
        Supported formats: JPG, PNG, WebP, GIF, MP4 and more.
      </p>
    </div>
  );
}
