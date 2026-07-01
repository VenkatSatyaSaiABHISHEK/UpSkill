"use client";

import React from "react";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  BarChart3, 
  FileSpreadsheet, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  LogOut
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";

export type AdminTab = "dashboard" | "students" | "updates" | "reports" | "import" | "settings";

interface AdminSidebarProps {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export function AdminSidebar({ 
  activeTab, 
  setActiveTab, 
  collapsed, 
  setCollapsed 
}: AdminSidebarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();

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
    { id: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
    { id: "students" as const, label: "Students", icon: Users },
    { id: "updates" as const, label: "Learning Updates", icon: FileText },
    { id: "reports" as const, label: "Reports & Insights", icon: BarChart3 },
    { id: "import" as const, label: "CSV Import", icon: FileSpreadsheet },
    { id: "settings" as const, label: "Settings", icon: Settings }
  ];

  return (
    <motion.aside
      animate={{ width: collapsed ? 80 : 260 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="sticky top-0 left-0 h-screen border-r border-white/60 dark:border-zinc-800/40 bg-white/60 dark:bg-black/60 backdrop-blur-xl flex flex-col justify-between p-4 z-20 shrink-0"
    >
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 h-10 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center font-extrabold tracking-tighter shrink-0 shadow-sm">
            U
          </div>
          {!collapsed && (
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="font-bold tracking-tight text-zinc-900 dark:text-zinc-50 truncate"
            >
              Console Panel
            </motion.span>
          )}
        </div>

        {/* Sidebar Nav Links */}
        <nav className="flex flex-col gap-1.5 pt-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-3.5 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all relative cursor-pointer ${
                  isActive 
                    ? "text-zinc-950 dark:text-zinc-50 font-bold" 
                    : "text-muted-foreground hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}
                title={collapsed ? item.label : undefined}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeSidebarTab"
                    className="absolute inset-0 bg-zinc-100/60 dark:bg-zinc-900/60 rounded-lg border border-zinc-200/20 dark:border-zinc-800/20 z-[-1]"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? "text-zinc-950 dark:text-zinc-50" : "text-muted-foreground"}`} />
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.05 }}
                    className="truncate"
                  >
                    {item.label}
                  </motion.span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer block */}
      <div className="space-y-4 pt-4 border-t border-zinc-200/50 dark:border-zinc-800/30">
        
        {/* User Card info block */}
        <div className="flex items-center gap-3 px-2 overflow-hidden">
          <Image
            src={user?.avatarUrl || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150"}
            alt={user?.fullName || "Admin Profile"}
            width={32}
            height={32}
            className="w-8 h-8 rounded-full border border-zinc-200/60 object-cover shrink-0"
          />
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col text-left truncate"
            >
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-50 truncate leading-none">{user?.fullName}</span>
              <span className="text-[10px] text-muted-foreground mt-1 capitalize leading-none">Console Admin</span>
            </motion.div>
          )}
        </div>

        {/* Collapsible toggle & logout controls */}
        <div className="flex flex-col gap-1">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3.5 px-3 py-2.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-zinc-950 dark:hover:text-zinc-100 transition-colors cursor-pointer w-full text-left"
            title={collapsed ? "Log Out" : undefined}
          >
            <LogOut className="w-4 h-4 text-muted-foreground shrink-0" />
            {!collapsed && <span>Log Out</span>}
          </button>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-3.5 px-3 py-2.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-zinc-950 dark:hover:text-zinc-100 transition-colors cursor-pointer w-full text-left"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-muted-foreground shrink-0" />
            )}
            {!collapsed && <span>Collapse Menu</span>}
          </button>
        </div>
      </div>
    </motion.aside>
  );
}
