import { useState, useRef } from "react";
import { Job, JobStatus, STATUS_LABELS, STATUS_ORDER, SOURCE_LABELS } from "../types";
import { daysSince, formatDate, formatSalary, urgencyColor, urgencyDot, needsFollowUp } from "../utils";

interface Props {
  job: Job;
  onStatusChange: (id: string, status: JobStatus) => void;
  onFollowUp: (id: string) => void;
  onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent, jobId: string) => void;
}

export default function JobCard({ job, onStatusChange, onFollowUp, onDelete, onDragStart }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const days = daysSince(job.dateApplied);
  const followUp = needsFollowUp(job);
  const borderClass = urgencyColor(job.dateApplied, job.status);
  const dotClass = urgencyDot(job.dateApplied, job.status);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, job.id)}
      onClick={() => setExpanded(!expanded)}
      className={`relative bg-[#12121a] rounded-lg p-3 cursor-grab active:cursor-grabbing border transition-all duration-200 hover:bg-[#1a1a28] hover:scale-[1.01] group ${borderClass || "border-white/5"}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-white truncate">{job.company}</h3>
          <p className="text-xs text-gray-400 truncate">{job.role}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {dotClass && <span className={`w-2 h-2 rounded-full ${dotClass}`} />}
          <div className="relative" ref={menuRef}>
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
              className="text-gray-500 hover:text-gray-300 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="More options"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
            {showMenu && (
              <div className="absolute right-0 top-6 z-50 bg-[#1e1e2e] border border-white/10 rounded-lg shadow-xl py-1 min-w-[140px]">
                {STATUS_ORDER.filter((s) => s !== job.status).map((s) => (
                  <button
                    key={s}
                    onClick={(e) => { e.stopPropagation(); onStatusChange(job.id, s); setShowMenu(false); }}
                    className="block w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    Move to {STATUS_LABELS[s]}
                  </button>
                ))}
                <div className="border-t border-white/10 my-1" />
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(job.id); setShowMenu(false); }}
                  className="block w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-500">
        <span>{formatDate(job.dateApplied)}</span>
        <span className="text-gray-600">•</span>
        <span>{days}d ago</span>
        {job.source && (
          <>
            <span className="text-gray-600">•</span>
            <span>{SOURCE_LABELS[job.source]}</span>
          </>
        )}
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5 mt-2">
        {followUp && (
          <button
            onClick={(e) => { e.stopPropagation(); onFollowUp(job.id); }}
            className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Follow Up
          </button>
        )}
        {job.followedUp && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
            Followed Up
          </span>
        )}
        {job.locationType && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
            {job.locationType === "remote" ? "Remote" : job.locationType === "hybrid" ? "Hybrid" : "On-site"}
          </span>
        )}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-white/5 space-y-1.5 text-xs text-gray-400">
          {formatSalary(job.salaryMin, job.salaryMax) && (
            <p className="flex items-center gap-1.5">
              <span className="text-gray-500">Salary:</span>
              <span className="text-emerald-400 font-medium">{formatSalary(job.salaryMin, job.salaryMax)}</span>
            </p>
          )}
          {job.location && (
            <p><span className="text-gray-500">Location:</span> {job.location}</p>
          )}
          {job.contactPerson && (
            <p><span className="text-gray-500">Contact:</span> {job.contactPerson} {job.contactEmail && `(${job.contactEmail})`}</p>
          )}
          {job.jobUrl && (
            <a
              href={job.jobUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-blue-400 hover:text-blue-300 underline inline-block"
            >
              View Job Posting
            </a>
          )}
          {job.notes && (
            <p className="text-gray-500 italic mt-1">{job.notes}</p>
          )}
        </div>
      )}
    </div>
  );
}
