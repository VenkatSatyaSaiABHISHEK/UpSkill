"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import DotField from "@/components/ui/DotField";

export default function LoginPage() {
  const { studentLogin } = useAuth();
  const router = useRouter();

  // Form input states
  const [rollNumber, setRollNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rollNumber.trim()) {
      toast.error("Please enter your Roll Number.");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Verifying roll number...");

    try {
      const loggedUser = await studentLogin(rollNumber);
      toast.success(`Welcome back, ${loggedUser.fullName}!`, { id: toastId });
      router.push("/student");
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Roll Number not found.";
      toast.error(errMsg, { id: toastId });
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="relative min-h-screen w-full flex items-center justify-center overflow-hidden"
      style={{ backgroundColor: "#000000" }}
    >
      {/* Dynamic DotField Background */}
      <div className="absolute inset-0 z-0 pointer-events-auto">
        <DotField
          dotRadius={3.2}
          dotSpacing={14}
          bulgeStrength={65}
          glowRadius={180}
          sparkle={true}
          waveAmplitude={0.5}
          speed={0.08}
          gradientFrom="rgba(255, 255, 255, 0.45)"
          gradientTo="rgba(255, 255, 255, 0.15)"
          glowColor="#0d1527"
        />
      </div>

      <style>{`
        .minimal-input::placeholder {
          color: #64748b !important;
          opacity: 0.8 !important;
        }
        .minimal-input:focus {
          border-color: #ffffff !important;
          outline: none !important;
          box-shadow: 0 0 0 1px #ffffff !important;
        }
      `}</style>

      {/* Soft light color shade blur in the background behind the form */}
      <div 
        className="absolute w-[300px] h-[300px] rounded-full filter blur-[80px] pointer-events-none z-1" 
        style={{ 
          backgroundColor: "rgba(255, 255, 255, 0.05)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)"
        }} 
      />

      <div className="w-full max-w-[340px] px-4 py-8 z-10">
        <div 
          className="p-6 rounded-2xl transition-all duration-300"
          style={{
            backgroundColor: "transparent", 
          }}
        >
          <form onSubmit={handleStudentSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="ENTER ROLL NUMBER"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                className="minimal-input h-12 text-center font-bold uppercase tracking-widest text-sm rounded-xl border"
                style={{ 
                  backgroundColor: "rgba(255, 255, 255, 0.07)", 
                  borderColor: "rgba(255, 255, 255, 0.3)", 
                  color: "#ffffff" 
                }}
                disabled={isSubmitting}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-xl font-bold uppercase tracking-wider text-xs cursor-pointer transition-all duration-200"
              style={{ backgroundColor: "#ffffff", color: "#000000" }}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="w-4 h-4 rounded-full border-2 border-zinc-650 border-t-transparent animate-spin" />
              ) : (
                "Enter Portal"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
