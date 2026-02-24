import { FiClock, FiTrash2 } from "react-icons/fi";

type SceneListItemProps = {
  id: string;
  title: string;
  updatedAt: string;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
};

export default function SceneListItem({
  id,
  title,
  updatedAt,
  onClick,
  onDelete,
}: SceneListItemProps) {
  const timeString = new Date(updatedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      onClick={onClick}
      className="group relative rounded-xl border border-white/[0.04] bg-[#1A1F29] p-3 shadow-sm transition-all duration-150 cursor-pointer hover:border-white/[0.12] hover:bg-[#1F2633]"
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col overflow-hidden">
          <span className="truncate text-xs font-semibold text-[#E6E8EB] mb-1 group-hover:text-white transition duration-150">
            {title}
          </span>
          <div className="flex items-center gap-1.5 text-[10px] text-[#6B7280]">
            <FiClock className="h-3 w-3" />
            <span>{timeString}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 transition duration-150 rounded-md p-1.5 text-[#9CA3AF] hover:bg-red-500/10 hover:text-red-400 focus:outline-none focus:ring-1 focus:ring-red-500"
          title="Delete scene"
        >
          <FiTrash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
