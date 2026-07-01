import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  Timestamp,
  onSnapshot
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";

export interface Submission {
  id: string;
  studentId: string;
  studentName: string;
  rollNumber: string;
  branch: string;
  domain: string;
  date: string;
  session: string;
  mentorName: string;
  topic: string;
  summary: string;
  taskAssigned: boolean;
  taskDescription?: string;
  notes?: string;
  fileUrl?: string;
  fileName?: string;
  filePublicId?: string; // Cloudinary public_id
  createdAt: number;
}

// Initial mock submissions for rich UI preview
const INITIAL_MOCK_SUBMISSIONS: Submission[] = [
  {
    id: "sub-1",
    studentId: "mock-student-id",
    studentName: "Jane Doe",
    rollNumber: "22CSE1042",
    branch: "Computer Science & Engineering",
    domain: "Full Stack Web Development",
    date: "2026-06-25",
    session: "Session 12",
    mentorName: "Dr. Sarah Jenkins",
    topic: "Next.js 15 Routing Patterns & Middlewares",
    summary: "Reviewed Next.js 15 App Router routing mechanisms, specifically looking at parallel and intercepted routes. Explored layout caching behaviors and route protection via custom React-based hooks. Configured role route redirects dynamically.",
    taskAssigned: true,
    taskDescription: "Build a custom middleware to enforce role protection.",
    notes: "Requires testing dynamic route segments under layout wrappers.",
    fileUrl: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800",
    fileName: "nextjs_routing_notes.png",
    createdAt: Date.now() - 4 * 24 * 60 * 60 * 1000
  },
  {
    id: "sub-2",
    studentId: "mock-student-id",
    studentName: "Jane Doe",
    rollNumber: "22CSE1042",
    branch: "Computer Science & Engineering",
    domain: "Full Stack Web Development",
    date: "2026-06-27",
    session: "Session 13",
    mentorName: "Dr. Sarah Jenkins",
    topic: "Tailwind CSS Variable Mapping & next-themes",
    summary: "Worked on defining CSS variables inside the global stylesheet and mapping them in Tailwind v4 theme configuration block. Integrated next-themes class strategy for seamless dark/light styling on custom elements. Tested theme toggle accessibility.",
    taskAssigned: false,
    notes: "Everything compiled successfully, no pending issues.",
    createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000
  }
];

// Helper to initialize local storage list if empty
function getLocalStorageSubmissions(): Submission[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem("upskill_submissions");
  if (!stored) {
    localStorage.setItem("upskill_submissions", JSON.stringify(INITIAL_MOCK_SUBMISSIONS));
    return INITIAL_MOCK_SUBMISSIONS;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return INITIAL_MOCK_SUBMISSIONS;
  }
}

/**
 * Retrieve submissions for a specific student
 */
export async function getSubmissions(studentId: string): Promise<Submission[]> {
  if (!isFirebaseConfigured || !db) {
    // Offline Mock Fallback
    const local = getLocalStorageSubmissions();
    return local
      .filter((sub) => sub.studentId === studentId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  // Active Firebase Mode
  try {
    const q = query(
      collection(db, "learningUpdates"),
      where("studentId", "==", studentId)
    );
    const snap = await getDocs(q);
    const list: Submission[] = [];
    snap.forEach((doc) => {
      const data = doc.data();
      list.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : data.createdAt
      } as Submission);
    });
    return list.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error("Error fetching submissions from Firestore:", error);
    // Fallback to local storage if firestore call fails
    return getLocalStorageSubmissions().filter((sub) => sub.studentId === studentId);
  }
}

/**
 * Submit a new learning update
 */
export async function createSubmission(
  sub: Omit<Submission, "id" | "createdAt">
): Promise<Submission> {
  const newSub = {
    ...sub,
    createdAt: Date.now()
  };

  // Generate ID locally
  const localId = `sub-${Math.random().toString(36).substring(2, 11)}`;
  const submissionWithId: Submission = {
    ...newSub,
    id: localId
  };

  // Always write to local storage first
  if (typeof window !== "undefined") {
    const local = getLocalStorageSubmissions();
    local.push(submissionWithId);
    localStorage.setItem("upskill_submissions", JSON.stringify(local));
  }

  if (!isFirebaseConfigured || !db) {
    return submissionWithId;
  }

  // Active Firebase Mode
  try {
    const docRef = await addDoc(collection(db, "learningUpdates"), {
      ...newSub,
      createdAt: Timestamp.now()
    });
    return {
      id: docRef.id,
      ...newSub
    };
  } catch (error) {
    console.error("Error creating submission in Firestore (falling back to local storage):", error);
    // Return local submission if Firestore fails (e.g. permission error) so client stays functional
    return submissionWithId;
  }
}

/**
 * Real-time listener for student updates
 */
export function subscribeSubmissions(
  studentId: string,
  callback: (subs: Submission[]) => void
): () => void {
  if (!isFirebaseConfigured || !db) {
    const local = getLocalStorageSubmissions()
      .filter((sub) => sub.studentId === studentId)
      .sort((a, b) => b.createdAt - a.createdAt);
    callback(local);
    return () => {};
  }

  const q = query(
    collection(db, "learningUpdates"),
    where("studentId", "==", studentId)
  );

  return onSnapshot(q, (snap) => {
    const list: Submission[] = [];
    snap.forEach((doc) => {
      const data = doc.data();
      list.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : data.createdAt
      } as Submission);
    });
    callback(list.sort((a, b) => b.createdAt - a.createdAt));
  }, (err) => {
    console.error("Error in submissions real-time listener, falling back to local storage:", err);
    const local = getLocalStorageSubmissions()
      .filter((sub) => sub.studentId === studentId)
      .sort((a, b) => b.createdAt - a.createdAt);
    callback(local);
  });
}
