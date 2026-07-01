"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { subscribeSubmissions } from "@/lib/submissions";
import { motion } from "framer-motion";
import { 
  FileText, 
  Download, 
  Search,
  ExternalLink,
  Calendar,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface FileItem {
  id: string;
  name: string;
  url: string;
  date: string;
  topic: string;
  session: string;
}

export default function FilesPage() {
  const { user } = useAuth();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (user?.uid) {
      setLoading(true);
      const unsubscribe = subscribeSubmissions(user.uid, (list) => {
        // Extract submissions with file attachments
        const extracted: FileItem[] = list
          .filter((sub) => sub.fileUrl)
          .map((sub) => ({
            id: sub.id,
            name: sub.fileName || "Attachment",
            url: sub.fileUrl || "",
            date: sub.date,
            topic: sub.topic,
            session: sub.session
          }));
        setFiles(extracted);
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, [user]);

  // Filter files by search term
  const filteredFiles = files.filter((f) => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.topic.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 md:px-8 py-8 max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-8"
      >
        {/* Header Titles */}
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#111111] dark:text-[#ffffff]">
            Uploaded Files
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 font-medium">
            View and download all documentation and reference files you attached to your updates.
          </p>
        </div>

        {/* Search bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            type="text"
            placeholder="Search by file name or topic..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-[#F5F5F5] dark:bg-[#18181b] border-transparent focus:border-[#E5E5E5] dark:focus:border-[#27272a] h-11 rounded-xl text-xs font-semibold"
          />
        </div>

        {/* Files Grid / List */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="h-24 w-full bg-[#E5E5E5]/40 dark:bg-zinc-900/40 animate-pulse rounded-2xl" />
            <div className="h-24 w-full bg-[#E5E5E5]/40 dark:bg-zinc-900/40 animate-pulse rounded-2xl" />
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="border border-dashed border-[#E5E5E5] dark:border-[#222225] bg-[#FFFFFF] dark:bg-[#111113] p-12 rounded-2xl text-center shadow-sm">
            <AlertCircle className="w-8 h-8 mx-auto text-zinc-400 mb-3" />
            <h4 className="font-bold text-sm text-[#111111] dark:text-[#ffffff]">No files found</h4>
            <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
              {files.length === 0 
                ? "You haven't uploaded any file attachments with your updates yet."
                : "No uploaded files match your search keywords."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
            {filteredFiles.map((fileItem) => (
              <div 
                key={fileItem.id} 
                className="bg-[#FFFFFF] dark:bg-[#111113] border border-[#E5E5E5] dark:border-[#222225] p-5 rounded-2xl shadow-sm hover:scale-[1.01] hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F5F5F5] dark:bg-[#18181b] border border-[#E5E5E5] dark:border-[#27272a]/40 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-zinc-400" />
                  </div>
                  <div className="truncate">
                    <h4 className="font-bold text-xs text-[#111111] dark:text-[#ffffff] truncate" title={fileItem.name}>
                      {fileItem.name}
                    </h4>
                    <p className="text-[10px] text-zinc-400 font-semibold truncate mt-0.5" title={fileItem.topic}>
                      Topic: {fileItem.topic}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-[#F5F5F5] dark:bg-zinc-950 text-zinc-400 border border-[#E5E5E5] dark:border-[#222225]">
                        {fileItem.session}
                      </span>
                      <span className="text-[8px] text-zinc-400 font-semibold flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5" /> {fileItem.date}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-[#E5E5E5]/50 dark:border-[#222225]/50">
                  <a 
                    href={fileItem.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex-1"
                  >
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full h-8 text-[9px] font-bold border-[#E5E5E5] dark:border-[#27272a] bg-transparent hover:bg-[#F5F5F5] dark:hover:bg-[#18181b] rounded-lg cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <ExternalLink className="w-3 h-3" /> View Attachment
                    </Button>
                  </a>
                  <a 
                    href={fileItem.url} 
                    download={fileItem.name}
                    className="shrink-0"
                  >
                    <Button 
                      size="sm" 
                      className="h-8 w-8 p-0 bg-[#111111] hover:bg-zinc-800 dark:bg-[#ffffff] dark:text-[#111111] dark:hover:bg-zinc-200 transition-colors rounded-lg cursor-pointer flex items-center justify-center"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
