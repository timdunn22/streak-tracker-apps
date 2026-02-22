import { useState } from "react";
import { Job, JobStatus, STATUS_LABELS } from "../types";
import JobCard from "./JobCard";

interface Props {
  status: JobStatus;
  jobs: Job[];
  onStatusChange: (id: string, status: JobStatus) => void;
  onFollowUp: (id: string) => void;
  onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent, jobId: string) => void;
  onDrop: (jobId: string, status: JobStatus) => void;
}

const STATUS_COLORS: Record<JobStatus, string> = {
  wishlist: "bg-purple-500",
  applied: "bg-blue-500",
  phone_screen: "bg-cyan-500",
  interview: "bg-amber-500",
  offer: "bg-emerald-500",
  rejected: "bg-red-500",
};

const STATUS_ACCENT: Record<JobStatus, string> = {
  wishlist: "text-purple-400",
  applied: "text-blue-400",
  phone_screen: "text-cyan-400",
  interview: "text-amber-400",
  offer: "text-emerald-400",
  rejected: "text-red-400",
};

export default function KanbanColumn({ status, jobs, onStatusChange, onFollowUp, onDelete, onDragStart, onDrop }: Props) {
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const jobId = e.dataTransfer.getData("text/plain");
    if (jobId) {
      onDrop(jobId, status);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col min-w-[280px] w-[280px] shrink-0 rounded-xl transition-colors duration-200 ${
        dragOver ? "bg-white/[0.03] ring-1 ring-blue-500/30" : "bg-transparent"
      }`}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 py-3 sticky top-0 z-10">
        <span className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[status]}`} />
        <h2 className={`text-sm font-semibold ${STATUS_ACCENT[status]}`}>
          {STATUS_LABELS[status]}
        </h2>
        <span className="text-xs text-gray-500 bg-white/5 rounded-full px-2 py-0.5 ml-auto font-medium">
          {jobs.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 px-1.5 pb-4 flex-1 overflow-y-auto min-h-[100px]">
        {jobs.length === 0 && (
          <div className="flex items-center justify-center h-20 border border-dashed border-white/10 rounded-lg text-gray-600 text-xs">
            Drop here
          </div>
        )}
        {jobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            onStatusChange={onStatusChange}
            onFollowUp={onFollowUp}
            onDelete={onDelete}
            onDragStart={onDragStart}
          />
        ))}
      </div>
    </div>
  );
}
