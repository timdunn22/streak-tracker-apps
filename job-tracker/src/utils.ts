import { Job, JobStatus, STATUS_LABELS, SOURCE_LABELS, LOCATION_LABELS } from "./types";

// ─── Date Helpers ───────────────────────────────────────────────────

export function daysSince(dateStr: string): number {
  const date = new Date(dateStr + "T00:00:00");
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = today.getTime() - date.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function isWithinDays(dateStr: string, days: number): boolean {
  return daysSince(dateStr) <= days;
}

export function startOfWeek(): Date {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

export function startOfMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

// ─── Urgency Colors ─────────────────────────────────────────────────

export function urgencyColor(dateApplied: string, status: JobStatus): string {
  if (status === "offer" || status === "rejected" || status === "wishlist") return "";
  const days = daysSince(dateApplied);
  if (days > 14) return "border-red-500/50";
  if (days > 7) return "border-yellow-500/50";
  return "border-emerald-500/50";
}

export function urgencyDot(dateApplied: string, status: JobStatus): string {
  if (status === "offer" || status === "rejected" || status === "wishlist") return "";
  const days = daysSince(dateApplied);
  if (days > 14) return "bg-red-500";
  if (days > 7) return "bg-yellow-500";
  return "bg-emerald-500";
}

export function needsFollowUp(job: Job): boolean {
  if (job.followedUp) return false;
  if (job.status === "offer" || job.status === "rejected" || job.status === "wishlist") return false;
  return daysSince(job.dateApplied) >= 7;
}

// ─── Salary Formatting ──────────────────────────────────────────────

export function formatSalary(min?: number, max?: number): string {
  if (!min && !max) return "";
  const fmt = (n: number) => {
    if (n >= 1000) return `$${Math.round(n / 1000)}k`;
    return `$${n}`;
  };
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  if (max) return `Up to ${fmt(max)}`;
  return "";
}

// ─── CSV Export ──────────────────────────────────────────────────────

export function exportToCSV(jobs: Job[]): void {
  const headers = [
    "Company",
    "Role",
    "Status",
    "Date Applied",
    "Days Waiting",
    "Job URL",
    "Salary Min",
    "Salary Max",
    "Location Type",
    "Location",
    "Source",
    "Notes",
    "Contact Person",
    "Contact Email",
    "Followed Up",
  ];

  const rows = jobs.map((j) => [
    j.company,
    j.role,
    STATUS_LABELS[j.status],
    j.dateApplied,
    String(daysSince(j.dateApplied)),
    j.jobUrl || "",
    j.salaryMin ? String(j.salaryMin) : "",
    j.salaryMax ? String(j.salaryMax) : "",
    j.locationType ? LOCATION_LABELS[j.locationType] : "",
    j.location || "",
    j.source ? SOURCE_LABELS[j.source] : "",
    j.notes || "",
    j.contactPerson || "",
    j.contactEmail || "",
    j.followedUp ? "Yes" : "No",
  ]);

  const escape = (val: string) => {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const csv =
    [headers.map(escape).join(",")]
      .concat(rows.map((r) => r.map(escape).join(",")))
      .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `jobflow-export-${todayISO()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── CSV Import ──────────────────────────────────────────────────────

export function parseCSV(text: string): Job[] {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Parse header to find column indices
  const header = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name);

  const statusReverse: Record<string, JobStatus> = {};
  for (const [k, v] of Object.entries(STATUS_LABELS)) {
    statusReverse[v.toLowerCase()] = k as JobStatus;
  }

  const sourceReverse: Record<string, string> = {};
  for (const [k, v] of Object.entries(SOURCE_LABELS)) {
    sourceReverse[v.toLowerCase()] = k;
  }

  const locationReverse: Record<string, string> = {};
  for (const [k, v] of Object.entries(LOCATION_LABELS)) {
    locationReverse[v.toLowerCase()] = k;
  }

  const jobs: Job[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const get = (name: string) => {
      const j = idx(name);
      return j >= 0 && j < cols.length ? cols[j].trim() : "";
    };

    const company = get("company");
    const role = get("role");
    if (!company || !role) continue;

    const statusStr = get("status").toLowerCase();
    const status = statusReverse[statusStr] || "applied";
    const dateApplied = get("date applied") || todayISO();
    const now = new Date().toISOString();

    jobs.push({
      id: crypto.randomUUID(),
      company,
      role,
      status,
      dateApplied,
      jobUrl: get("job url") || undefined,
      salaryMin: get("salary min") ? Number(get("salary min")) : undefined,
      salaryMax: get("salary max") ? Number(get("salary max")) : undefined,
      locationType: (locationReverse[get("location type").toLowerCase()] as Job["locationType"]) || undefined,
      location: get("location") || undefined,
      source: (sourceReverse[get("source").toLowerCase()] as Job["source"]) || undefined,
      notes: get("notes") || undefined,
      contactPerson: get("contact person") || undefined,
      contactEmail: get("contact email") || undefined,
      followedUp: get("followed up").toLowerCase() === "yes",
      lastStatusChange: now,
      createdAt: now,
    });
  }

  return jobs;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
  }
  result.push(current);
  return result;
}

// ─── ID Generation ──────────────────────────────────────────────────

export function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}
