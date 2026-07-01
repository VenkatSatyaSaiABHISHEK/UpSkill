"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { subscribeSubmissions, Submission } from "@/lib/submissions";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { 
  Search, 
  Calendar, 
  FileText, 
  Download, 
  X, 
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function HistoryPage() {
  const { user } = useAuth();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filtering states
  const [searchTerm, setSearchTerm] = useState("");
  const [sessionFilter, setSessionFilter] = useState("All");
  const [taskFilter, setTaskFilter] = useState("All"); // "All" | "Yes" | "No"
  
  // Drawer state for selected update
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);

  useEffect(() => {
    if (user?.uid) {
      setLoading(true);
      const unsubscribe = subscribeSubmissions(user.uid, (list) => {
        setSubmissions(list);
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, [user]);

  // Filtering logic
  const filteredSubmissions = submissions.filter((sub) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      sub.topic.toLowerCase().includes(searchLower) ||
      sub.summary.toLowerCase().includes(searchLower) ||
      sub.mentorName.toLowerCase().includes(searchLower);

    const matchesSession = sessionFilter === "All" || sub.session === sessionFilter;

    let matchesTask = true;
    if (taskFilter === "Yes") matchesTask = sub.taskAssigned === true;
    if (taskFilter === "No") matchesTask = sub.taskAssigned === false;

    return matchesSearch && matchesSession && matchesTask;
  });

  const sessionOptions = ["All", ...Array.from(new Set(submissions.map((s) => s.session))).sort()];

  return (
    <div className="container mx-auto px-4 md:px-8 py-8 max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-8"
      >
        {/* Header Titles */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#111111] dark:text-[#ffffff]">
              Submission History
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 font-medium">
              Filter and review your logged upskill updates.
            </p>
          </div>
          <Link href="/student/submit">
            <Button size="sm" className="h-10 px-5 rounded-xl font-bold bg-[#111111] hover:bg-zinc-800 dark:bg-[#ffffff] dark:text-[#111111] dark:hover:bg-zinc-200 transition-colors shadow-sm cursor-pointer text-[10px] uppercase tracking-wider">
              Submit Daily Update
            </Button>
          </Link>
        </div>

        {/* Minimal Search and Filters */}
        <div className="p-4 border border-[#E5E5E5] dark:border-[#222225] bg-[#FFFFFF] dark:bg-[#111113] rounded-2xl shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* Search bar */}
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <Input
                type="text"
                placeholder="Search topic or trainer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-[#F5F5F5] dark:bg-[#18181b] border-transparent focus:border-[#E5E5E5] dark:focus:border-[#27272a] h-10 rounded-xl text-xs"
              />
            </div>

            {/* Session filter */}
            <div>
              <select
                value={sessionFilter}
                onChange={(e) => setSessionFilter(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-[#E5E5E5] dark:border-[#222225] bg-[#F5F5F5] dark:bg-[#18181b] px-3 py-2 text-xs font-semibold shadow-sm focus:outline-none text-[#111111] dark:text-zinc-300"
              >
                <option value="All">All Sessions</option>
                {sessionOptions.filter(o => o !== "All").map((opt) => (
                  <option key={opt} value={opt} className="bg-[#FFFFFF] dark:bg-[#111113]">
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* Task filter */}
            <div>
              <select
                value={taskFilter}
                onChange={(e) => setTaskFilter(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-[#E5E5E5] dark:border-[#222225] bg-[#F5F5F5] dark:bg-[#18181b] px-3 py-2 text-xs font-semibold shadow-sm focus:outline-none text-[#111111] dark:text-zinc-300"
              >
                <option value="All">All Tasks</option>
                <option value="Yes">Tasks Assigned</option>
                <option value="No">No Tasks</option>
              </select>
            </div>

          </div>
        </div>

        {/* History content list */}
        {loading ? (
          <div className="space-y-4">
            <div className="h-16 w-full bg-[#E5E5E5]/40 dark:bg-zinc-900/40 animate-pulse rounded-2xl" />
            <div className="h-16 w-full bg-[#E5E5E5]/40 dark:bg-zinc-900/40 animate-pulse rounded-2xl" />
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="border border-dashed border-[#E5E5E5] dark:border-[#222225] bg-[#FFFFFF] dark:bg-[#111113] p-12 rounded-2xl text-center shadow-sm">
            <AlertCircle className="w-8 h-8 mx-auto text-zinc-400 mb-3" />
            <h4 className="font-bold text-sm text-[#111111] dark:text-[#ffffff]">No matching updates found</h4>
            <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
              Modify search keywords or adjust filter parameters.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-hidden border border-[#E5E5E5] dark:border-[#222225] bg-[#FFFFFF] dark:bg-[#111113] rounded-2xl shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E5E5] dark:border-[#222225] text-[10px] font-bold text-zinc-400 uppercase bg-[#F5F5F5]/30 dark:bg-[#18181b]/30">
                    <th className="p-4">Date</th>
                    <th className="p-4">Session</th>
                    <th className="p-4">Topic</th>
                    <th className="p-4">Trainer</th>
                    <th className="p-4 text-center">Task Status</th>
                    <th className="p-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E5]/50 dark:divide-[#222225]/50">
                  {filteredSubmissions.map((sub) => (
                    <tr 
                      key={sub.id} 
                      className="text-xs hover:bg-[#F5F5F5]/50 dark:hover:bg-[#18181b]/30 transition-colors cursor-pointer"
                      onClick={() => setSelectedSub(sub)}
                    >
                      <td className="p-4 text-zinc-400 font-medium">
                        {sub.date}
                      </td>
                      <td className="p-4">
                        <span className="font-bold px-2 py-0.5 rounded-full bg-[#F5F5F5] dark:bg-[#1c1c1f] border border-[#E5E5E5] dark:border-[#2b2b2e] text-[#111111] dark:text-[#e4e4e7] text-[10px]">
                          {sub.session}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-[#111111] dark:text-[#ffffff] max-w-[200px] truncate">
                        {sub.topic}
                      </td>
                      <td className="p-4 text-zinc-500 dark:text-zinc-400">
                        {sub.mentorName}
                      </td>
                      <td className="p-4 text-center">
                        {sub.taskAssigned ? (
                          <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#111111] dark:bg-[#ffffff] text-[#ffffff] dark:text-[#111111]">
                            Yes
                          </span>
                        ) : (
                          <span className="inline-block text-[9px] font-medium px-2 py-0.5 rounded-full bg-[#F5F5F5] dark:bg-[#18181b] text-zinc-400 border border-[#E5E5E5] dark:border-[#27272a]">
                            No
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-[10px] font-bold hover:bg-[#F5F5F5] dark:hover:bg-[#18181b] cursor-pointer"
                        >
                          Review
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {filteredSubmissions.map((sub) => (
                <div 
                  key={sub.id} 
                  className="bg-[#FFFFFF] dark:bg-[#111113] border border-[#E5E5E5] dark:border-[#222225] p-5 rounded-2xl shadow-sm cursor-pointer"
                  onClick={() => setSelectedSub(sub)}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] text-zinc-400 font-semibold flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> {sub.date}
                    </span>
                    <span className="font-bold px-2 py-0.5 rounded-full bg-[#F5F5F5] dark:bg-[#1c1c1f] border border-[#E5E5E5] dark:border-[#2b2b2e] text-[#111111] dark:text-[#e4e4e7] text-[9px]">
                      {sub.session}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#111111] dark:text-[#ffffff] leading-tight">
                      {sub.topic}
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-1">Trainer: {sub.mentorName}</p>
                  </div>
                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#E5E5E5]/50 dark:border-[#222225]/50">
                    <span className="text-[10px] text-zinc-400">Task: <strong>{sub.taskAssigned ? "Yes" : "No"}</strong></span>
                    <span className="text-xs font-semibold text-[#111111] dark:text-[#ffffff]">Details &rarr;</span>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}
      </motion.div>

      {/* Slide-out detail Drawer details (Framer Motion) */}
      <AnimatePresence>
        {selectedSub && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSub(null)}
              className="fixed inset-0 bg-black z-50 cursor-pointer"
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-[480px] bg-[#FFFFFF] dark:bg-[#111113] border-l border-[#E5E5E5] dark:border-[#222225] shadow-2xl z-50 overflow-y-auto"
            >
              <div className="p-6 space-y-6">
                
                {/* Drawer Header */}
                <div className="flex items-center justify-between border-b border-[#E5E5E5] dark:border-[#222225] pb-4">
                  <div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#F5F5F5] dark:bg-[#1c1c1f] border border-[#E5E5E5] dark:border-[#2b2b2e] text-zinc-800 dark:text-zinc-200">
                      {selectedSub.session}
                    </span>
                    <h3 className="font-bold text-base text-[#111111] dark:text-[#ffffff] mt-1.5 leading-tight">Submission Details</h3>
                  </div>
                  <button
                    onClick={() => setSelectedSub(null)}
                    className="h-8 w-8 rounded-lg hover:bg-[#F5F5F5] dark:hover:bg-[#18181b] flex items-center justify-center border border-[#E5E5E5] dark:border-[#222225] cursor-pointer"
                  >
                    <X className="w-4 h-4 text-zinc-400" />
                  </button>
                </div>

                {/* Details list */}
                <div className="space-y-5 text-sm">
                  
                  {/* Topic */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Session Topic</span>
                    <p className="font-bold text-base text-[#111111] dark:text-[#ffffff] leading-snug">{selectedSub.topic}</p>
                  </div>

                  {/* Date and Mentor info grid */}
                  <div className="grid grid-cols-2 gap-4 bg-[#F5F5F5] dark:bg-[#18181b]/30 p-3.5 rounded-xl border border-[#E5E5E5] dark:border-[#222225]/40">
                    <div>
                      <span className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider block mb-0.5">Date Logged</span>
                      <span className="font-semibold text-xs text-[#111111] dark:text-[#ffffff] flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400" /> {selectedSub.date}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider block mb-0.5">Trainer / Mentor</span>
                      <span className="font-semibold text-xs text-[#111111] dark:text-[#ffffff]">{selectedSub.mentorName}</span>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Learning Summary</span>
                    <p className="text-xs text-zinc-655 dark:text-zinc-350 leading-relaxed bg-[#F5F5F5]/40 dark:bg-zinc-900/10 p-4 rounded-xl border border-[#E5E5E5]/50 dark:border-zinc-800/30 whitespace-pre-wrap">
                      {selectedSub.summary}
                    </p>
                  </div>

                  {/* Homework task details */}
                  <div className="p-4 rounded-xl border border-[#E5E5E5] dark:border-[#222225] bg-[#F5F5F5]/20 dark:bg-[#1c1c1f]/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Homework Task Status</span>
                      {selectedSub.taskAssigned ? (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#111111] dark:bg-[#ffffff] text-[#ffffff] dark:text-[#111111]">
                          Task Assigned
                        </span>
                      ) : (
                        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-[#F5F5F5] dark:bg-[#18181b] text-zinc-500 border border-[#E5E5E5] dark:border-[#27272a]">
                          No Task
                        </span>
                      )}
                    </div>
                    {selectedSub.taskAssigned && selectedSub.taskDescription && (
                      <p className="text-xs font-semibold text-[#111111] dark:text-[#ffffff] mt-1 pl-1">
                        &bull; {selectedSub.taskDescription}
                      </p>
                    )}
                  </div>

                  {/* Optional Notes */}
                  {selectedSub.notes && (
                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Roadblocks & Notes</span>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 pl-1 italic leading-relaxed">
                        &quot;{selectedSub.notes}&quot;
                      </p>
                    </div>
                  )}

                  {/* Download attachments files */}
                  {selectedSub.fileUrl && (
                    <div className="space-y-2 pt-2 border-t border-[#E5E5E5] dark:border-[#222225]">
                      <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block">Attached File</span>
                      <div className="p-3 border border-[#E5E5E5] dark:border-[#222225] bg-[#F5F5F5] dark:bg-[#1c1c1f]/50 rounded-xl flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-2.5 truncate">
                          <FileText className="w-5 h-5 text-zinc-400 shrink-0" />
                          <span className="text-xs font-bold truncate max-w-[200px] text-[#111111] dark:text-[#ffffff]">{selectedSub.fileName || "Attachment"}</span>
                        </div>
                        <a
                          href={selectedSub.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0"
                        >
                          <Button size="sm" variant="outline" className="h-8 gap-1.5 font-semibold text-xs border-[#E5E5E5] dark:border-[#222225] bg-transparent hover:bg-[#F5F5F5] dark:hover:bg-[#18181b] cursor-pointer">
                            <Download className="w-3.5 h-3.5" /> View File
                          </Button>
                        </a>
                      </div>
                    </div>
                  )}

                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
