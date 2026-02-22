export type JobStatus =
  | "wishlist"
  | "applied"
  | "phone_screen"
  | "interview"
  | "offer"
  | "rejected";

export type LocationType = "remote" | "hybrid" | "onsite";

export type JobSource =
  | "linkedin"
  | "indeed"
  | "company_site"
  | "referral"
  | "other";

export interface Job {
  id: string;
  company: string;
  role: string;
  status: JobStatus;
  dateApplied: string; // ISO date string
  jobUrl?: string;
  salaryMin?: number;
  salaryMax?: number;
  locationType?: LocationType;
  location?: string;
  source?: JobSource;
  notes?: string;
  contactPerson?: string;
  contactEmail?: string;
  followedUp: boolean;
  followUpDate?: string;
  lastStatusChange: string; // ISO date string
  createdAt: string;
}

export interface JobFormData {
  company: string;
  role: string;
  status: JobStatus;
  dateApplied: string;
  jobUrl: string;
  salaryMin: string;
  salaryMax: string;
  locationType: LocationType | "";
  location: string;
  source: JobSource | "";
  notes: string;
  contactPerson: string;
  contactEmail: string;
}

export const STATUS_LABELS: Record<JobStatus, string> = {
  wishlist: "Wishlist",
  applied: "Applied",
  phone_screen: "Phone Screen",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
};

export const STATUS_ORDER: JobStatus[] = [
  "wishlist",
  "applied",
  "phone_screen",
  "interview",
  "offer",
  "rejected",
];

export const SOURCE_LABELS: Record<JobSource, string> = {
  linkedin: "LinkedIn",
  indeed: "Indeed",
  company_site: "Company Site",
  referral: "Referral",
  other: "Other",
};

export const LOCATION_LABELS: Record<LocationType, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
};

export type SortField =
  | "company"
  | "role"
  | "status"
  | "dateApplied"
  | "daysWaiting"
  | "salary"
  | "source";

export type SortDirection = "asc" | "desc";

export type ViewMode = "kanban" | "list" | "dashboard";
