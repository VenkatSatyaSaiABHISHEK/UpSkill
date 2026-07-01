"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence, Variants } from "framer-motion";
import Link from "next/link";
import { 
  FileText, 
  Calendar, 
  Paperclip, 
  Plus, 
  ArrowRight, 
  X, 
  Download,
  FolderUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { subscribeSubmissions, Submission } from "@/lib/submissions";

export default function StudentDashboard() {
  const { user } = useAuth();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);

  // Time-based welcome greeting
  const [greeting, setGreeting] = useState("Good morning");

  useEffect(() => {
    const hr = new Date().getHours();
    if (hr < 12) setGreeting("Good morning");
    else if (hr < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

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

  // Deriving metrics
  const totalUpdates = submissions.length;
  const lastSubmissionDate = submissions[0] ? submissions[0].date : "No submissions";
  const filesUploadedCount = submissions.filter(s => s.fileUrl).length;

  // Animation constants
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="container mx-auto px-4 md:px-8 py-8 max-w-4xl">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-12"
      >
        
        {/* Simple Welcome Hero Section */}
        <motion.div variants={itemVariants} className="text-center md:text-left py-6">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#111111] dark:text-[#ffffff] leading-tight">
            {greeting}, {user?.fullName.split(" ")[0] || "Trainee"} 👋
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 font-medium">
            {"Ready to submit today's learning update?"}
          </p>
          <div className="mt-6 flex justify-center md:justify-start">
            <Link href="/student/submit">
              <Button className="h-11 px-6 rounded-xl font-bold bg-[#111111] hover:bg-zinc-800 dark:bg-[#ffffff] dark:text-[#111111] dark:hover:bg-zinc-200 transition-colors shadow-sm cursor-pointer text-xs uppercase tracking-wider">
                Submit Learning Update
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Clean Statistic Cards Grid (3 equal size cards) */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          
          {/* Card 1: Total Updates */}
          <div className="bg-[#FFFFFF] dark:bg-[#111113] border border-[#E5E5E5] dark:border-[#222225] p-5 rounded-2xl shadow-sm transition-all duration-200 hover:scale-[1.01] hover:shadow-md flex flex-col justify-between h-32">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Total Updates</span>
              <FileText className="w-4 h-4 text-zinc-400" />
            </div>
            <div>
              <div className="text-2xl font-black tracking-tight text-[#111111] dark:text-[#ffffff]">
                {loading ? "..." : totalUpdates}
              </div>
              <p className="text-[10px] text-zinc-400 font-medium mt-1">Logged updates</p>
            </div>
          </div>

          {/* Card 2: Last Submission */}
          <div className="bg-[#FFFFFF] dark:bg-[#111113] border border-[#E5E5E5] dark:border-[#222225] p-5 rounded-2xl shadow-sm transition-all duration-200 hover:scale-[1.01] hover:shadow-md flex flex-col justify-between h-32">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Last Submission</span>
              <Calendar className="w-4 h-4 text-zinc-400" />
            </div>
            <div>
              <div className="text-sm md:text-base font-black tracking-tight text-[#111111] dark:text-[#ffffff] truncate">
                {loading ? "..." : lastSubmissionDate}
              </div>
              <p className="text-[10px] text-zinc-400 font-medium mt-1">Recent updates</p>
            </div>
          </div>

          {/* Card 3: Files Uploaded */}
          <div className="bg-[#FFFFFF] dark:bg-[#111113] border border-[#E5E5E5] dark:border-[#222225] p-5 rounded-2xl shadow-sm transition-all duration-200 hover:scale-[1.01] hover:shadow-md flex flex-col justify-between h-32">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Files Uploaded</span>
              <FolderUp className="w-4 h-4 text-zinc-400" />
            </div>
            <div>
              <div className="text-2xl font-black tracking-tight text-[#111111] dark:text-[#ffffff]">
                {loading ? "..." : filesUploadedCount}
              </div>
              <p className="text-[10px] text-zinc-400 font-medium mt-1">Attached assets</p>
            </div>
          </div>

        </motion.div>

        {/* Main Content Area - Recent Learning Updates */}
        <motion.div variants={itemVariants} className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight text-[#111111] dark:text-[#ffffff]">
              Recent Learning Updates
            </h2>
            <Link href="/student/history" className="text-xs text-zinc-500 hover:text-[#111111] dark:hover:text-[#ffffff] font-semibold flex items-center gap-1 transition-colors">
              View History <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-4">
              <div className="h-28 w-full bg-[#E5E5E5]/40 dark:bg-zinc-900/40 animate-pulse rounded-2xl" />
              <div className="h-28 w-full bg-[#E5E5E5]/40 dark:bg-zinc-900/40 animate-pulse rounded-2xl" />
            </div>
          ) : submissions.length === 0 ? (
            <div className="border border-dashed border-[#E5E5E5] dark:border-[#222225] bg-[#FFFFFF] dark:bg-[#111113] p-12 rounded-2xl text-center shadow-sm">
              <FileText className="w-8 h-8 mx-auto text-zinc-400 mb-3" />
              <h4 className="font-bold text-sm text-[#111111] dark:text-[#ffffff]">No learning updates submitted</h4>
              <p className="text-xs text-zinc-400 mt-1.5 max-w-xs mx-auto">
                Log your daily training details to monitor streaks and upload session files.
              </p>
              <div className="mt-4">
                <Link href="/student/submit">
                  <Button size="sm" className="bg-[#111111] dark:bg-[#ffffff] text-[#FFFFFF] dark:text-[#111111] text-xs font-semibold px-4 rounded-lg">Submit Update</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.slice(0, 3).map((sub) => (
                <div 
                  key={sub.id}
                  className="bg-[#FFFFFF] dark:bg-[#111113] border border-[#E5E5E5] dark:border-[#222225] p-6 rounded-2xl shadow-sm transition-all duration-200 hover:scale-[1.005] hover:shadow-md flex flex-col justify-between gap-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#F5F5F5] dark:bg-[#1c1c1f] border border-[#E5E5E5] dark:border-[#2b2b2e] text-[#111111] dark:text-[#e4e4e7]">
                          {sub.session}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-semibold flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" /> {sub.date}
                        </span>
                        {sub.taskAssigned && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#F5F5F5] dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400">
                            Task Assigned
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-base text-[#111111] dark:text-[#ffffff] leading-tight">
                        {sub.topic}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1">Trainer: <strong className="font-semibold text-zinc-600 dark:text-zinc-300">{sub.mentorName}</strong></p>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                    {sub.summary}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-[#E5E5E5]/50 dark:border-[#222225]/50 flex-wrap gap-2">
                    <div>
                      {sub.fileName ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F5F5F5] dark:bg-[#18181b] border border-[#E5E5E5] dark:border-[#27272a] text-[10px] font-bold text-zinc-600 dark:text-zinc-300">
                          <Paperclip className="w-3 h-3 text-zinc-400" />
                          {sub.fileName}
                        </div>
                      ) : (
                        <span className="text-[10px] text-zinc-400 font-medium italic">No attachments</span>
                      )}
                    </div>

                    <Button 
                      onClick={() => setSelectedSub(sub)}
                      variant="outline" 
                      size="sm" 
                      className="h-8 text-[10px] font-bold border-[#E5E5E5] dark:border-[#27272a] bg-transparent hover:bg-[#F5F5F5] dark:hover:bg-[#18181b] rounded-lg cursor-pointer"
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

      </motion.div>

      {/* Floating Action Button (FAB) (Desktop only bottom-right) */}
      <Link href="/student/submit">
        <button 
          className="fixed bottom-8 right-8 z-30 hidden md:flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111] font-bold text-xs uppercase tracking-wider shadow-lg border border-white/10 dark:border-black/10 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
          title="Submit Learning Update"
        >
          <Plus className="w-4 h-4" />
          Submit Update
        </button>
      </Link>

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
                
                {/* Header */}
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
                    <p className="text-xs text-zinc-600 dark:text-zinc-350 leading-relaxed bg-[#F5F5F5]/40 dark:bg-zinc-900/10 p-4 rounded-xl border border-[#E5E5E5]/50 dark:border-zinc-800/30 whitespace-pre-wrap">
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
