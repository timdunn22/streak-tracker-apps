import { JobStatus, JobSource, STATUS_LABELS, STATUS_ORDER, SOURCE_LABELS } from "../types";

interface Props {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: JobStatus | "all";
  onStatusFilterChange: (status: JobStatus | "all") => void;
  sourceFilter: JobSource | "all";
  onSourceFilterChange: (source: JobSource | "all") => void;
}

export default function SearchFilter({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sourceFilter,
  onSourceFilterChange,
}: Props) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 px-4 md:px-6 mb-4">
      {/* Search */}
      <div className="relative flex-1">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search company, role, notes..."
          className="w-full bg-[#12121a] border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Status filter */}
      <select
        value={statusFilter}
        onChange={(e) => onStatusFilterChange(e.target.value as JobStatus | "all")}
        className="bg-[#12121a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-colors"
      >
        <option value="all">All Statuses</option>
        {STATUS_ORDER.map((s) => (
          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
        ))}
      </select>

      {/* Source filter */}
      <select
        value={sourceFilter}
        onChange={(e) => onSourceFilterChange(e.target.value as JobSource | "all")}
        className="bg-[#12121a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-colors"
      >
        <option value="all">All Sources</option>
        {(Object.entries(SOURCE_LABELS) as [JobSource, string][]).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>
    </div>
  );
}
