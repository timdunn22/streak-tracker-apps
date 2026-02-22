import { useState, useEffect, useRef } from "react";
import {
  JobFormData,
  JobStatus,
  STATUS_LABELS,
  STATUS_ORDER,
  JobSource,
  SOURCE_LABELS,
  LocationType,
  LOCATION_LABELS,
} from "../types";
import { todayISO } from "../utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: JobFormData) => void;
}

const INITIAL_FORM: JobFormData = {
  company: "",
  role: "",
  status: "applied",
  dateApplied: todayISO(),
  jobUrl: "",
  salaryMin: "",
  salaryMax: "",
  locationType: "",
  location: "",
  source: "",
  notes: "",
  contactPerson: "",
  contactEmail: "",
};

export default function AddJobModal({ isOpen, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<JobFormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const companyRef = useRef<HTMLInputElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setForm({ ...INITIAL_FORM, dateApplied: todayISO() });
      setErrors({});
      setTimeout(() => companyRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  const set = (field: keyof JobFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!form.company.trim()) newErrors.company = "Company is required";
    if (!form.role.trim()) newErrors.role = "Role is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit(form);
    onClose();
  };

  if (!isOpen) return null;

  const inputClass =
    "w-full bg-[#0c0c14] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition-colors";
  const labelClass = "block text-xs font-medium text-gray-400 mb-1";
  const errorClass = "text-xs text-red-400 mt-0.5";

  return (
    <div
      ref={backdropRef}
      onClick={(e) => e.target === backdropRef.current && onClose()}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-8 px-4"
    >
      <div className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl animate-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="text-lg font-semibold text-white">Add Application</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors p-1"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {/* Company & Role */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Company *</label>
              <input
                ref={companyRef}
                type="text"
                value={form.company}
                onChange={set("company")}
                placeholder="e.g. Google"
                className={`${inputClass} ${errors.company ? "border-red-500/50" : ""}`}
              />
              {errors.company && <p className={errorClass}>{errors.company}</p>}
            </div>
            <div>
              <label className={labelClass}>Role / Title *</label>
              <input
                type="text"
                value={form.role}
                onChange={set("role")}
                placeholder="e.g. Senior Frontend Engineer"
                className={`${inputClass} ${errors.role ? "border-red-500/50" : ""}`}
              />
              {errors.role && <p className={errorClass}>{errors.role}</p>}
            </div>
          </div>

          {/* Status & Date Applied */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Status</label>
              <select value={form.status} onChange={set("status")} className={inputClass}>
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Date Applied</label>
              <input type="date" value={form.dateApplied} onChange={set("dateApplied")} className={inputClass} />
            </div>
          </div>

          {/* Job URL */}
          <div>
            <label className={labelClass}>Job URL</label>
            <input
              type="url"
              value={form.jobUrl}
              onChange={set("jobUrl")}
              placeholder="https://..."
              className={inputClass}
            />
          </div>

          {/* Salary */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Salary Min</label>
              <input
                type="number"
                value={form.salaryMin}
                onChange={set("salaryMin")}
                placeholder="80000"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Salary Max</label>
              <input
                type="number"
                value={form.salaryMax}
                onChange={set("salaryMax")}
                placeholder="120000"
                className={inputClass}
              />
            </div>
          </div>

          {/* Location & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Work Arrangement</label>
              <select value={form.locationType} onChange={set("locationType")} className={inputClass}>
                <option value="">Select...</option>
                {(Object.entries(LOCATION_LABELS) as [LocationType, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Location</label>
              <input
                type="text"
                value={form.location}
                onChange={set("location")}
                placeholder="e.g. San Francisco, CA"
                className={inputClass}
              />
            </div>
          </div>

          {/* Source */}
          <div>
            <label className={labelClass}>Source</label>
            <select value={form.source} onChange={set("source")} className={inputClass}>
              <option value="">Select...</option>
              {(Object.entries(SOURCE_LABELS) as [JobSource, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Contact Person</label>
              <input
                type="text"
                value={form.contactPerson}
                onChange={set("contactPerson")}
                placeholder="Recruiter name"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Contact Email</label>
              <input
                type="email"
                value={form.contactEmail}
                onChange={set("contactEmail")}
                placeholder="recruiter@company.com"
                className={inputClass}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={labelClass}>Notes</label>
            <textarea
              value={form.notes}
              onChange={set("notes")}
              placeholder="Any additional notes..."
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 text-sm text-gray-400 hover:text-white hover:border-white/20 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-medium text-white transition-colors"
            >
              Add Application
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
