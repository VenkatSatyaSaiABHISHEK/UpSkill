"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword
} from "firebase/auth";
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "@/lib/firebase";
import { getRandomAvatar } from "../lib/utils";
import { toast } from "sonner";

export type UserRole = "admin" | "student";

export interface UserProfile {
  uid: string;
  email: string;
  username: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
  rollNumber?: string;
  branch?: string;
  domain?: string;
  mentorName?: string;
  isActivated?: boolean;
  phone?: string;
  college?: string;
  mentorPhone?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isFirebaseActive: boolean;
  login: (emailOrUsername: string, password: string, selectedRole: UserRole) => Promise<UserProfile>;
  studentLogin: (rollNumber: string) => Promise<UserProfile>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getLocalStorageStudents(): UserProfile[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem("upskill_students_directory");
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

// Mock data for fallback mode
const MOCK_STUDENT: UserProfile = {
  uid: "mock-student-id",
  email: "student@upskill.com",
  username: "student",
  fullName: "Jane Doe",
  role: "student",
  avatarUrl: getRandomAvatar("22CSE1042"),
  rollNumber: "22CSE1042",
  branch: "Computer Science & Engineering",
  domain: "Full Stack Web Development",
  mentorName: "Dr. Sarah Jenkins"
};

const MOCK_ADMIN: UserProfile = {
  uid: "mock-admin-id",
  email: "admin@upskill.com",
  username: "admin",
  fullName: "Alex Smith",
  role: "admin",
  avatarUrl: getRandomAvatar("admin-placeholder")
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isFirebaseActive, setIsFirebaseActive] = useState<boolean>(false);

  // Initialize and check Firebase configuration
  useEffect(() => {
    if (!isFirebaseConfigured || !auth || !db) {
      console.log("Firebase not configured or initialization failed. Running in Mock Auth fallback mode.");
      // Load mock session from localStorage if exists
      const savedUserStr = localStorage.getItem("upskill_mock_user");
      if (savedUserStr) {
        try {
          const parsed = JSON.parse(savedUserStr) as UserProfile;
          if (parsed.role === "admin") {
            setUser(parsed);
          } else {
            const localStudents = getLocalStorageStudents();
            const exists = localStudents.some(
              (s) => s.rollNumber?.toUpperCase() === parsed.rollNumber?.toUpperCase()
            );
            if (exists) {
              setUser(parsed);
            } else {
              localStorage.removeItem("upskill_mock_user");
              setUser(null);
              toast.error("You are not in the list. Ask Admin to add.");
            }
          }
        } catch (e) {
          console.error("Failed to parse saved mock user", e);
        }
      }
      setLoading(false);
      return;
    }

    setIsFirebaseActive(true);

    const unsubscribe = onAuthStateChanged(auth!, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Get user profile from Firestore
          const userDocRef = doc(db!, "users", firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            let profile = userDoc.data() as UserProfile;
            if (profile.role === "student") {
              const studentDoc = await getDoc(doc(db!, "students", firebaseUser.uid));
              if (studentDoc.exists()) {
                profile = {
                  ...profile,
                  ...studentDoc.data()
                };
              }

              // Enforce that the student profile must have a valid roll number!
              if (!profile.rollNumber) {
                // Delete invalid/stale fallback profiles and sign out
                try {
                  await deleteDoc(userDocRef);
                  await deleteDoc(doc(db!, "students", firebaseUser.uid));
                } catch (err) {
                  console.warn("Could not delete stale profile:", err);
                }
                await signOut(auth!);
                setUser(null);
                toast.error("You are not in the list. Ask Admin to add.");
                setLoading(false);
                return;
              }
            }
            setUser(profile);
          } else {
            // Profile doesn't exist anymore in Firestore, sign out
            await signOut(auth!);
            setUser(null);
            toast.error("You are not in the list. Ask Admin to add.");
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("Error fetching user profile from Firestore:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Login handler
  const login = async (
    emailOrUsername: string,
    password: string,
    selectedRole: UserRole
  ): Promise<UserProfile> => {
    setLoading(true);
    
    // Resolve email (if username was entered, append domain for mock / check logic)
    let email = emailOrUsername;
    if (!email.includes("@")) {
      email = `${emailOrUsername.toLowerCase()}@upskill.com`;
    }

    // --- FALLBACK MOCK MODE ---
    if (!isFirebaseActive) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (password !== "password" && password !== "admin123" && password !== "student123") {
            setLoading(false);
            reject(new Error("Invalid username/email or password. (Hint: use password 'password')"));
            return;
          }

          let loggedInUser: UserProfile | null = null;
          
          if (selectedRole === "admin") {
            loggedInUser = { ...MOCK_ADMIN, email };
          } else {
            loggedInUser = { ...MOCK_STUDENT, email };
          }

          setUser(loggedInUser);
          localStorage.setItem("upskill_mock_user", JSON.stringify(loggedInUser));
          setLoading(false);
          resolve(loggedInUser);
        }, 1200); // Simulate network latency
      });
    }

    // --- FIREBASE ACTIVE MODE ---
    try {
      // 1. Check if there is a pre-imported student profile to auto-activate
      let studentProfileToActivate: UserProfile | null = null;
      let originalDocId: string = "";

      if (selectedRole === "student") {
        const q = query(collection(db!, "users"), where("email", "==", email));
        const querySnap = await getDocs(q);
        querySnap.forEach((doc) => {
          const d = doc.data() as UserProfile;
          if (d.role === "student" && d.isActivated === false) {
            studentProfileToActivate = d;
            originalDocId = doc.id;
          }
        });
      }

      if (studentProfileToActivate) {
        try {
          // Register the user in Firebase Auth using the credentials they typed
          const userCredential = await createUserWithEmailAndPassword(auth!, email, password);
          const fbUser = userCredential.user;

          // Copy imported profile to the new UID document in Firestore
          const activeProfile: UserProfile = {
            ...(studentProfileToActivate as UserProfile),
            uid: fbUser.uid,
            email: fbUser.email || email,
            username: (studentProfileToActivate as UserProfile).username || email.split("@")[0],
            fullName: (studentProfileToActivate as UserProfile).fullName || "Trainee",
            role: "student",
            rollNumber: (studentProfileToActivate as UserProfile).rollNumber || "",
            branch: (studentProfileToActivate as UserProfile).branch || "",
            domain: (studentProfileToActivate as UserProfile).domain || "",
            mentorName: (studentProfileToActivate as UserProfile).mentorName || "",
            avatarUrl: (studentProfileToActivate as UserProfile).avatarUrl || getRandomAvatar((studentProfileToActivate as UserProfile).rollNumber || fbUser.uid),
            isActivated: true
          };

          await setDoc(doc(db!, "users", fbUser.uid), activeProfile);
          await setDoc(doc(db!, "students", fbUser.uid), activeProfile);

          // Clean up old temporary document
          if (originalDocId && originalDocId !== fbUser.uid) {
            await deleteDoc(doc(db!, "users", originalDocId));
          }

          setUser(activeProfile);
          return activeProfile;
        } catch (activationError: unknown) {
          console.warn("Auto-activation registration failed or already registered, falling back to sign-in:", activationError);
          // If error occurs (e.g. email already exists in Auth, continue to standard sign-in)
        }
      }

      // 2. Standard sign-in flow
      const userCredential = await signInWithEmailAndPassword(auth!, email, password);
      const fbUser = userCredential.user;
      
      // Get role from Firestore
      const userDocRef = doc(db!, "users", fbUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        // Create user document if it doesn't exist
        const defaultProfile: UserProfile = {
          uid: fbUser.uid,
          email: fbUser.email || "",
          username: fbUser.email?.split("@")[0] || "user",
          fullName: fbUser.displayName || "New User",
          role: selectedRole, // Assign the role they selected on login
        };
        await setDoc(userDocRef, defaultProfile);
        setUser(defaultProfile);
        return defaultProfile;
      }
      
      let profile = userDoc.data() as UserProfile;
      
      // Verify that the requested role matches their assigned role
      if (profile.role !== selectedRole) {
        await signOut(auth!);
        throw new Error(`Unauthorized. You do not have the '${selectedRole}' role.`);
      }

      if (profile.role === "student") {
        const studentDoc = await getDoc(doc(db!, "students", fbUser.uid));
        if (studentDoc.exists()) {
          profile = {
            ...profile,
            ...studentDoc.data()
          };
        }
      }
      
      setUser(profile);
      return profile;
    } catch (error: unknown) {
      setUser(null);
      // Clean up readable messages
      let message = "An authentication error occurred.";
      if (error instanceof Error) {
        message = error.message;
      }
      const fbError = error as { code?: string };
      if (fbError && (fbError.code === "auth/invalid-credential" || fbError.code === "auth/user-not-found" || fbError.code === "auth/wrong-password")) {
        message = "Invalid email/username or password.";
      }
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  // Student Roll-Number login handler
  const studentLogin = async (rollNumber: string): Promise<UserProfile> => {
    setLoading(true);
    const typedRoll = rollNumber.trim().toUpperCase();

    // 1. --- FALLBACK MOCK MODE ---
    if (!isFirebaseActive) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const localStudents = getLocalStorageStudents();
          const found = localStudents.find(
            (s) => s.rollNumber?.toUpperCase() === typedRoll && s.role === "student"
          );

          if (found) {
            setUser(found);
            localStorage.setItem("upskill_mock_user", JSON.stringify(found));
            setLoading(false);
            resolve(found);
          } else {
            setLoading(false);
            reject(new Error("You are not in the list. Ask Admin to add."));
          }
        }, 1000);
      });
    }

    // 2. --- FIREBASE ACTIVE MODE ---
    try {
      const q = query(
        collection(db!, "users"),
        where("role", "==", "student"),
        where("rollNumber", "==", typedRoll)
      );
      const querySnap = await getDocs(q);
      
      let importedStudent: UserProfile | null = null;
      let originalDocId = "";
      
      querySnap.forEach((doc) => {
        importedStudent = doc.data() as UserProfile;
        originalDocId = doc.id;
      });

      if (!importedStudent) {
        throw new Error("You are not in the list. Ask Admin to add.");
      }

      const email = (importedStudent as UserProfile).email;
      const silentPassword = `${typedRoll.toLowerCase()}_upskill_2026`;

      if (!(importedStudent as UserProfile).isActivated) {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth!, email, silentPassword);
          const fbUser = userCredential.user;

          const activeProfile: UserProfile = {
            ...(importedStudent as UserProfile),
            uid: fbUser.uid,
            isActivated: true
          };

          await setDoc(doc(db!, "users", fbUser.uid), activeProfile);
          await setDoc(doc(db!, "students", fbUser.uid), activeProfile);

          if (originalDocId && originalDocId !== fbUser.uid) {
            await deleteDoc(doc(db!, "users", originalDocId));
          }

          setUser(activeProfile);
          return activeProfile;
        } catch (signUpError: unknown) {
          console.warn("Silent signup failed:", signUpError);
        }
      }

      const userCredential = await signInWithEmailAndPassword(auth!, email, silentPassword);
      const fbUser = userCredential.user;

      let profile = (await getDoc(doc(db!, "users", fbUser.uid))).data() as UserProfile;
      const studentDoc = await getDoc(doc(db!, "students", fbUser.uid));
      if (studentDoc.exists()) {
        profile = {
          ...profile,
          ...studentDoc.data()
        };
      }

      setUser(profile);
      return profile;
    } catch (error: unknown) {
      setUser(null);
      let message = "Roll number login failed.";
      if (error instanceof Error) {
        message = error.message;
      }
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  // Logout handler
  const logout = async (): Promise<void> => {
    setLoading(true);
    if (!isFirebaseActive) {
      setUser(null);
      localStorage.removeItem("upskill_mock_user");
      setLoading(false);
      return;
    }

    try {
      await signOut(auth!);
      setUser(null);
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isFirebaseActive, login, studentLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
