"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/login");
      } else {
        if (user.role === "admin") {
          router.replace("/admin");
        } else {
          router.replace("/student");
        }
      }
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
      {/* Sleek monochrome loading animation */}
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-2 border-muted border-t-primary animate-spin" />
      </div>
      <p className="text-sm text-muted-foreground animate-pulse font-medium tracking-wide">
        Loading Upskill Tracker...
      </p>
    </div>
  );
}
