import { useState, useEffect, useCallback } from "react";
import { Job, JobStatus, JobFormData } from "../types";
import { generateId, todayISO } from "../utils";

const STORAGE_KEY = "jobflow_jobs";

function loadJobs(): Job[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveJobs(jobs: Job[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
}

export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>(loadJobs);

  useEffect(() => {
    saveJobs(jobs);
  }, [jobs]);

  const addJob = useCallback((formData: JobFormData) => {
    const now = new Date().toISOString();
    const newJob: Job = {
      id: generateId(),
      company: formData.company.trim(),
      role: formData.role.trim(),
      status: formData.status,
      dateApplied: formData.dateApplied || todayISO(),
      jobUrl: formData.jobUrl.trim() || undefined,
      salaryMin: formData.salaryMin ? Number(formData.salaryMin) : undefined,
      salaryMax: formData.salaryMax ? Number(formData.salaryMax) : undefined,
      locationType: formData.locationType || undefined,
      location: formData.location.trim() || undefined,
      source: formData.source || undefined,
      notes: formData.notes.trim() || undefined,
      contactPerson: formData.contactPerson.trim() || undefined,
      contactEmail: formData.contactEmail.trim() || undefined,
      followedUp: false,
      lastStatusChange: now,
      createdAt: now,
    };
    setJobs((prev) => [newJob, ...prev]);
    return newJob;
  }, []);

  const updateJob = useCallback((id: string, updates: Partial<Job>) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === id ? { ...j, ...updates } : j))
    );
  }, []);

  const updateJobStatus = useCallback((id: string, status: JobStatus) => {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === id
          ? { ...j, status, lastStatusChange: new Date().toISOString() }
          : j
      )
    );
  }, []);

  const deleteJob = useCallback((id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }, []);

  const markFollowedUp = useCallback((id: string) => {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === id
          ? { ...j, followedUp: true, followUpDate: todayISO() }
          : j
      )
    );
  }, []);

  const importJobs = useCallback((newJobs: Job[]) => {
    setJobs((prev) => [...newJobs, ...prev]);
  }, []);

  const clearAll = useCallback(() => {
    setJobs([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    jobs,
    addJob,
    updateJob,
    updateJobStatus,
    deleteJob,
    markFollowedUp,
    importJobs,
    clearAll,
  };
}
