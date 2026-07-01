"use client";

import React, { useState } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useAuth } from "@/hooks/useAuth";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Home, 
  PlusSquare, 
  History, 
  FileText, 
  Bell, 
  ChevronDown, 
  User, 
  Settings, 
  LogOut, 
  X,
  Hash,
  GraduationCap,
  Compass,
  Phone,
  Building
} from "lucide-react";
import { getAvatar } from "@/lib/utils";


export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Dropdown & Modal states
  const [showDropdown, setShowDropdown] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Successfully logged out.");
      router.push("/login");
    } catch {
      toast.error("Failed to log out.");
    }
  };

  const navItems = [
    { label: "Home", href: "/student", icon: Home },
    { label: "Submit Update", href: "/student/submit", icon: PlusSquare },
    { label: "History", href: "/student/history", icon: History },
    { label: "Files", href: "/student/files", icon: FileText }
  ];

  return (
    <ProtectedRoute allowedRoles={["student"]}>
      <div className="min-h-screen bg-[#F5F5F5] dark:bg-[#0c0c0e] text-[#111111] dark:text-[#f3f4f6] font-sans antialiased transition-colors duration-300 flex flex-col pb-20 md:pb-0">
        
        {/* Floating Top Navigation Header (Desktop) */}
        <header className="w-full bg-[#FFFFFF]/80 dark:bg-[#111113]/80 backdrop-blur-md border-b border-[#E5E5E5] dark:border-[#222225] sticky top-0 z-40 px-4 md:px-8 h-16 flex items-center justify-between shadow-sm">
          
          {/* Logo Spacer to keep navigation centered */}
          <div className="w-36 hidden md:block" />

          {/* Floating Navigation Menu (Desktop Top Center) */}
          <nav className="hidden md:flex items-center gap-1.5 bg-[#F5F5F5] dark:bg-[#18181b] p-1 rounded-full border border-[#E5E5E5] dark:border-[#27272a] shadow-inner">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link key={item.label} href={item.href}>
                  <span className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide flex items-center gap-1.5 transition-all cursor-pointer ${
                    isActive 
                      ? "bg-[#FFFFFF] dark:bg-[#27272a] text-[#111111] dark:text-[#ffffff] shadow-sm border border-[#E5E5E5]/50 dark:border-[#3f3f46]/30" 
                      : "text-zinc-500 dark:text-zinc-400 hover:text-[#111111] dark:hover:text-[#ffffff]"
                  }`}>
                    <Icon className="w-3.5 h-3.5" />
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Top Right Action Items */}
          <div className="flex items-center gap-3">


            {/* Notifications Button */}
            <button 
              onClick={() => {
                setNotificationsEnabled(!notificationsEnabled);
                toast.info(notificationsEnabled ? "Notifications silenced." : "Notifications enabled!");
              }}
              className="p-2 rounded-xl border border-[#E5E5E5] dark:border-[#222225] bg-[#FFFFFF] dark:bg-[#111113] hover:bg-[#F5F5F5] dark:hover:bg-[#18181b] text-zinc-500 dark:text-zinc-400 hover:text-[#111111] dark:hover:text-[#ffffff] transition-colors relative cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              {notificationsEnabled && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#111111] dark:bg-[#FFFFFF]" />
              )}
            </button>

            {/* Avatar Dropdown Anchor */}
            <div className="relative">
              <button 
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-full border border-[#E5E5E5] dark:border-[#222225] bg-[#FFFFFF] dark:bg-[#111113] hover:bg-[#F5F5F5] dark:hover:bg-[#18181b] transition-all cursor-pointer text-left focus:outline-none"
              >
                <Image
                  src={getAvatar(user?.avatarUrl, user?.rollNumber)}
                  alt={user?.fullName || "Student Profile"}
                  width={26}
                  height={26}
                  className="w-[26px] h-[26px] rounded-full object-cover border border-[#E5E5E5] dark:border-[#2c2c2f]"
                />
                <span className="hidden lg:inline-block text-xs font-semibold max-w-[100px] truncate">{user?.fullName.split(" ")[0]}</span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
              </button>

              {/* Avatar Dropdown Options */}
              <AnimatePresence>
                {showDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-48 bg-[#FFFFFF] dark:bg-[#111113] border border-[#E5E5E5] dark:border-[#222225] rounded-2xl shadow-xl py-2 z-50 overflow-hidden"
                    >
                      <button 
                        onClick={() => {
                          setShowDropdown(false);
                          setShowProfileModal(true);
                        }}
                        className="w-full px-4 py-2 text-xs font-medium hover:bg-[#F5F5F5] dark:hover:bg-[#18181b] flex items-center gap-2 text-left text-zinc-700 dark:text-zinc-300"
                      >
                        <User className="w-4 h-4 text-zinc-400" />
                        My Profile
                      </button>
                      <button 
                        onClick={() => {
                          setShowDropdown(false);
                          toast.info("Settings panel coming soon!");
                        }}
                        className="w-full px-4 py-2 text-xs font-medium hover:bg-[#F5F5F5] dark:hover:bg-[#18181b] flex items-center gap-2 text-left text-zinc-700 dark:text-zinc-300"
                      >
                        <Settings className="w-4 h-4 text-zinc-400" />
                        Settings
                      </button>
                      <div className="h-px bg-[#E5E5E5] dark:bg-[#222225] my-1" />
                      <button 
                        onClick={() => {
                          setShowDropdown(false);
                          handleLogout();
                        }}
                        className="w-full px-4 py-2 text-xs font-bold hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center gap-2 text-left text-rose-600 dark:text-rose-400"
                      >
                        <LogOut className="w-4 h-4 text-rose-500" />
                        Logout
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Child Router Output Container */}
        <main className="flex-1 pb-12">
          {children}
        </main>

        {/* Mobile Navigation Bar (Bottom Center Stick) */}
        <nav className="md:hidden fixed bottom-4 left-4 right-4 z-40 bg-[#FFFFFF]/90 dark:bg-[#111113]/90 backdrop-blur-md border border-[#E5E5E5] dark:border-[#222225] rounded-3xl py-2 px-4 shadow-xl flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link key={item.label} href={item.href} className="flex flex-col items-center justify-center p-2 relative">
                <span className={`p-2 rounded-2xl transition-all cursor-pointer ${
                  isActive 
                    ? "bg-[#111111] dark:bg-[#ffffff] text-[#ffffff] dark:text-[#111111] scale-110 shadow-sm" 
                    : "text-zinc-400 dark:text-zinc-500 hover:text-[#111111] dark:hover:text-[#ffffff]"
                }`}>
                  <Icon className="w-5 h-5" />
                </span>
                <span className="text-[9px] font-bold mt-1 text-zinc-500 dark:text-zinc-400">
                  {item.label === "Submit Update" ? "Submit" : item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* My Profile Modal dialog */}
        <AnimatePresence>
          {showProfileModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-[#FFFFFF] dark:bg-[#111113] border border-[#E5E5E5] dark:border-[#222225] max-w-sm w-full rounded-3xl shadow-2xl relative overflow-hidden"
              >
                <div className="p-6 space-y-6">
                  {/* Title and Close */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5] dark:border-[#222225]">
                    <h3 className="font-bold text-sm text-[#111111] dark:text-[#ffffff] uppercase tracking-wider">Trainee Profile</h3>
                    <button 
                      onClick={() => setShowProfileModal(false)}
                      className="p-1 rounded-lg hover:bg-[#F5F5F5] dark:hover:bg-[#18181b]"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Profile Header */}
                  <div className="flex flex-col items-center text-center">
                    <Image
                      src={getAvatar(user?.avatarUrl, user?.rollNumber)}
                      alt={user?.fullName || "Student Profile"}
                      width={70}
                      height={70}
                      className="w-[70px] h-[70px] rounded-full object-cover border border-[#E5E5E5] dark:border-[#222225] mb-2"
                    />
                    <h4 className="font-bold text-base text-[#111111] dark:text-[#ffffff]">{user?.fullName}</h4>
                    <span className="text-[10px] text-zinc-400 font-semibold tracking-wider uppercase mt-0.5">Upskill Student</span>
                  </div>

                  {/* Profile Metadata */}
                  <div className="space-y-3 pt-1 max-h-[300px] overflow-y-auto pr-1">
                    <div className="flex items-center gap-3">
                      <Hash className="w-4 h-4 text-zinc-400 shrink-0" />
                      <div className="flex flex-col">
                        <span className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider">Roll Number</span>
                        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{user?.rollNumber || "N/A"}</span>
                      </div>
                    </div>

                    {user?.college && (
                      <div className="flex items-center gap-3">
                        <Building className="w-4 h-4 text-zinc-400 shrink-0" />
                        <div className="flex flex-col">
                          <span className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider">College</span>
                          <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{user.college}</span>
                        </div>
                      </div>
                    )}

                    {user?.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-zinc-400 shrink-0" />
                        <div className="flex flex-col">
                          <span className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider">Phone Number</span>
                          <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{user.phone}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <GraduationCap className="w-4 h-4 text-zinc-400 shrink-0" />
                      <div className="flex flex-col">
                        <span className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider">Branch</span>
                        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{user?.branch || "General"}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Compass className="w-4 h-4 text-zinc-400 shrink-0" />
                      <div className="flex flex-col">
                        <span className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider">Focus Domain</span>
                        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{user?.domain || "Web Development"}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4 text-zinc-400 shrink-0" />
                      <div className="flex flex-col">
                        <span className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider">Mentor / Advisor</span>
                        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                          {user?.mentorName || "Unassigned"} {user?.mentorPhone && `(${user.mentorPhone})`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </ProtectedRoute>
  );
}
