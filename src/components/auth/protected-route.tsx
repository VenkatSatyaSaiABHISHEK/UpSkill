"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, UserRole } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/login");
      } else if (allowedRoles && !allowedRoles.includes(user.role)) {
        // If user role is not authorized, redirect to their default home page
        if (user.role === "admin") {
          router.replace("/admin");
        } else {
          router.replace("/student");
        }
      }
    }
  }, [user, loading, router, allowedRoles]);

  if (loading) {
    return (
      <div suppressHydrationWarning className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
        {/* Sleek monochrome loading animation */}
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-muted border-t-primary animate-spin" />
        </div>
        <p className="text-sm text-muted-foreground animate-pulse font-medium tracking-wide">
          Verifying authorization...
        </p>
      </div>
    );
  }

  // Render children only if user is logged in and meets the role requirements
  if (user && (!allowedRoles || allowedRoles.includes(user.role))) {
    return <>{children}</>;
  }

  // Fallback while redirecting
  return (
    <div suppressHydrationWarning className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-muted border-t-primary animate-spin" />
    </div>
  );
}
