import MediaCard from "./MediaCard";
import { MediaItem } from "@/types/media";

interface MediaGridProps {
  media: MediaItem[];
  onDelete: (id: number) => void;
}

export default function MediaGrid({ media, onDelete }: MediaGridProps) {
  return (
    <div
      className="
        grid
        grid-cols-1
        gap-6
        sm:grid-cols-2
        lg:grid-cols-3
        xl:grid-cols-4
      "
    >
      {media.map((item) => (
        <MediaCard key={item.id} media={item} onDelete={onDelete} />
      ))}
    </div>
  );
}
