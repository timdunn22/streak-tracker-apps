import { useState, useMemo } from "react";
import {
  Job,
  JobStatus,
  JobSource,
  STATUS_LABELS,
  STATUS_ORDER,
  SOURCE_LABELS,
  SortField,
  SortDirection,
} from "../types";
import { daysSince, formatDate, formatSalary } from "../utils";
import SearchFilter from "./SearchFilter";

interface Props {
  jobs: Job[];
  onStatusChange: (id: string, status: JobStatus) => void;
  onFollowUp: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function ListView({ jobs, onStatusChange, onFollowUp, onDelete }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<JobStatus | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<JobSource | "all">("all");
  const [sortField, setSortField] = useState<SortField>("dateApplied");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");

  const filtered = useMemo(() => {
    let result = [...jobs];

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (j) =>
          j.company.toLowerCase().includes(q) ||
          j.role.toLowerCase().includes(q) ||
          (j.notes && j.notes.toLowerCase().includes(q)) ||
          (j.location && j.location.toLowerCase().includes(q)) ||
          (j.contactPerson && j.contactPerson.toLowerCase().includes(q))
      );
    }

    // Filters
    if (statusFilter !== "all") {
      result = result.filter((j) => j.status === statusFilter);
    }
    if (sourceFilter !== "all") {
      result = result.filter((j) => j.source === sourceFilter);
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "company":
          cmp = a.company.localeCompare(b.company);
          break;
        case "role":
          cmp = a.role.localeCompare(b.role);
          break;
        case "status":
          cmp = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
          break;
        case "dateApplied":
          cmp = a.dateApplied.localeCompare(b.dateApplied);
          break;
        case "daysWaiting":
          cmp = daysSince(a.dateApplied) - daysSince(b.dateApplied);
          break;
        case "salary":
          cmp = (a.salaryMin || 0) - (b.salaryMin || 0);
          break;
        case "source":
          cmp = (a.source || "").localeCompare(b.source || "");
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [jobs, searchQuery, statusFilter, sourceFilter, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg className="w-3 h-3 opacity-30" fill="currentColor" viewBox="0 0 20 20">
          <path d="M5 8l5-5 5 5H5zm0 4l5 5 5-5H5z" />
        </svg>
      );
    }
    return sortDir === "asc" ? (
      <svg className="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
        <path d="M5 12l5-5 5 5H5z" />
      </svg>
    ) : (
      <svg className="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
        <path d="M5 8l5 5 5-5H5z" />
      </svg>
    );
  };

  const thClass =
    "px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-300 transition-colors whitespace-nowrap";

  return (
    <div>
      <SearchFilter
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        sourceFilter={sourceFilter}
        onSourceFilterChange={setSourceFilter}
      />

      <div className="px-4 md:px-6">
        <div className="overflow-x-auto rounded-xl border border-white/5">
          <table className="w-full min-w-[800px]">
            <thead className="bg-[#0c0c14]">
              <tr>
                <th className={thClass} onClick={() => toggleSort("company")}>
                  <span className="flex items-center gap-1">Company <SortIcon field="company" /></span>
                </th>
                <th className={thClass} onClick={() => toggleSort("role")}>
                  <span className="flex items-center gap-1">Role <SortIcon field="role" /></span>
                </th>
                <th className={thClass} onClick={() => toggleSort("status")}>
                  <span className="flex items-center gap-1">Status <SortIcon field="status" /></span>
                </th>
                <th className={thClass} onClick={() => toggleSort("dateApplied")}>
                  <span className="flex items-center gap-1">Applied <SortIcon field="dateApplied" /></span>
                </th>
                <th className={thClass} onClick={() => toggleSort("daysWaiting")}>
                  <span className="flex items-center gap-1">Days <SortIcon field="daysWaiting" /></span>
                </th>
                <th className={thClass} onClick={() => toggleSort("salary")}>
                  <span className="flex items-center gap-1">Salary <SortIcon field="salary" /></span>
                </th>
                <th className={thClass} onClick={() => toggleSort("source")}>
                  <span className="flex items-center gap-1">Source <SortIcon field="source" /></span>
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-600 text-sm">
                    {jobs.length === 0 ? "No applications yet. Add your first one!" : "No matching applications found."}
                  </td>
                </tr>
              )}
              {filtered.map((job) => {
                const days = daysSince(job.dateApplied);
                const urgent =
                  job.status !== "offer" &&
                  job.status !== "rejected" &&
                  job.status !== "wishlist";
                const dayColor = urgent
                  ? days > 14
                    ? "text-red-400"
                    : days > 7
                    ? "text-yellow-400"
                    : "text-emerald-400"
                  : "text-gray-500";

                return (
                  <tr key={job.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white font-medium">{job.company}</span>
                        {!job.followedUp && urgent && days >= 7 && (
                          <button
                            onClick={() => onFollowUp(job.id)}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition-colors"
                          >
                            Follow Up
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-400">{job.role}</td>
                    <td className="px-3 py-3">
                      <select
                        value={job.status}
                        onChange={(e) => onStatusChange(job.id, e.target.value as JobStatus)}
                        className="bg-transparent border border-white/10 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-blue-500/50 cursor-pointer"
                      >
                        {STATUS_ORDER.map((s) => (
                          <option key={s} value={s} className="bg-[#12121a]">{STATUS_LABELS[s]}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-500 whitespace-nowrap">{formatDate(job.dateApplied)}</td>
                    <td className={`px-3 py-3 text-sm font-medium whitespace-nowrap ${dayColor}`}>{days}d</td>
                    <td className="px-3 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {formatSalary(job.salaryMin, job.salaryMax) || "—"}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-500">
                      {job.source ? SOURCE_LABELS[job.source] : "—"}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        onClick={() => onDelete(job.id)}
                        className="text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-1"
                        aria-label="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-600 mt-2 px-1">
          Showing {filtered.length} of {jobs.length} applications
        </p>
      </div>
    </div>
  );
}
