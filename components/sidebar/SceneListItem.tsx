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
      className="group relative rounded-xl border border-transparent bg-surface-2 p-3 shadow-sm transition-all duration-150 cursor-pointer hover:border-border-subtle hover:bg-surface-3"
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col overflow-hidden">
          <span className="truncate text-xs font-semibold text-txt-secondary mb-1 group-hover:text-txt-primary transition duration-150">
            {title}
          </span>
          <div className="flex items-center gap-1.5 text-[10px] text-txt-muted">
            <FiClock className="h-3 w-3" />
            <span>{timeString}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 transition duration-150 rounded-md p-1.5 text-txt-secondary hover:bg-red-500/10 hover:text-red-400 focus:outline-none focus:ring-1 focus:ring-red-500"
          title="Delete scene"
        >
          <FiTrash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
