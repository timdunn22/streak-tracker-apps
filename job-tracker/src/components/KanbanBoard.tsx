import { useMemo } from "react";
import { Job, JobStatus, STATUS_ORDER } from "../types";
import KanbanColumn from "./KanbanColumn";

interface Props {
  jobs: Job[];
  onStatusChange: (id: string, status: JobStatus) => void;
  onFollowUp: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function KanbanBoard({ jobs, onStatusChange, onFollowUp, onDelete }: Props) {
  const columns = useMemo(() => {
    const grouped: Record<JobStatus, Job[]> = {
      wishlist: [],
      applied: [],
      phone_screen: [],
      interview: [],
      offer: [],
      rejected: [],
    };
    for (const job of jobs) {
      grouped[job.status].push(job);
    }
    // Sort each column by dateApplied descending (newest first)
    for (const status of STATUS_ORDER) {
      grouped[status].sort((a, b) => b.dateApplied.localeCompare(a.dateApplied));
    }
    return grouped;
  }, [jobs]);

  const handleDragStart = (e: React.DragEvent, jobId: string) => {
    e.dataTransfer.setData("text/plain", jobId);
    e.dataTransfer.effectAllowed = "move";
    // Add a slight visual effect
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5";
      setTimeout(() => {
        if (e.currentTarget instanceof HTMLElement) {
          e.currentTarget.style.opacity = "1";
        }
      }, 0);
    }
  };

  const handleDrop = (jobId: string, status: JobStatus) => {
    onStatusChange(jobId, status);
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 px-4 md:px-6 snap-x snap-mandatory md:snap-none">
      {STATUS_ORDER.map((status) => (
        <KanbanColumn
          key={status}
          status={status}
          jobs={columns[status]}
          onStatusChange={onStatusChange}
          onFollowUp={onFollowUp}
          onDelete={onDelete}
          onDragStart={handleDragStart}
          onDrop={handleDrop}
        />
      ))}
    </div>
  );
}
