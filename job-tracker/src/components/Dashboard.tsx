import { useMemo } from "react";
import { Job, JobStatus, STATUS_LABELS, STATUS_ORDER, SOURCE_LABELS, JobSource } from "../types";
import { daysSince, startOfWeek, startOfMonth } from "../utils";

interface Props {
  jobs: Job[];
}

const STATUS_COLORS: Record<JobStatus, string> = {
  wishlist: "#a855f7",
  applied: "#3b82f6",
  phone_screen: "#06b6d4",
  interview: "#f59e0b",
  offer: "#10b981",
  rejected: "#ef4444",
};

export default function Dashboard({ jobs }: Props) {
  const stats = useMemo(() => {
    const total = jobs.length;
    const byStatus: Record<JobStatus, number> = {
      wishlist: 0,
      applied: 0,
      phone_screen: 0,
      interview: 0,
      offer: 0,
      rejected: 0,
    };

    const bySource: Record<string, number> = {};
    let totalDaysToResponse = 0;
    let respondedCount = 0;

    const weekStart = startOfWeek();
    const monthStart = startOfMonth();
    let thisWeek = 0;
    let thisMonth = 0;

    for (const job of jobs) {
      byStatus[job.status]++;

      if (job.source) {
        bySource[job.source] = (bySource[job.source] || 0) + 1;
      }

      // Response tracking: anything beyond "applied" counts as a response
      if (job.status !== "wishlist" && job.status !== "applied") {
        const days = daysSince(job.dateApplied);
        totalDaysToResponse += days;
        respondedCount++;
      }

      // Time-based counts
      const appliedDate = new Date(job.dateApplied + "T00:00:00");
      if (appliedDate >= weekStart) thisWeek++;
      if (appliedDate >= monthStart) thisMonth++;
    }

    // Exclude wishlist from response rate calculation
    const activeApps = total - byStatus.wishlist;
    const responseRate = activeApps > 0 ? ((respondedCount / activeApps) * 100) : 0;
    const avgDays = respondedCount > 0 ? Math.round(totalDaysToResponse / respondedCount) : 0;

    // Interview to offer ratio
    const interviewStages = byStatus.phone_screen + byStatus.interview + byStatus.offer;
    const interviewToOffer = interviewStages > 0 ? ((byStatus.offer / interviewStages) * 100) : 0;

    return {
      total,
      byStatus,
      bySource,
      responseRate,
      avgDays,
      thisWeek,
      thisMonth,
      interviewToOffer,
      activeApps,
      respondedCount,
    };
  }, [jobs]);

  // Max count for bar scaling
  const maxStatusCount = Math.max(1, ...Object.values(stats.byStatus));
  const maxSourceCount = Math.max(1, ...Object.values(stats.bySource));

  return (
    <div className="px-4 md:px-6 space-y-6 pb-8">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Total Apps" value={String(stats.total)} accent="text-blue-400" />
        <StatCard
          label="Response Rate"
          value={`${stats.responseRate.toFixed(0)}%`}
          accent="text-cyan-400"
          sub={`${stats.respondedCount} of ${stats.activeApps}`}
        />
        <StatCard
          label="Avg Days to Hear Back"
          value={stats.avgDays > 0 ? `${stats.avgDays}d` : "—"}
          accent="text-purple-400"
        />
        <StatCard label="This Week" value={String(stats.thisWeek)} accent="text-emerald-400" />
        <StatCard label="This Month" value={String(stats.thisMonth)} accent="text-amber-400" />
        <StatCard
          label="Interview → Offer"
          value={`${stats.interviewToOffer.toFixed(0)}%`}
          accent="text-green-400"
          sub={`${stats.byStatus.offer} offers`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status breakdown */}
        <div className="bg-[#12121a] rounded-xl border border-white/5 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Status Breakdown</h3>
          <div className="space-y-3">
            {STATUS_ORDER.map((status) => {
              const count = stats.byStatus[status];
              const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
              return (
                <div key={status}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400">{STATUS_LABELS[status]}</span>
                    <span className="text-xs text-gray-500">
                      {count} ({pct.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${(count / maxStatusCount) * 100}%`,
                        backgroundColor: STATUS_COLORS[status],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Source breakdown */}
        <div className="bg-[#12121a] rounded-xl border border-white/5 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Applications by Source</h3>
          {Object.keys(stats.bySource).length === 0 ? (
            <p className="text-sm text-gray-600 py-8 text-center">No source data yet</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(stats.bySource)
                .sort((a, b) => b[1] - a[1])
                .map(([source, count]) => {
                  const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                  return (
                    <div key={source}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400">
                          {SOURCE_LABELS[source as JobSource] || source}
                        </span>
                        <span className="text-xs text-gray-500">
                          {count} ({pct.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-500 transition-all duration-700 ease-out"
                          style={{ width: `${(count / maxSourceCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Pipeline funnel */}
      <div className="bg-[#12121a] rounded-xl border border-white/5 p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Application Pipeline</h3>
        <div className="flex items-end gap-2 h-48">
          {STATUS_ORDER.filter((s) => s !== "rejected").map((status) => {
            const count = stats.byStatus[status];
            const maxFunnel = Math.max(1, ...STATUS_ORDER.filter((s) => s !== "rejected").map((s) => stats.byStatus[s]));
            const heightPct = maxFunnel > 0 ? (count / maxFunnel) * 100 : 0;
            return (
              <div key={status} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-xs font-semibold text-white">{count}</span>
                <div className="w-full bg-white/5 rounded-t-md flex-1 relative overflow-hidden">
                  <div
                    className="absolute bottom-0 w-full rounded-t-md transition-all duration-700 ease-out"
                    style={{
                      height: `${Math.max(heightPct, 2)}%`,
                      backgroundColor: STATUS_COLORS[status],
                      opacity: 0.8,
                    }}
                  />
                </div>
                <span className="text-[10px] text-gray-500 text-center leading-tight">
                  {STATUS_LABELS[status]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent, sub }: { label: string; value: string; accent: string; sub?: string }) {
  return (
    <div className="bg-[#12121a] rounded-xl border border-white/5 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent}`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-600 mt-0.5">{sub}</p>}
    </div>
  );
}
