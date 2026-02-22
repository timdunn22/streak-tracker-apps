import React, { useState, useRef, useCallback } from "react";
import { ViewMode } from "./types";
import { useJobs } from "./hooks/useJobs";
import { exportToCSV, parseCSV } from "./utils";
import KanbanBoard from "./components/KanbanBoard";
import ListView from "./components/ListView";
import Dashboard from "./components/Dashboard";
import AddJobModal from "./components/AddJobModal";

export default function App() {
  const { jobs, addJob, updateJobStatus, deleteJob, markFollowedUp, importJobs, clearAll } = useJobs();
  const [view, setView] = useState<ViewMode>("kanban");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDataMenu, setShowDataMenu] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dataMenuRef = useRef<HTMLDivElement>(null);

  const handleImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        const imported = parseCSV(text);
        if (imported.length > 0) {
          importJobs(imported);
          alert(`Imported ${imported.length} applications.`);
        } else {
          alert("No valid applications found in the CSV file.");
        }
      };
      reader.readAsText(file);
      // Reset the input so the same file can be imported again
      e.target.value = "";
      setShowDataMenu(false);
    },
    [importJobs]
  );

  const handleClear = () => {
    clearAll();
    setShowClearConfirm(false);
    setShowDataMenu(false);
  };

  const needsFollowUpCount = jobs.filter(
    (j) =>
      !j.followedUp &&
      j.status !== "offer" &&
      j.status !== "rejected" &&
      j.status !== "wishlist" &&
      (() => {
        const d = new Date(j.dateApplied + "T00:00:00");
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)) >= 7;
      })()
  ).length;

  const viewButtons: { mode: ViewMode; label: string; icon: React.ReactNode }[] = [
    {
      mode: "kanban",
      label: "Board",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z" />
        </svg>
      ),
    },
    {
      mode: "list",
      label: "List",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
        </svg>
      ),
    },
    {
      mode: "dashboard",
      label: "Stats",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#08080f] text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#08080f]/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between px-4 md:px-6 py-3">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight">
                Job<span className="text-blue-400">Flow</span>
              </h1>
              <p className="text-[10px] text-gray-600 -mt-0.5 hidden sm:block">Application Tracker</p>
            </div>
          </div>

          {/* View toggle */}
          <div className="flex items-center bg-[#12121a] rounded-lg p-0.5 border border-white/5">
            {viewButtons.map(({ mode, label, icon }) => (
              <button
                key={mode}
                onClick={() => setView(mode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  view === mode
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {icon}
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Follow-up badge */}
            {needsFollowUpCount > 0 && (
              <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-amber-500/15 text-amber-400 hidden sm:inline-flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {needsFollowUpCount} need follow-up
              </span>
            )}

            {/* Data menu */}
            <div className="relative" ref={dataMenuRef}>
              <button
                onClick={() => setShowDataMenu(!showDataMenu)}
                className="p-2 text-gray-500 hover:text-gray-300 transition-colors rounded-lg hover:bg-white/5"
                aria-label="Data options"
              >
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                </svg>
              </button>
              {showDataMenu && (
                <div className="absolute right-0 top-10 z-50 bg-[#1e1e2e] border border-white/10 rounded-xl shadow-2xl py-1.5 min-w-[180px]">
                  <button
                    onClick={() => { exportToCSV(jobs); setShowDataMenu(false); }}
                    className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Export CSV
                  </button>
                  <button
                    onClick={() => { fileInputRef.current?.click(); }}
                    className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    Import CSV
                  </button>
                  <div className="border-t border-white/10 my-1" />
                  <button
                    onClick={() => { setShowClearConfirm(true); setShowDataMenu(false); }}
                    className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                    Clear All Data
                  </button>
                </div>
              )}
            </div>

            {/* Add button */}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-600/20"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span className="hidden sm:inline">Add</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="pt-4">
        {view === "kanban" && (
          <KanbanBoard
            jobs={jobs}
            onStatusChange={updateJobStatus}
            onFollowUp={markFollowedUp}
            onDelete={deleteJob}
          />
        )}
        {view === "list" && (
          <ListView
            jobs={jobs}
            onStatusChange={updateJobStatus}
            onFollowUp={markFollowedUp}
            onDelete={deleteJob}
          />
        )}
        {view === "dashboard" && <Dashboard jobs={jobs} />}
      </main>

      {/* Add modal */}
      <AddJobModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={addJob}
      />

      {/* Clear confirmation modal */}
      {showClearConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          onClick={() => setShowClearConfirm(false)}
        >
          <div
            className="bg-[#12121a] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Clear All Data?</h3>
                <p className="text-sm text-gray-500">
                  This will permanently delete all {jobs.length} applications. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-sm text-gray-400 hover:text-white hover:border-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClear}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-sm font-medium text-white transition-colors"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input for CSV import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleImport}
        className="hidden"
      />

      {/* Empty state */}
      {jobs.length === 0 && view === "kanban" && (
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-white mb-1">Start Tracking</h2>
          <p className="text-sm text-gray-500 max-w-xs mb-6">
            Add your first job application to start organizing your search.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-600/20"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add First Application
          </button>
        </div>
      )}
    </div>
  );
}
