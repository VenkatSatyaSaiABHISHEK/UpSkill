"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, 
  FileText, 
  Calendar, 
  AlertCircle, 
  Search, 
  Edit, 
  Trash2, 
  TrendingUp, 
  CheckCircle,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Settings as SettingsIcon,
  UserPlus,
  X
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, GlassCard } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { AdminSidebar, AdminTab } from "@/components/shared/admin-sidebar";
import { getAvatar } from "@/lib/utils";
import { 
  deleteStudentProfile, 
  updateStudentProfile, 
  parseStudentCSV,
  importStudentList,
  subscribeAdminStudents,
  subscribeAllSubmissions,
  CSVStudentRow,
  addStudent
} from "@/lib/admin-services";
import { Submission } from "@/lib/submissions";
import { UserProfile } from "@/context/auth-context";
import Image from "next/image";

export default function AdminDashboardPage() {
  const { user, login } = useAuth();

  // Admin Login specific states
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmittingAdmin, setIsSubmittingAdmin] = useState(false);

  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail.trim() || !adminPassword) {
      toast.error("Please fill in all admin credentials.");
      return;
    }

    setIsSubmittingAdmin(true);
    const toastId = toast.loading("Verifying admin authentication...");

    try {
      await login(adminEmail, adminPassword, "admin");
      toast.success("Welcome back, Administrator!", { id: toastId });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Invalid credentials.";
      toast.error(errMsg, { id: toastId });
    } finally {
      setIsSubmittingAdmin(false);
    }
  };

  // Sidebar collapsible state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");

  // Core collections data
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  // CSV Drag and drop states
  const [parsedCSVRows, setParsedCSVRows] = useState<CSVStudentRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Student directory operations states
  const [selectedStudent, setSelectedStudent] = useState<UserProfile | null>(null);
  const [isEditingStudent, setIsEditingStudent] = useState(false);
  const [editStudentData, setEditStudentData] = useState<Partial<UserProfile>>({});
  const [studentHistoryList, setStudentHistoryList] = useState<Submission[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Manual student addition states
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [newStudentData, setNewStudentData] = useState<Partial<CSVStudentRow>>({
    fullName: "",
    rollNumber: "",
    email: "",
    branch: "Computer Science & Engineering",
    domain: "Full Stack Web Development",
    mentorName: "",
    phone: "",
    college: "",
    mentorPhone: ""
  });

  // Filter & Search states
  const [studentSearch, setStudentSearch] = useState("");
  const [updateSearch, setUpdateSearch] = useState("");
  const [domainFilter, setDomainFilter] = useState("All");

  // Dynamically compute domains from loaded students
  const uniqueDomains = Array.from(new Set([
    "Full Stack Web Development",
    "Frontend Engineering",
    "Firebase Architectures",
    ...students.map(s => s.domain).filter(Boolean)
  ])) as string[];

  // Selected Submission detailed view drawer
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);

  // Selected Domain Trainees view modal
  const [selectedDomainForView, setSelectedDomainForView] = useState<string | null>(null);

  // Weekly reports helpers & state
  const isImageUrl = (url?: string) => {
    if (!url) return false;
    const cleanUrl = url.toLowerCase().split('?')[0];
    return cleanUrl.endsWith('.png') || 
           cleanUrl.endsWith('.jpg') || 
           cleanUrl.endsWith('.jpeg') || 
           cleanUrl.endsWith('.webp') || 
           cleanUrl.endsWith('.gif') ||
           (url.includes('cloudinary.com') && url.includes('/image/upload/'));
  };

  const getWeekIdentifier = (dateStr: string): string => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "Unknown Week";
    const year = date.getFullYear();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const month = monthNames[date.getMonth()];
    const day = date.getDate();
    let weekNum = 1;
    if (day > 21) weekNum = 4;
    else if (day > 14) weekNum = 3;
    else if (day > 7) weekNum = 2;
    return `${month} ${year} - Week ${weekNum}`;
  };

  const [selectedReportWeek, setSelectedReportWeek] = useState<string>("");

  useEffect(() => {
    if (submissions.length > 0 && !selectedReportWeek) {
      const sorted = [...submissions].sort((a, b) => b.date.localeCompare(a.date));
      setSelectedReportWeek(getWeekIdentifier(sorted[0].date));
    }
  }, [submissions, selectedReportWeek]);

  // Fetch initial data
  // Fetch initial data via real-time subscriptions
  const loadConsoleData = () => {
    // Handled automatically via Firestore snapshots
  };

  useEffect(() => {
    setLoading(true);
    
    const handleError = (err: Error) => {
      console.warn("Real-time snapshot error. Falling back to local values:", err);
      setLoading(false);
    };

    const unsubStudents = subscribeAdminStudents((list) => {
      setStudents(list);
    }, handleError);

    const unsubSubmissions = subscribeAllSubmissions((list) => {
      setSubmissions(list);
      setLoading(false);
    }, handleError);

    return () => {
      unsubStudents();
      unsubSubmissions();
    };
  }, []);

  // Student Action Handlers
  const handleEditStudent = (student: UserProfile) => {
    setEditStudentData({
      fullName: student.fullName,
      branch: student.branch,
      domain: student.domain,
      mentorName: student.mentorName,
      phone: student.phone || "",
      college: student.college || "",
      mentorPhone: student.mentorPhone || ""
    });
    setSelectedStudent(student);
    setIsEditingStudent(true);
  };

  const handleUpdateStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    try {
      await updateStudentProfile(selectedStudent.uid, editStudentData);
      toast.success("Student profile updated successfully.");
      setIsEditingStudent(false);
      setSelectedStudent(null);
      loadConsoleData();
    } catch {
      toast.error("Failed to update student profile.");
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (confirm("Are you sure you want to delete this student profile?")) {
      try {
        await deleteStudentProfile(studentId);
        toast.success("Student deleted successfully.");
        loadConsoleData();
      } catch {
        toast.error("Failed to delete student.");
      }
    }
  };

  const handleAddStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentData.fullName || !newStudentData.rollNumber) {
      toast.error("Please fill in the required fields (Full Name and Roll Number).");
      return;
    }

    // Check for duplicate Roll Number
    const rollTrim = newStudentData.rollNumber.toUpperCase().trim();
    const isDuplicate = students.some(
      (s) => s.rollNumber?.toUpperCase().trim() === rollTrim
    );
    if (isDuplicate) {
      toast.error(`A student with Roll Number ${rollTrim} already exists in the directory.`);
      return;
    }

    const toastId = toast.loading("Adding student directory record...");
    try {
      await addStudent({
        fullName: newStudentData.fullName,
        rollNumber: rollTrim,
        email: newStudentData.email || "",
        branch: newStudentData.branch || undefined,
        domain: newStudentData.domain || undefined,
        mentorName: newStudentData.mentorName || undefined,
        phone: newStudentData.phone || undefined,
        college: newStudentData.college || undefined,
        mentorPhone: newStudentData.mentorPhone || undefined
      });
      toast.success("Student manually added successfully.", { id: toastId });
      setIsAddingStudent(false);
      // Reset form
      setNewStudentData({
        fullName: "",
        rollNumber: "",
        email: "",
        branch: "Computer Science & Engineering",
        domain: "Full Stack Web Development",
        mentorName: "",
        phone: "",
        college: "",
        mentorPhone: ""
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to add student record.";
      toast.error(errMsg, { id: toastId });
    }
  };

  const handleViewHistory = (student: UserProfile) => {
    const history = submissions.filter((sub) => sub.studentId === student.uid);
    setStudentHistoryList(history);
    setSelectedStudent(student);
    setShowHistoryModal(true);
  };

  // CSV Drag and drop uploader
  const handleCSVDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleCSVDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith(".csv")) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          const parsed = parseStudentCSV(text);
          setParsedCSVRows(parsed);
          toast.success(`Parsed ${parsed.length} rows from CSV.`);
        };
        reader.readAsText(file);
      } else {
        toast.error("Invalid file type. Only CSV files are supported.");
      }
    }
  };

  const handleImportSubmit = async () => {
    if (parsedCSVRows.length === 0) return;
    setImporting(true);
    const toastId = toast.loading("Batch importing student records...");

    try {
      await importStudentList(parsedCSVRows);
      toast.success("All student records imported successfully.", { id: toastId });
      setParsedCSVRows([]);
      setActiveTab("students");
      loadConsoleData();
    } catch {
      toast.error("Batch import failed. Please verify Firestore connectivity.", { id: toastId });
    } finally {
      setImporting(false);
    }
  };

  // Metrics calculations
  const totalStudents = students.length;
  const totalSubmissions = submissions.length;

  const todayStr = new Date().toISOString().split("T")[0];
  const submittedTodayList = submissions.filter((sub) => sub.date === todayStr);
  const totalSubmittedToday = submittedTodayList.length;

  // Get distinct student IDs that submitted today
  const uniqueSubmitsToday = new Set(submittedTodayList.map(s => s.studentId));
  const pendingStudents = students.filter(s => !uniqueSubmitsToday.has(s.uid));
  const totalPendingToday = pendingStudents.length;

  // Domain filter listings
  const filteredStudentsList = students.filter((s) => {
    const matchesSearch = s.fullName.toLowerCase().includes(studentSearch.toLowerCase()) || 
                          (s.rollNumber && s.rollNumber.toLowerCase().includes(studentSearch.toLowerCase()));
    const matchesDomain = domainFilter === "All" || s.domain === domainFilter;
    return matchesSearch && matchesDomain;
  });

  const filteredSubmissionsList = submissions.filter((sub) => {
    return sub.studentName.toLowerCase().includes(updateSearch.toLowerCase()) || 
           sub.topic.toLowerCase().includes(updateSearch.toLowerCase());
  });

  if (!user || user.role !== "admin") {
    return (
      <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-[#fafafa] dark:bg-[#0a0a0a] transition-all duration-1000">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-sky-100/40 via-cyan-50/20 to-white dark:from-zinc-950/40 dark:via-zinc-950/10 dark:to-black pointer-events-none" />
        
        <div className="w-full max-w-[420px] px-4 py-8 z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <GlassCard className="p-8 border border-white/50 dark:border-zinc-800/40 bg-white/70 dark:bg-black/50 backdrop-blur-xl relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-sky-300 via-indigo-400 to-sky-300 dark:from-zinc-800 dark:via-zinc-600 dark:to-zinc-800" />
              
              <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    placeholder="admin@upskill.com"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="bg-background/40 h-11 text-xs rounded-xl"
                    disabled={isSubmittingAdmin}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Secure Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="bg-background/40 h-11 text-xs rounded-xl pr-10"
                      disabled={isSubmittingAdmin}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 bg-zinc-950 text-white hover:bg-zinc-900 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-100 rounded-xl font-bold cursor-pointer transition-transform hover:scale-[1.005] active:scale-[0.995]"
                  disabled={isSubmittingAdmin}
                >
                  {isSubmittingAdmin ? (
                    <div className="w-4 h-4 rounded-full border-2 border-zinc-400 border-t-transparent animate-spin" />
                  ) : (
                    "Unlock Portal"
                  )}
                </Button>
              </form>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a] flex transition-all duration-1000">
      
      {/* Sidebar navigation */}
      <AdminSidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        collapsed={sidebarCollapsed} 
        setCollapsed={setSidebarCollapsed} 
      />

      {/* Main Console view */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header navbar */}
        <header className="sticky top-0 z-10 h-16 border-b border-white/50 dark:border-zinc-800/40 bg-white/70 dark:bg-black/60 backdrop-blur-md px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-sm text-zinc-800 dark:text-zinc-200 capitalize">
              Management Portal &rsaquo; {activeTab}
            </h2>
          </div>

        </header>

        {/* Dynamic Workspace views */}
        <main className="flex-1 p-6 overflow-y-auto max-w-5xl w-full mx-auto space-y-6">
          
          {loading ? (
            <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
              <div className="w-10 h-10 rounded-full border-2 border-muted border-t-primary animate-spin" />
              <p className="text-xs text-muted-foreground animate-pulse font-medium">Fetching records...</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              
              {/* --- 1. DASHBOARD MODULE --- */}
              {activeTab === "dashboard" && (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  {/* Grid Metrics Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="border border-white/60 dark:border-zinc-800/40 bg-white/50 dark:bg-black/30">
                      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase">Total Students</CardTitle>
                        <Users className="w-4 h-4 text-sky-500" />
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <span className="text-2xl font-bold tracking-tight">{totalStudents}</span>
                        <p className="text-[9px] text-muted-foreground mt-0.5">Enrolled trainees</p>
                      </CardContent>
                    </Card>

                    <Card className="border border-white/60 dark:border-zinc-800/40 bg-white/50 dark:bg-black/30">
                      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase">Updates Logged</CardTitle>
                        <FileText className="w-4 h-4 text-emerald-500" />
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <span className="text-2xl font-bold tracking-tight">{totalSubmissions}</span>
                        <p className="text-[9px] text-muted-foreground mt-0.5">Cumulative submissions</p>
                      </CardContent>
                    </Card>

                    <Card className="border border-white/60 dark:border-zinc-800/40 bg-white/50 dark:bg-black/30">
                      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase">Submitted Today</CardTitle>
                        <CheckCircle className="w-4 h-4 text-indigo-500" />
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <span className="text-2xl font-bold tracking-tight">{totalSubmittedToday}</span>
                        <p className="text-[9px] text-muted-foreground mt-0.5">Active logs today</p>
                      </CardContent>
                    </Card>

                    <Card className="border border-white/60 dark:border-zinc-800/40 bg-white/50 dark:bg-black/30">
                      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase">Pending Students</CardTitle>
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <span className="text-2xl font-bold tracking-tight">{totalPendingToday}</span>
                        <p className="text-[9px] text-muted-foreground mt-0.5">Awaiting logs</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* SVG Chart Panel */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="md:col-span-2 border border-white/60 dark:border-zinc-800/40 bg-white/50 dark:bg-black/30">
                      <CardHeader className="p-6 pb-2">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-sky-500" /> Submission Trends (Last 7 Days)
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 pt-4 h-64 flex items-end">
                        {/* Custom Animated SVG Chart */}
                        <div className="relative w-full h-full">
                          <svg className="w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="none">
                            {/* Grid Lines */}
                            <line x1="0" y1="12" x2="100" y2="12" stroke="currentColor" className="text-zinc-100 dark:text-zinc-900" strokeWidth="0.5" />
                            <line x1="0" y1="25" x2="100" y2="25" stroke="currentColor" className="text-zinc-100 dark:text-zinc-900" strokeWidth="0.5" />
                            <line x1="0" y1="37" x2="100" y2="37" stroke="currentColor" className="text-zinc-100 dark:text-zinc-900" strokeWidth="0.5" />
                            
                            {/* Chart Area Fill */}
                            <motion.path
                              initial={{ pathLength: 0 }}
                              animate={{ pathLength: 1 }}
                              transition={{ duration: 1.5 }}
                              d="M 0 50 L 0 42 L 16 35 L 33 22 L 50 38 L 66 18 L 83 15 L 100 8 L 100 50 Z"
                              fill="url(#grad)"
                              opacity="0.15"
                            />
                            
                            {/* Area Stroke */}
                            <motion.path
                              initial={{ pathLength: 0 }}
                              animate={{ pathLength: 1 }}
                              transition={{ duration: 1.5 }}
                              d="M 0 42 L 16 35 L 33 22 L 50 38 L 66 18 L 83 15 L 100 8"
                              fill="none"
                              stroke="currentColor"
                              className="text-sky-500"
                              strokeWidth="1.5"
                            />

                            <defs>
                              <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#0ea5e9" />
                                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                              </linearGradient>
                            </defs>
                          </svg>

                          {/* Legend labels */}
                          <div className="absolute inset-x-0 bottom-0 flex justify-between text-[9px] text-muted-foreground pt-1.5 border-t border-zinc-100 dark:border-zinc-800/40">
                            <span>Mon</span>
                            <span>Tue</span>
                            <span>Wed</span>
                            <span>Thu</span>
                            <span>Fri</span>
                            <span>Sat</span>
                            <span>Sun</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Pending Today List */}
                    <Card className="md:col-span-1 border border-white/60 dark:border-zinc-800/40 bg-white/50 dark:bg-black/30 flex flex-col max-h-[336px] overflow-hidden">
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pending Logins Today</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-1 flex-1 overflow-y-auto space-y-3">
                        {pendingStudents.length === 0 ? (
                          <div className="text-center py-8 text-xs text-muted-foreground">
                            All students have logged their session today! 🎉
                          </div>
                        ) : (
                          pendingStudents.map((student) => (
                            <div key={student.uid} className="flex items-center gap-2.5 p-2 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-100 dark:border-zinc-800/30 text-xs">
                              <Image
                                src={getAvatar(student.avatarUrl, student.rollNumber)}
                                alt={student.fullName}
                                width={24}
                                height={24}
                                className="w-6 h-6 rounded-full object-cover shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <span className="font-bold text-zinc-800 dark:text-zinc-200 block truncate">{student.fullName}</span>
                                <span className="text-[10px] text-muted-foreground">{student.rollNumber || "No Roll"}</span>
                              </div>
                              <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded-full border border-amber-200/40 shrink-0">Pending</span>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Recent Submissions Logged */}
                  <Card className="border border-white/60 dark:border-zinc-800/40 bg-white/50 dark:bg-black/30 overflow-hidden shadow-sm">
                    <CardHeader className="p-6 pb-2">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <FileText className="w-4.5 h-4.5 text-sky-500" /> Recent Submissions
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Review the latest learning updates logged by trainees.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-zinc-100 dark:border-zinc-800/60 text-xs font-semibold text-muted-foreground bg-zinc-100/30 dark:bg-zinc-950/20">
                            <th className="p-4">Date</th>
                            <th className="p-4">Trainee</th>
                            <th className="p-4">Session</th>
                            <th className="p-4">Topic</th>
                            <th className="p-4">Task Status</th>
                            <th className="p-4 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                          {submissions.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-6 text-center text-xs text-muted-foreground">
                                No submissions logged yet.
                              </td>
                            </tr>
                          ) : (
                            submissions.slice(0, 5).map((sub) => (
                              <tr 
                                key={sub.id} 
                                className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10 cursor-pointer transition-colors"
                                onClick={() => setSelectedSub(sub)}
                              >
                                <td className="p-4 text-muted-foreground font-semibold">{sub.date}</td>
                                <td className="p-4 font-bold text-zinc-900 dark:text-zinc-50">{sub.studentName}</td>
                                <td className="p-4">
                                  <span className="font-bold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-950 border border-zinc-200/50 dark:border-zinc-850/60 text-[10px]">
                                    {sub.session}
                                  </span>
                                </td>
                                <td className="p-4 font-semibold text-zinc-800 dark:text-zinc-200 max-w-[240px] truncate">
                                  <div className="flex flex-col">
                                    <span>{sub.topic}</span>
                                    {sub.notes && (
                                      <span className="text-[10px] text-zinc-400 italic font-normal truncate max-w-[200px]">
                                        Note: {sub.notes}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-4">
                                  {sub.taskAssigned ? (
                                    <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-200/40">
                                      Task Assigned
                                    </span>
                                  ) : (
                                    <span className="inline-block text-[9px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-900 text-muted-foreground border border-zinc-200/50 dark:border-zinc-800/60">
                                      No Task
                                    </span>
                                  )}
                                </td>
                                <td className="p-4 text-right">
                                  <Button variant="ghost" size="sm" className="h-7 text-[10px] hover:bg-zinc-200/40 font-semibold cursor-pointer">
                                    Review
                                  </Button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* --- 2. STUDENTS DIRECTORY MODULE --- */}
              {activeTab === "students" && (
                <motion.div
                  key="students"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Search student directories..."
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        className="pl-9 h-10 bg-white/40"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <select
                        value={domainFilter}
                        onChange={(e) => setDomainFilter(e.target.value)}
                        className="h-10 px-3 rounded-lg border border-input bg-white/40 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="All">All Domains</option>
                        {uniqueDomains.map((dom) => (
                          <option key={dom} value={dom}>{dom}</option>
                        ))}
                      </select>
                      <Button
                        onClick={() => setIsAddingStudent(true)}
                        className="h-10 px-4 font-bold text-xs gap-1.5 shrink-0 bg-zinc-950 text-white hover:bg-zinc-900 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-100 rounded-lg cursor-pointer"
                      >
                        <UserPlus className="w-4 h-4" /> Add Student
                      </Button>
                    </div>
                  </div>

                  <Card className="border border-white/60 dark:border-zinc-800/40 bg-white/50 dark:bg-black/30 overflow-hidden shadow-sm">
                    <CardContent className="p-0 overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                          <tr className="border-b border-zinc-100 dark:border-zinc-800/60 text-xs font-semibold text-muted-foreground bg-zinc-100/30 dark:bg-zinc-950/20">
                            <th className="p-4">Student</th>
                            <th className="p-4">Roll Number</th>
                            <th className="p-4">Branch</th>
                            <th className="p-4">Focus Domain</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50 text-xs">
                          {filteredStudentsList.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">
                                No student records found.
                              </td>
                            </tr>
                          ) : (
                            filteredStudentsList.map((student) => (
                              <tr key={student.uid} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10 transition-colors">
                                <td className="p-4">
                                  <div className="flex items-center gap-3">
                                     <Image
                                       src={getAvatar(student.avatarUrl, student.rollNumber)}
                                       alt={student.fullName}
                                       width={36}
                                       height={36}
                                       className="w-9 h-9 rounded-full object-cover border border-zinc-200/50"
                                     />
                                    <div>
                                      <span className="font-bold text-sm text-zinc-900 dark:text-zinc-50 block leading-tight">{student.fullName}</span>
                                      <span className="text-[10px] text-muted-foreground block">{student.email}</span>
                                      {(student.phone || student.college) && (
                                        <span className="text-[9px] text-zinc-400 block mt-0.5">
                                          {student.college} {student.phone && `• ${student.phone}`}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="p-4 font-semibold text-muted-foreground">{student.rollNumber || "22CSE1042"}</td>
                                <td className="p-4 text-zinc-700 dark:text-zinc-300">{student.branch || "CSE"}</td>
                                <td className="p-4 font-medium text-zinc-900 dark:text-zinc-100">{student.domain || "Full Stack"}</td>
                                <td className="p-4">
                                  {student.isActivated ? (
                                    <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200/40">Active</span>
                                  ) : (
                                    <span className="inline-block text-[9px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-900 text-muted-foreground border border-zinc-200/50 dark:border-zinc-800/50">Onboarding</span>
                                  )}
                                </td>
                                <td className="p-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                                      onClick={() => handleViewHistory(student)}
                                      title="View History"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                                      onClick={() => handleEditStudent(student)}
                                      title="Edit Student"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-8 w-8 text-destructive hover:bg-destructive/10 cursor-pointer"
                                      onClick={() => handleDeleteStudent(student.uid)}
                                      title="Delete Student"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* --- 3. SUBMISSIONS CONSOLE MODULE --- */}
              {activeTab === "updates" && (
                <motion.div
                  key="updates"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search updates by trainee name or session topic..."
                      value={updateSearch}
                      onChange={(e) => setUpdateSearch(e.target.value)}
                      className="pl-9 h-10 bg-white/40"
                    />
                  </div>

                  <Card className="border border-white/60 dark:border-zinc-800/40 bg-white/50 dark:bg-black/30 overflow-hidden">
                    <CardContent className="p-0 overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[700px] text-xs">
                        <thead>
                          <tr className="border-b border-zinc-100 dark:border-zinc-800/60 text-xs font-semibold text-muted-foreground bg-zinc-100/30 dark:bg-zinc-950/20">
                            <th className="p-4">Date</th>
                            <th className="p-4">Trainee</th>
                            <th className="p-4">Session</th>
                            <th className="p-4">Topic</th>
                            <th className="p-4">Mentor</th>
                            <th className="p-4">Task Status</th>
                            <th className="p-4 text-right">Details</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                          {filteredSubmissionsList.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="p-8 text-center text-sm text-muted-foreground">
                                No submissions found matching criteria.
                              </td>
                            </tr>
                          ) : (
                            filteredSubmissionsList.map((sub) => (
                              <tr 
                                key={sub.id} 
                                className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10 cursor-pointer transition-colors"
                                onClick={() => setSelectedSub(sub)}
                              >
                                <td className="p-4 text-muted-foreground font-semibold">{sub.date}</td>
                                <td className="p-4 font-bold text-zinc-900 dark:text-zinc-50">{sub.studentName}</td>
                                <td className="p-4">
                                  <span className="font-bold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-950 border border-zinc-200/50 dark:border-zinc-850/60 text-[10px]">
                                    {sub.session}
                                  </span>
                                </td>
                                <td className="p-4 font-semibold text-zinc-800 dark:text-zinc-200 max-w-[200px] truncate">
                                  <div className="flex flex-col">
                                    <span>{sub.topic}</span>
                                    {sub.notes && (
                                      <span className="text-[10px] text-zinc-400 italic font-normal truncate max-w-[180px]">
                                        Note: {sub.notes}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-4 text-muted-foreground">{sub.mentorName}</td>
                                <td className="p-4">
                                  {sub.taskAssigned ? (
                                    <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-200/40">
                                      Task Assigned
                                    </span>
                                  ) : (
                                    <span className="inline-block text-[9px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-900 text-muted-foreground border border-zinc-200/50 dark:border-zinc-800/60">
                                      No Task
                                    </span>
                                  )}
                                </td>
                                <td className="p-4 text-right">
                                  <Button variant="ghost" size="sm" className="h-7 text-[10px] hover:bg-zinc-200/40 font-semibold cursor-pointer">
                                    Review
                                  </Button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* --- 4. REPORTS MODULE --- */}
              {activeTab === "reports" && (
                <motion.div
                  key="reports"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="md:col-span-2 border border-white/60 dark:border-zinc-800/40 bg-white/50 dark:bg-black/30">
                      <CardHeader className="p-6">
                        <CardTitle className="text-sm font-bold">Domain Participation Metrics</CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 pt-0 space-y-4">
                        <div className="space-y-3">
                          {(() => {
                            const activeDomains = Array.from(new Set(students.map(s => s.domain).filter(Boolean)));
                            const domainsToRender = activeDomains.length > 0 
                              ? activeDomains.map(dom => {
                                  const count = students.filter(s => s.domain === dom).length;
                                  return { domain: dom, count };
                                }).sort((a, b) => b.count - a.count)
                              : [
                                  { domain: "Full Stack Web Development", count: 0 },
                                  { domain: "Frontend Engineering", count: 0 },
                                  { domain: "Firebase Architectures", count: 0 }
                                ];

                            return domainsToRender.map((item, index) => {
                              const pct = totalStudents > 0 ? (item.count / totalStudents) * 100 : (index === 0 ? 65 : index === 1 ? 40 : 20);
                              const barColorClass = index % 3 === 0 
                                ? "bg-zinc-950 dark:bg-zinc-50" 
                                : index % 3 === 1 
                                  ? "bg-sky-500" 
                                  : "bg-indigo-500";
                              return (
                                <div 
                                  key={item.domain} 
                                  onClick={() => setSelectedDomainForView(item.domain || "")}
                                  className="group cursor-pointer hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 p-2.5 rounded-xl border border-transparent hover:border-zinc-200/50 dark:hover:border-zinc-800/30 transition-all"
                                >
                                  <div className="flex justify-between text-[11px] font-semibold mb-1.5">
                                    <span className="group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">{item.domain}</span>
                                    <span className="text-[10px] text-muted-foreground font-bold">{item.count} {item.count === 1 ? "Student" : "Students"}</span>
                                  </div>
                                  <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
                                    <div className={`h-full ${barColorClass} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Report Exports panel */}
                    <Card className="md:col-span-1 border border-white/60 dark:border-zinc-800/40 bg-white/50 dark:bg-black/30">
                      <CardHeader className="p-4">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Export Console Reports</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 space-y-2">
                        <Button 
                          variant="outline" 
                          className="w-full justify-start gap-2 text-xs border-zinc-200 cursor-pointer"
                          onClick={() => {
                            toast.info("Generating student directory report...");
                          }}
                        >
                          <Download className="w-4 h-4" /> Download Trainee Directory
                        </Button>
                        <Button 
                          variant="outline" 
                          className="w-full justify-start gap-2 text-xs border-zinc-200 cursor-pointer"
                          onClick={() => {
                            toast.info("Generating submission logs...");
                          }}
                        >
                          <Download className="w-4 h-4" /> Export Submission Records
                        </Button>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Weekly Domain Reports Section */}
                  {(() => {
                    const sortedSubmissionsForReport = [...submissions].sort((a, b) => b.date.localeCompare(a.date));
                    const reportWeeks = Array.from(new Set(sortedSubmissionsForReport.map(s => getWeekIdentifier(s.date))));
                    const weekSubmissions = submissions.filter(s => getWeekIdentifier(s.date) === selectedReportWeek);

                    // Map active trainees this week
                    const traineeSubmissionsMap = new Map<string, { student: UserProfile | undefined, count: number }>();
                    weekSubmissions.forEach(sub => {
                      const studentObj = students.find(s => s.fullName === sub.studentName || s.rollNumber === sub.rollNumber);
                      const keyName = sub.studentName || studentObj?.fullName || "Unknown Trainee";
                      const existing = traineeSubmissionsMap.get(keyName) || { student: studentObj, count: 0 };
                      traineeSubmissionsMap.set(keyName, {
                        student: existing.student || studentObj,
                        count: existing.count + 1
                      });
                    });

                    const activeTraineesThisWeek = Array.from(traineeSubmissionsMap.entries()).map(([name, data]) => ({
                      name,
                      student: data.student,
                      count: data.count
                    })).sort((a, b) => b.count - a.count);

                    // Group by Domain
                    const domainSubmissionsMap = new Map<string, Submission[]>();
                    weekSubmissions.forEach(sub => {
                      const student = students.find(s => s.fullName === sub.studentName || s.rollNumber === sub.rollNumber);
                      const domainName = student?.domain || sub.domain || "Other / Unassigned";
                      const existing = domainSubmissionsMap.get(domainName) || [];
                      domainSubmissionsMap.set(domainName, [...existing, sub]);
                    });

                    const domainGroups = Array.from(domainSubmissionsMap.entries()).map(([domain, list]) => ({
                      domain,
                      submissions: list
                    }));

                    return (
                      <Card className="w-full border border-white/60 dark:border-zinc-800/40 bg-white/50 dark:bg-black/30">
                        <CardHeader className="p-6 border-b border-zinc-100 dark:border-zinc-800/50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div>
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                              Weekly Submissions & Domain Activity
                            </CardTitle>
                            <CardDescription className="text-[10px] font-semibold mt-1">
                              Grouped view of student learning summaries, submissions count, and deliverables by week.
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Select Week:</span>
                            {reportWeeks.length > 0 ? (
                              <select
                                value={selectedReportWeek}
                                onChange={(e) => setSelectedReportWeek(e.target.value)}
                                className="bg-[#F5F5F5] dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 h-9 px-3 rounded-xl text-xs font-bold text-zinc-800 dark:text-zinc-200 outline-none cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                              >
                                {reportWeeks.map(wk => (
                                  <option key={wk} value={wk}>{wk}</option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">No submissions logged yet</span>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="p-6">
                          {weekSubmissions.length === 0 ? (
                            <div className="text-center py-12 text-xs text-muted-foreground font-semibold">
                              No submissions found for the selected week.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                              
                              {/* Left: Active Trainees List */}
                              <div className="lg:col-span-1 space-y-4">
                                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-zinc-100 dark:border-zinc-800/40 pb-2 flex items-center justify-between">
                                  Active Trainees
                                  <span className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[9px] font-black text-foreground">
                                    {activeTraineesThisWeek.length} Trainees
                                  </span>
                                </h4>
                                <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                                  {activeTraineesThisWeek.map(({ name, student, count }) => (
                                    <div 
                                      key={name} 
                                      className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/10 border border-zinc-100 dark:border-zinc-800/30 text-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
                                    >
                                      <Image
                                        src={getAvatar(student?.avatarUrl, student?.rollNumber)}
                                        alt={name}
                                        width={32}
                                        height={32}
                                        className="w-8 h-8 rounded-full object-cover shrink-0 border border-zinc-200/50"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <span className="font-bold text-zinc-900 dark:text-zinc-100 block truncate">{name}</span>
                                        <span className="text-[9px] text-zinc-400 block truncate font-medium mt-0.5">{student?.domain || "No Domain"}</span>
                                      </div>
                                      <div className="shrink-0 text-right">
                                        <span className="text-[10px] font-black text-[#111111] dark:text-white px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                                          {count} {count === 1 ? "Update" : "Updates"}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Right: Domain Learning Summaries & Deliverables */}
                              <div className="lg:col-span-2 space-y-6">
                                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-zinc-100 dark:border-zinc-800/40 pb-2">
                                  Domain Activity & Deliverables
                                </h4>
                                
                                <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
                                  {domainGroups.map(({ domain, submissions: list }) => (
                                    <div key={domain} className="space-y-3.5">
                                      <div className="flex items-center gap-2">
                                        <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                                        <h5 className="text-xs font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-wide">{domain}</h5>
                                        <span className="text-[9px] font-bold text-muted-foreground">({list.length} logged)</span>
                                      </div>
                                      
                                      <div className="space-y-3 pl-3.5 border-l-2 border-zinc-100 dark:border-zinc-800/50">
                                        {list.map((sub, idx) => {
                                          const matchingStudent = students.find(s => s.fullName === sub.studentName || s.rollNumber === sub.rollNumber);
                                          return (
                                            <div key={idx} className="p-4 rounded-xl bg-white dark:bg-zinc-900/20 border border-zinc-200/50 dark:border-zinc-800/30 shadow-sm space-y-2.5 text-xs">
                                              <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-2">
                                                  <Image
                                                    src={getAvatar(matchingStudent?.avatarUrl, matchingStudent?.rollNumber)}
                                                    alt={sub.studentName}
                                                    width={24}
                                                    height={24}
                                                    className="w-6 h-6 rounded-full object-cover border border-zinc-200/50"
                                                  />
                                                  <div>
                                                    <span className="font-bold text-zinc-950 dark:text-zinc-50">{sub.studentName}</span>
                                                    <span className="text-[9px] text-zinc-400 font-semibold block mt-0.5">{sub.date} • {sub.session}</span>
                                                  </div>
                                                </div>
                                                
                                                <div className="text-right shrink-0">
                                                  <button
                                                    type="button"
                                                    onClick={() => setSelectedSub(sub)}
                                                    className="text-[9px] font-bold text-[#111111] dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-950 px-2 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer"
                                                  >
                                                    {sub.topic}
                                                  </button>
                                                </div>
                                              </div>
                                              
                                              <div className="text-zinc-650 dark:text-zinc-350 leading-relaxed font-medium bg-zinc-50/50 dark:bg-zinc-950/20 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800/20">
                                                {sub.summary}
                                              </div>
                                              
                                              {/* Render attached image inline if exists */}
                                              {sub.fileUrl && isImageUrl(sub.fileUrl) && (
                                                <div className="mt-2.5 border border-zinc-100 dark:border-zinc-800 rounded-lg overflow-hidden bg-zinc-50 dark:bg-zinc-950 p-1 max-w-[280px]">
                                                  <img 
                                                    src={sub.fileUrl} 
                                                    alt={sub.fileName || "Trainee work image"} 
                                                    className="w-full h-auto max-h-[160px] object-contain rounded-md cursor-pointer hover:opacity-90 transition-opacity"
                                                    onClick={() => setSelectedSub(sub)} // Clicking opens detail view
                                                  />
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })()}
                </motion.div>
              )}

              {/* --- 5. CSV IMPORT MODULE --- */}
              {activeTab === "import" && (
                <motion.div
                  key="import"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <GlassCard className="p-8 border border-dashed border-zinc-200 dark:border-zinc-800 bg-white/20 dark:bg-black/10 relative overflow-hidden">
                    
                    {parsedCSVRows.length === 0 ? (
                      /* Drag & Drop Zone */
                      <div
                        onDragEnter={handleCSVDrag}
                        onDragOver={handleCSVDrag}
                        onDragLeave={handleCSVDrag}
                        onDrop={handleCSVDrop}
                        onClick={() => document.getElementById("csv-file-picker")?.click()}
                        className={`text-center cursor-pointer py-10 border-2 border-dashed rounded-2xl transition-all duration-300 ${
                          dragActive
                            ? "border-zinc-900 bg-zinc-100/50 dark:border-white dark:bg-zinc-900/50"
                            : "border-transparent"
                        }`}
                      >
                        <input
                          id="csv-file-picker"
                          type="file"
                          accept=".csv"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const file = e.target.files[0];
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                const text = ev.target?.result as string;
                                const parsed = parseStudentCSV(text);
                                setParsedCSVRows(parsed);
                                toast.success(`Parsed ${parsed.length} rows from CSV.`);
                              };
                              reader.readAsText(file);
                            }
                          }}
                        />
                        <FileSpreadsheet className="w-12 h-12 text-muted-foreground/60 mx-auto mb-3" />
                        <h4 className="font-bold text-base text-zinc-900 dark:text-zinc-50">Upload Student Directory CSV</h4>
                        <p className="text-xs text-muted-foreground mt-1.5 max-w-xs mx-auto">
                          Drag and drop your spreadsheet file here or <span className="underline text-sky-600 dark:text-sky-400 cursor-pointer">browse</span> to upload.
                        </p>
                      </div>
                    ) : (
                      /* Parsed Preview Table */
                      <div className="space-y-6">
                        <div className="flex items-center justify-between border-b border-zinc-200/50 dark:border-zinc-800/40 pb-4">
                          <div>
                            <h4 className="font-bold text-base">Import Preview</h4>
                            <p className="text-xs text-muted-foreground mt-0.5">Parsed {parsedCSVRows.length} records. Review columns before saving.</p>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="cursor-pointer"
                              onClick={() => {
                                setParsedCSVRows([]);
                              }}
                            >
                              Cancel
                            </Button>
                            <Button 
                              size="sm"
                              className="cursor-pointer font-semibold"
                              onClick={handleImportSubmit}
                              disabled={importing}
                            >
                              {importing ? "Importing..." : "Start Batch Import"}
                            </Button>
                          </div>
                        </div>

                        <div className="overflow-x-auto border border-zinc-200/50 dark:border-zinc-800/40 rounded-xl max-h-96">
                          <table className="w-full text-left border-collapse text-xs min-w-[650px]">
                            <thead>
                              <tr className="border-b border-zinc-200 dark:border-zinc-800/50 bg-zinc-100/50 dark:bg-zinc-950/20 text-muted-foreground font-semibold">
                                <th className="p-3">Roll Number</th>
                                <th className="p-3">Full Name</th>
                                <th className="p-3">Email Address</th>
                                <th className="p-3">Branch</th>
                                <th className="p-3">Focus Domain</th>
                                <th className="p-3">Assigned Mentor</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-150 dark:divide-zinc-850/50">
                              {parsedCSVRows.map((row, idx) => (
                                <tr key={idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10">
                                  <td className="p-3 font-semibold text-muted-foreground">{row.rollNumber}</td>
                                  <td className="p-3 font-bold text-zinc-900 dark:text-zinc-100">{row.fullName}</td>
                                  <td className="p-3 text-muted-foreground">{row.email}</td>
                                  <td className="p-3">{row.branch || "CSE"}</td>
                                  <td className="p-3 font-medium text-zinc-800 dark:text-zinc-200">{row.domain || "Full Stack"}</td>
                                  <td className="p-3">{row.mentorName || "Sarah Jenkins"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </GlassCard>
                </motion.div>
              )}

              {/* --- 6. SETTINGS MODULE --- */}
              {activeTab === "settings" && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <GlassCard className="p-6 border border-white/50 dark:border-zinc-800/40 bg-white/60 dark:bg-black/50 backdrop-blur-xl relative overflow-hidden">
                    <CardHeader className="p-0 pb-4 border-b border-zinc-200/50 dark:border-zinc-800/40">
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <SettingsIcon className="w-5 h-5 text-muted-foreground" /> Console Settings
                      </CardTitle>
                      <CardDescription className="text-xs">Configure console settings and sync live connections.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 pt-6 space-y-4">
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cloudinary Upload Directory</label>
                        <Input
                          type="text"
                          defaultValue="upskill-program-tracker/attachments"
                          className="bg-background/40 text-xs"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Default Verification Status</label>
                        <select
                          className="flex h-10 w-full rounded-lg border border-input bg-background/40 px-3 py-2 text-xs text-foreground"
                          defaultValue="auto-approve"
                        >
                          <option value="auto-approve">Auto-Approve logs</option>
                          <option value="review-pending">Require mentor approval</option>
                        </select>
                      </div>
                    </CardContent>
                  </GlassCard>
                </motion.div>
              )}

            </AnimatePresence>
          )}
        </main>
      </div>

      {/* --- EDIT STUDENT MODAL DIALOG --- */}
      <AnimatePresence>
        {isEditingStudent && selectedStudent && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditingStudent(false)}
              className="fixed inset-0 bg-black z-40 cursor-pointer"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[420px] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-150 dark:border-zinc-800/40">
                <h3 className="font-bold text-base">Edit Student Profile</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">{selectedStudent.fullName} &middot; {selectedStudent.email}</p>
              </div>
              
              <form onSubmit={handleUpdateStudentSubmit} className="p-6 space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground uppercase">Student Full Name</label>
                  <Input
                    type="text"
                    value={editStudentData.fullName || ""}
                    onChange={(e) => setEditStudentData({ ...editStudentData, fullName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground uppercase">Branch</label>
                  <Input
                    type="text"
                    value={editStudentData.branch || ""}
                    onChange={(e) => setEditStudentData({ ...editStudentData, branch: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground uppercase">Focus Domain</label>
                  <Input
                    type="text"
                    value={editStudentData.domain || ""}
                    onChange={(e) => setEditStudentData({ ...editStudentData, domain: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground uppercase">Assigned Mentor</label>
                  <Input
                    type="text"
                    value={editStudentData.mentorName || ""}
                    onChange={(e) => setEditStudentData({ ...editStudentData, mentorName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground uppercase">College</label>
                  <Input
                    type="text"
                    placeholder="e.g. KIEW"
                    value={editStudentData.college || ""}
                    onChange={(e) => setEditStudentData({ ...editStudentData, college: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground uppercase">Phone Number</label>
                  <Input
                    type="text"
                    placeholder="e.g. 9000061817"
                    value={editStudentData.phone || ""}
                    onChange={(e) => setEditStudentData({ ...editStudentData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground uppercase">Mentor&apos;s Mobile Num</label>
                  <Input
                    type="text"
                    placeholder="e.g. 8605476161"
                    value={editStudentData.mentorPhone || ""}
                    onChange={(e) => setEditStudentData({ ...editStudentData, mentorPhone: e.target.value })}
                  />
                </div>

                <div className="flex gap-2.5 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="flex-1 cursor-pointer"
                    onClick={() => setIsEditingStudent(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1 cursor-pointer font-bold">
                    Save Changes
                  </Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* --- ADD STUDENT MODAL DIALOG --- */}
      <AnimatePresence>
        {isAddingStudent && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingStudent(false)}
              className="fixed inset-0 bg-black z-40 cursor-pointer"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[420px] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-150 dark:border-zinc-800/40">
                <h3 className="font-bold text-base">Add New Student</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Enter details to create an onboarding student record.</p>
              </div>
              
              <form onSubmit={handleAddStudentSubmit} className="p-6 space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground uppercase">Student Full Name *</label>
                  <Input
                    type="text"
                    placeholder="Jane Doe"
                    value={newStudentData.fullName || ""}
                    onChange={(e) => setNewStudentData({ ...newStudentData, fullName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground uppercase">Roll Number *</label>
                  <Input
                    type="text"
                    placeholder="22CSE1042"
                    value={newStudentData.rollNumber || ""}
                    onChange={(e) => setNewStudentData({ ...newStudentData, rollNumber: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground uppercase">Email Address (Optional)</label>
                  <Input
                    type="email"
                    placeholder="jane.doe@upskill.com"
                    value={newStudentData.email || ""}
                    onChange={(e) => setNewStudentData({ ...newStudentData, email: e.target.value })}
                  />
                  <p className="text-[9px] text-muted-foreground">If left empty, email will be auto-generated.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground uppercase">Branch</label>
                  <Input
                    type="text"
                    placeholder="Computer Science & Engineering"
                    value={newStudentData.branch || ""}
                    onChange={(e) => setNewStudentData({ ...newStudentData, branch: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground uppercase">Focus Domain</label>
                  <Input
                    type="text"
                    placeholder="e.g. Cloud / DevOps - 5"
                    value={newStudentData.domain || ""}
                    onChange={(e) => setNewStudentData({ ...newStudentData, domain: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground uppercase">Assigned Mentor</label>
                  <Input
                    type="text"
                    placeholder="Dr. Sarah Jenkins"
                    value={newStudentData.mentorName || ""}
                    onChange={(e) => setNewStudentData({ ...newStudentData, mentorName: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground uppercase">College</label>
                  <Input
                    type="text"
                    placeholder="e.g. KIEW"
                    value={newStudentData.college || ""}
                    onChange={(e) => setNewStudentData({ ...newStudentData, college: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground uppercase">Phone Number</label>
                  <Input
                    type="text"
                    placeholder="e.g. 9000061817"
                    value={newStudentData.phone || ""}
                    onChange={(e) => setNewStudentData({ ...newStudentData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground uppercase">Mentor&apos;s Mobile Num</label>
                  <Input
                    type="text"
                    placeholder="e.g. 8605476161"
                    value={newStudentData.mentorPhone || ""}
                    onChange={(e) => setNewStudentData({ ...newStudentData, mentorPhone: e.target.value })}
                  />
                </div>

                <div className="flex gap-2.5 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="flex-1 cursor-pointer"
                    onClick={() => setIsAddingStudent(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1 cursor-pointer font-bold">
                    Add Student
                  </Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* --- DOMAIN STUDENTS LIST MODAL --- */}
      <AnimatePresence>
        {selectedDomainForView && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDomainForView(null)}
              className="fixed inset-0 bg-black z-40 cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 w-full max-w-lg rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-5 border-b border-zinc-100 dark:border-zinc-800/50 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/10">
                <div>
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-50 uppercase tracking-wide">
                    Trainees in {selectedDomainForView}
                  </h3>
                  <p className="text-[10px] text-zinc-400 font-semibold mt-0.5">
                    {students.filter(s => s.domain === selectedDomainForView).length} students registered in this domain
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedDomainForView(null)}
                  className="h-8 w-8 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="p-5 overflow-y-auto space-y-3.5">
                {students.filter(s => s.domain === selectedDomainForView).length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-6 font-semibold">
                    No students currently registered in this domain.
                  </p>
                ) : (
                  students
                    .filter(s => s.domain === selectedDomainForView)
                    .map((student) => (
                      <div
                        key={student.uid}
                        className="flex items-center gap-3.5 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-100 dark:border-zinc-800/40 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all text-xs"
                      >
                        <Image
                          src={getAvatar(student.avatarUrl, student.rollNumber)}
                          alt={student.fullName}
                          width={36}
                          height={36}
                          className="w-9 h-9 rounded-full object-cover shrink-0 border border-zinc-200/50"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-zinc-900 dark:text-zinc-50 block truncate">{student.fullName}</span>
                          <span className="text-[9px] text-zinc-400 font-semibold block mt-0.5">
                            {student.rollNumber || "No Roll Number"} &middot; {student.branch || "General"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[10px] px-2.5 font-bold cursor-pointer"
                            onClick={() => {
                              setSelectedDomainForView(null);
                              handleEditStudent(student);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[10px] px-2.5 font-bold cursor-pointer"
                            onClick={() => {
                              setSelectedDomainForView(null);
                              // Load history
                              const history = submissions.filter(sub => sub.studentId === student.uid || sub.rollNumber === student.rollNumber);
                              setStudentHistoryList(history);
                              setSelectedStudent(student);
                              setShowHistoryModal(true);
                            }}
                          >
                            History
                          </Button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* --- STUDENT HISTORY MODAL DIALOG --- */}
      <AnimatePresence>
        {showHistoryModal && selectedStudent && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistoryModal(false)}
              className="fixed inset-0 bg-black z-40 cursor-pointer"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-[520px] bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl z-50 overflow-y-auto"
            >
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800/50 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-50 leading-tight">Submission History</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {selectedStudent.fullName} &middot; {selectedStudent.rollNumber}
                  </p>
                  <p className="text-[10px] text-zinc-400 mt-1">
                    {selectedStudent.college && `College: ${selectedStudent.college} | `} 
                    {selectedStudent.phone && `Phone: ${selectedStudent.phone} | `} 
                    Domain: {selectedStudent.domain}
                  </p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">
                    Mentor: {selectedStudent.mentorName} {selectedStudent.mentorPhone && `(${selectedStudent.mentorPhone})`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowHistoryModal(false)}
                  className="h-8 w-8 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="p-6 space-y-4">
                {studentHistoryList.length === 0 ? (
                  <div className="text-center py-10 text-xs text-muted-foreground">
                    This student hasn&apos;t logged any updates yet.
                  </div>
                ) : (
                  studentHistoryList.map((sub) => (
                    <Card key={sub.id} className="border border-zinc-200/60 bg-zinc-50/50 p-4 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold px-2 py-0.5 rounded-full bg-white dark:bg-zinc-950 border border-zinc-200/50 dark:border-zinc-800/40 text-[9px]">
                          {sub.session}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" /> {sub.date}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-bold text-zinc-900 dark:text-zinc-100 leading-tight">{sub.topic}</h4>
                        <p className="text-muted-foreground mt-0.5">Trainer: {sub.mentorName}</p>
                      </div>
                      <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed bg-white dark:bg-black/30 p-3 rounded-lg border border-zinc-100 dark:border-zinc-900/30">
                        {sub.summary}
                      </p>
                    </Card>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* --- SUBMISSION DETAILS DRAWER --- */}
      <AnimatePresence>
        {selectedSub && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSub(null)}
              className="fixed inset-0 bg-black z-40 cursor-pointer"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-full md:max-w-[60%] lg:max-w-[60%] max-w-[500px] bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl z-50 overflow-y-auto"
            >
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/50 pb-4">
                  <div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-foreground">
                      {selectedSub.session}
                    </span>
                    <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-50 mt-1.5 leading-tight">Submission Review</h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedSub(null)}
                    className="h-8 w-8 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-5 text-sm">
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Trainee Name</span>
                    <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100 leading-snug">{selectedSub.studentName}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Session Topic</span>
                    <p className="font-bold text-base text-zinc-900 dark:text-zinc-50 leading-snug">{selectedSub.topic}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 bg-zinc-50 dark:bg-zinc-900/30 p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-800/40">
                    <div>
                      <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider block mb-0.5">Date Logged</span>
                      <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-sky-500" /> {selectedSub.date}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider block mb-0.5">Trainer / Mentor</span>
                      <span className="font-semibold text-xs text-foreground">{selectedSub.mentorName}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Learning Summary</span>
                    <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed bg-zinc-50/50 dark:bg-zinc-900/10 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800/30">
                      {selectedSub.summary}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-zinc-200/60 dark:border-zinc-800/40 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Homework Task Status</span>
                      {selectedSub.taskAssigned ? (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-200/50">
                          Task Assigned
                        </span>
                      ) : (
                        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-900 text-muted-foreground border border-zinc-200/50 dark:border-zinc-800/60">
                          No Task
                        </span>
                      )}
                    </div>
                    {selectedSub.taskAssigned && selectedSub.taskDescription && (
                      <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 mt-1 pl-1">
                        &bull; {selectedSub.taskDescription}
                      </p>
                    )}
                  </div>

                  {selectedSub.notes && (
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Trainee Notes / Roadblocks</span>
                      <p className="text-xs text-zinc-700 dark:text-zinc-305 leading-relaxed bg-zinc-50/50 dark:bg-zinc-900/10 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800/30 whitespace-pre-wrap italic">
                        &quot;{selectedSub.notes}&quot;
                      </p>
                    </div>
                  )}

                  {selectedSub.fileUrl && (
                    <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/50">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Attachment</span>
                      {isImageUrl(selectedSub.fileUrl) && (
                        <div className="rounded-xl overflow-hidden border border-zinc-100 dark:border-zinc-800/40 bg-zinc-50 dark:bg-zinc-900/10 p-2 flex items-center justify-center">
                          <img 
                            src={selectedSub.fileUrl} 
                            alt={selectedSub.fileName || "Attachment Image"} 
                            className="max-w-full max-h-[350px] rounded-lg object-contain"
                          />
                        </div>
                      )}
                      <div className="p-3 border border-white/60 dark:border-zinc-800/40 bg-zinc-50 dark:bg-zinc-900/30 rounded-xl flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-2.5 truncate">
                          <FileText className="w-5 h-5 text-sky-500 shrink-0" />
                          <span className="text-xs font-bold truncate max-w-[240px] text-zinc-900 dark:text-zinc-50">{selectedSub.fileName || "Attachment"}</span>
                        </div>
                        <a href={selectedSub.fileUrl} target="_blank" rel="noreferrer" className="shrink-0">
                          <Button size="sm" variant="outline" className="h-8 gap-1.5 font-semibold text-xs border-zinc-200 bg-background/50">
                            <Download className="w-3.5 h-3.5" /> View
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


