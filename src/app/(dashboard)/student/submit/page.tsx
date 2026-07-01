"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { createSubmission } from "@/lib/submissions";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckSquare, 
  Paperclip, 
  X, 
  UploadCloud, 
  PlusCircle,
  Sparkles,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SubmitUpdatePage() {
  const { user } = useAuth();
  const router = useRouter();

  // Form states
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [session, setSession] = useState("Session 1");
  const [mentorName, setMentorName] = useState(user?.mentorName || "");
  const [topic, setTopic] = useState("");
  const [summary, setSummary] = useState("");
  const [taskAssigned, setTaskAssigned] = useState(false);
  const [taskDescription, setTaskDescription] = useState("");
  const [notes, setNotes] = useState("");
  
  // File upload states
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedUrl, setUploadedUrl] = useState<string | undefined>(undefined);
  const [filePublicId, setFilePublicId] = useState<string | undefined>(undefined);
  const [fileResourceType, setFileResourceType] = useState<string | undefined>(undefined);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Groq AI states
  const [aiLoadingAction, setAiLoadingAction] = useState<string | null>(null);
  const [aiAutofillResult, setAiAutofillResult] = useState("");
  const [showAutofillModal, setShowAutofillModal] = useState(false);

  // Drag and drop states
  const [dragActive, setDragActive] = useState(false);

  // Handle file drop/select
  const handleFile = (selectedFile: File) => {
    const validTypes = [
      "application/pdf", 
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "image/png", 
      "image/jpeg", 
      "image/jpg"
    ];

    if (!validTypes.includes(selectedFile.type)) {
      toast.error("Invalid file format. Upload PDF, DOCX, PPT, or JPEG/PNG image.");
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error("File size exceeds 5MB limit.");
      return;
    }

    setFile(selectedFile);
    uploadFile(selectedFile);
  };

  // Real Cloudinary upload via internal API Route
  const uploadFile = async (fileObj: File) => {
    setUploading(true);
    setUploadProgress(15);

    try {
      const formData = new FormData();
      formData.append("file", fileObj);
      setUploadProgress(50);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });

      setUploadProgress(85);
      if (!response.ok) {
        throw new Error("Failed to upload file to backend.");
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setUploadProgress(100);
      setUploadedUrl(data.secure_url);
      setFilePublicId(data.public_id);
      setFileResourceType(data.resource_type);
      toast.success("File uploaded successfully.");
    } catch (err: unknown) {
      console.error("Upload failed:", err);
      const errMsg = err instanceof Error ? err.message : "Failed to upload file.";
      toast.error(errMsg);
      setFile(null);
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const removeFile = async () => {
    if (filePublicId) {
      try {
        await fetch("/api/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicId: filePublicId, resourceType: fileResourceType })
        });
      } catch (err) {
        console.error("Attachment deletion failed on backend:", err);
      }
    }
    setFile(null);
    setUploadedUrl(undefined);
    setFilePublicId(undefined);
    setFileResourceType(undefined);
    setUploadProgress(0);
  };

  const triggerAI = async (aiAction: string, textPayload: string) => {
    if (!textPayload.trim()) {
      toast.error(aiAction === "autofill" ? "Please enter a session topic or summary details first." : "Please enter text first.");
      return;
    }
    setAiLoadingAction(aiAction);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: aiAction, payload: textPayload })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (aiAction === "rewrite") {
        setNotes(data.text);
        toast.success("Notes refined professionally.");
      } else if (aiAction === "autofill") {
        setAiAutofillResult(data.text);
        setShowAutofillModal(true);
        toast.success("AI learning summary draft is ready.");
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "AI failed to process.";
      toast.error(errMsg);
    } finally {
      setAiLoadingAction(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!topic.trim()) {
      toast.error("Please enter the session topic.");
      return;
    }
    if (!summary.trim() || summary.length < 20) {
      toast.error("Please provide a learning summary (at least 20 characters).");
      return;
    }
    if (taskAssigned && !taskDescription.trim()) {
      toast.error("Please fill in the task description.");
      return;
    }

    setIsSubmitting(true);
    const submitToastId = toast.loading("Saving learning update...");

    try {
      await createSubmission({
        studentId: user?.uid || "mock-student-id",
        studentName: user?.fullName || "Jane Doe",
        rollNumber: user?.rollNumber || "22CSE1042",
        branch: user?.branch || "Computer Science",
        domain: user?.domain || "Full Stack Web",
        date,
        session,
        mentorName,
        topic,
        summary,
        taskAssigned,
        taskDescription: taskAssigned ? taskDescription : undefined,
        notes: notes.trim() ? notes : undefined,
        fileUrl: uploadedUrl,
        fileName: file?.name,
        filePublicId
      });

      toast.success("Learning update submitted successfully!", { id: submitToastId });
      router.push("/student");
    } catch {
      toast.error("Failed to submit update. Please try again.", { id: submitToastId });
      setIsSubmitting(false);
    }
  };

  const sessionOptions = Array.from({ length: 30 }, (_, i) => `Session ${i + 1}`);

  return (
    <div className="container mx-auto px-4 md:px-8 py-8 max-w-2xl">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-8"
      >
        {/* Headline */}
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#111111] dark:text-[#ffffff]">
            Submit Session Update
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 font-medium">
            Record your daily upskill training progress for mentor review.
          </p>
        </div>

        <div className="p-6 md:p-8 border border-[#E5E5E5] dark:border-[#222225] bg-[#FFFFFF] dark:bg-[#111113] rounded-3xl shadow-sm relative overflow-hidden">
          
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Row 1: Date & Session */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  Session Date
                </label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-[#F5F5F5] dark:bg-[#18181b] border-transparent focus:border-[#E5E5E5] dark:focus:border-[#27272a] h-11 rounded-xl text-xs font-semibold"
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  Session Number
                </label>
                <select
                  value={session}
                  onChange={(e) => setSession(e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-transparent bg-[#F5F5F5] dark:bg-[#18181b] px-3 py-2 text-xs font-semibold shadow-sm focus:outline-none focus:border-[#E5E5E5] dark:focus:border-[#27272a] text-[#111111] dark:text-zinc-300"
                  disabled={isSubmitting}
                >
                  {sessionOptions.map((opt) => (
                    <option key={opt} value={opt} className="bg-[#FFFFFF] dark:bg-[#111113]">
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: Trainer/Mentor Name & Topic */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  Trainer / Mentor Name
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Dr. Sarah Jenkins"
                  value={mentorName}
                  onChange={(e) => setMentorName(e.target.value)}
                  className="bg-[#F5F5F5] dark:bg-[#18181b] border-transparent focus:border-[#E5E5E5] dark:focus:border-[#27272a] h-11 rounded-xl text-xs font-semibold"
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  Session Topic
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Server Actions & Middlewares"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="bg-[#F5F5F5] dark:bg-[#18181b] border-transparent focus:border-[#E5E5E5] dark:focus:border-[#27272a] h-11 rounded-xl text-xs font-semibold"
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>

            {/* Row 3: Learning Summary */}
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                Learning Summary
                <button
                  type="button"
                  onClick={() => triggerAI("autofill", summary || topic)}
                  className="text-[9px] text-[#111111] dark:text-[#ffffff] font-extrabold hover:underline cursor-pointer flex items-center gap-1.5 capitalize"
                  disabled={aiLoadingAction !== null}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  {aiLoadingAction === "autofill" ? "Writing..." : "Autofill with AI"}
                </button>
              </label>
              <textarea
                placeholder="What key concepts did you master during this session? (minimum 20 chars)..."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={4}
                className="flex w-full rounded-xl border border-transparent bg-[#F5F5F5] dark:bg-[#18181b] px-3 py-2 text-xs font-medium shadow-sm transition-all focus:outline-none focus:border-[#E5E5E5] dark:focus:border-[#27272a] text-[#111111] dark:text-zinc-300 placeholder-zinc-400 dark:placeholder-zinc-650"
                disabled={isSubmitting}
                required
              />
              <div className="text-right text-[9px] text-zinc-400 mt-1 font-bold">
                {summary.length} characters (min 20)
              </div>
            </div>

            {/* Row 4: Task Assigned Toggle */}
            <div className="p-4 rounded-2xl border border-[#E5E5E5] dark:border-[#222225] bg-[#F5F5F5]/30 dark:bg-[#18181b]/10 flex items-center justify-between">
              <div className="flex items-start gap-3">
                <CheckSquare className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-[#111111] dark:text-[#ffffff] leading-tight">Was there a homework task assigned?</h4>
                  <p className="text-[10px] text-zinc-400 mt-1 font-semibold">Toggle if this session includes deliverables.</p>
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => setTaskAssigned(!taskAssigned)}
                className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${
                  taskAssigned ? "bg-[#111111] dark:bg-[#ffffff]" : "bg-zinc-200 dark:bg-zinc-800"
                }`}
                disabled={isSubmitting}
              >
                <motion.div
                  layout
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className={`w-4 h-4 rounded-full bg-[#ffffff] dark:bg-[#000000] shadow-sm ${
                    taskAssigned ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Task Description */}
            <AnimatePresence>
              {taskAssigned && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="pt-2">
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                      Task Description
                    </label>
                    <Input
                      type="text"
                      placeholder="Provide details about the task assigned..."
                      value={taskDescription}
                      onChange={(e) => setTaskDescription(e.target.value)}
                      className="bg-[#F5F5F5] dark:bg-[#18181b] border-transparent focus:border-[#E5E5E5] dark:focus:border-[#27272a] h-11 rounded-xl text-xs font-semibold"
                      disabled={isSubmitting}
                      required
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Row 5: Notes */}
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                Additional Notes (Optional)
                <button
                  type="button"
                  onClick={() => triggerAI("rewrite", notes)}
                  className="text-[9px] text-[#111111] dark:text-[#ffffff] font-extrabold hover:underline cursor-pointer lowercase"
                  disabled={aiLoadingAction !== null}
                >
                  {aiLoadingAction === "rewrite" ? "Rewriting..." : "Professionalize with AI"}
                </button>
              </label>
              <Input
                type="text"
                placeholder="Any roadblocks, links, or references..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-[#F5F5F5] dark:bg-[#18181b] border-transparent focus:border-[#E5E5E5] dark:focus:border-[#27272a] h-11 rounded-xl text-xs font-semibold"
                disabled={isSubmitting}
              />
            </div>

            {/* Row 6: File Upload Dropzone */}
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Attachments (PDF, DOCX, PPT, JPG/PNG)
              </label>

              {file ? (
                <div className="p-3.5 border border-[#E5E5E5] dark:border-[#222225] bg-[#F5F5F5] dark:bg-[#18181b] rounded-xl flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <Paperclip className="w-5 h-5 text-zinc-400 shrink-0" />
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-bold truncate max-w-[280px] text-[#111111] dark:text-[#ffffff]">{file.name}</span>
                      {uploading ? (
                        <span className="text-[10px] text-zinc-400 animate-pulse">Uploading {uploadProgress}%...</span>
                      ) : (
                        <span className="text-[10px] text-[#111111] dark:text-white font-extrabold">Ready to submit</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeFile}
                    className="text-zinc-400 hover:text-zinc-950 dark:hover:text-[#ffffff] transition-colors p-1"
                    disabled={isSubmitting}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById("file-upload-input")?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 ${
                    dragActive
                      ? "border-[#111111] bg-[#F5F5F5] dark:border-white dark:bg-zinc-900/50"
                      : "border-[#E5E5E5] hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-700"
                  }`}
                >
                  <input
                    id="file-upload-input"
                    type="file"
                    className="hidden"
                    onChange={(e) => e.target.files && handleFile(e.target.files[0])}
                    accept=".pdf,.docx,.doc,.pptx,.ppt,.jpg,.jpeg,.png"
                    disabled={isSubmitting}
                  />
                  <UploadCloud className="w-7 h-7 text-zinc-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Drag & drop files, or <span className="underline text-[#111111] dark:text-white cursor-pointer font-bold">browse</span>
                  </p>
                  <p className="text-[10px] text-zinc-400 mt-1">
                    PDF, DOCX, PPT, or Image (Max 5MB)
                  </p>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                type="submit"
                className="w-full flex items-center justify-center gap-2 cursor-pointer font-bold shadow-sm h-12 rounded-xl bg-[#111111] hover:bg-zinc-800 dark:bg-[#ffffff] dark:text-[#111111] dark:hover:bg-zinc-200 transition-colors uppercase tracking-widest text-[10px]"
                disabled={isSubmitting || uploading}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    Logging Update...
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4.5 h-4.5" />
                    Submit Learning Update
                  </>
                )}
              </Button>
            </div>

          </form>
        </div>
      </motion.div>

      {/* AI Autofill Preview Modal */}
      <AnimatePresence>
        {showAutofillModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#000000]/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="bg-[#FFFFFF] dark:bg-[#111113] border border-[#E5E5E5] dark:border-[#222225] w-full max-w-lg rounded-2xl shadow-xl overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-[#E5E5E5] dark:border-[#222225] flex items-center justify-between bg-[#F5F5F5]/30 dark:bg-[#18181b]/10">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                  <span className="text-xs font-bold text-[#111111] dark:text-[#ffffff] uppercase tracking-wider">AI Generated Summary</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAutofillModal(false)}
                  className="p-1 rounded-lg hover:bg-[#F5F5F5] dark:hover:bg-[#18181b] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4 text-zinc-400" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto max-h-[300px] text-xs font-medium leading-relaxed text-[#111111] dark:text-zinc-300">
                <p className="bg-[#F5F5F5]/40 dark:bg-[#18181b]/30 p-4 rounded-xl border border-[#E5E5E5]/50 dark:border-[#27272a]/30 whitespace-pre-wrap">
                  {aiAutofillResult}
                </p>
              </div>

              {/* Modal Actions */}
              <div className="p-4 border-t border-[#E5E5E5] dark:border-[#222225] bg-[#F5F5F5]/30 dark:bg-[#18181b]/10 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAutofillModal(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-[#E5E5E5] dark:border-[#222225] text-xs font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-[#F5F5F5] dark:hover:bg-[#18181b] transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSummary(aiAutofillResult);
                    setShowAutofillModal(false);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-[#111111] dark:bg-[#ffffff] text-xs font-bold text-[#ffffff] dark:text-[#111111] hover:opacity-90 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  Accept & Paste
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
