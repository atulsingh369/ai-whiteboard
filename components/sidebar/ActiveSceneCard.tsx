import { FiClock, FiCheckCircle } from "react-icons/fi";

type ActiveSceneCardProps = {
  title: string;
  updatedAt: string;
};

export default function ActiveSceneCard({
  title,
  updatedAt,
}: ActiveSceneCardProps) {
  const timeString = new Date(updatedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#1A1F29] p-3 shadow-md outline outline-1 outline-white/[0.02]">
      {/* Accent left border highlight */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#3B82F6]" />

      <div className="flex flex-col ml-1.5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[9px] uppercase tracking-widest font-bold text-[#3B82F6] flex items-center gap-1">
            <FiCheckCircle className="h-3 w-3" />
            Currently Editing
          </span>
          <span className="text-[10px] font-medium text-[#9CA3AF] bg-[#0F1115] border border-white/[0.06] px-1.5 py-0.5 rounded-md">
            Loaded
          </span>
        </div>

        <h3 className="text-sm font-bold text-[#E6E8EB] truncate mt-0.5">
          {title}
        </h3>

        <div className="flex items-center gap-1.5 mt-2.5 text-[10px] text-[#9CA3AF]">
          <FiClock className="h-3 w-3" />
          <span>Last active {timeString}</span>
        </div>
      </div>
    </div>
  );
}
