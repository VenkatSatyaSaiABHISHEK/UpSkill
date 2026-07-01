import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  writeBatch,
  Timestamp,
  addDoc,
  onSnapshot,
  query,
  where,
  getDoc,
  setDoc
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";
import { UserProfile } from "@/context/auth-context";
import { Submission } from "./submissions";
import { getRandomAvatar } from "./utils";

// Struct representing imported CSV user profiles
export interface CSVStudentRow {
  rollNumber: string;
  fullName: string;
  email: string;
  phone?: string;
  college?: string;
  branch?: string;
  domain?: string;
  mentorName?: string;
  mentorPhone?: string;
}

// Temporary local cache list of students in Mock Mode
const MOCK_STUDENTS_LIST: UserProfile[] = [
  {
    uid: "mock-student-id",
    email: "student@upskill.com",
    username: "student",
    fullName: "Jane Doe",
    role: "student",
    rollNumber: "22CSE1042",
    branch: "Computer Science & Engineering",
    domain: "Full Stack Web Development",
    mentorName: "Dr. Sarah Jenkins",
    avatarUrl: getRandomAvatar("22CSE1042"),
    isActivated: true
  },
  {
    uid: "mock-student-2",
    email: "abhishek@upskill.com",
    username: "abhishek",
    fullName: "Abhishek Kumar",
    role: "student",
    rollNumber: "22ECE0531",
    branch: "Electronics & Communication",
    domain: "Frontend Engineering",
    mentorName: "Michael Chen",
    avatarUrl: getRandomAvatar("22ECE0531"),
    isActivated: true
  },
  {
    uid: "mock-student-3",
    email: "sarah.p@upskill.com",
    username: "sarah",
    fullName: "Sarah Parker",
    role: "student",
    rollNumber: "22CSE0211",
    branch: "Computer Science",
    domain: "Firebase Architectures",
    mentorName: "Michael Chen",
    avatarUrl: getRandomAvatar("22CSE0211"),
    isActivated: false // Onboarding pending
  }
];

// Helper to access cached/local storage students list
function getLocalStorageStudents(): UserProfile[] {
  if (typeof window === "undefined") return MOCK_STUDENTS_LIST;
  const stored = localStorage.getItem("upskill_students_directory");
  if (!stored) {
    localStorage.setItem("upskill_students_directory", JSON.stringify(MOCK_STUDENTS_LIST));
    return MOCK_STUDENTS_LIST;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return MOCK_STUDENTS_LIST;
  }
}

function saveLocalStorageStudents(list: UserProfile[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem("upskill_students_directory", JSON.stringify(list));
  }
}

/**
 * Audit trail logger helper
 */
export async function logActivity(action: string, actor: string, details: string): Promise<void> {
  const log = {
    action,
    actor,
    details,
    timestamp: Date.now()
  };
  if (!isFirebaseConfigured || !db) {
    console.log("[ActivityLog Mock]:", log);
    return;
  }
  try {
    await addDoc(collection(db!, "activityLogs"), log);
  } catch (error) {
    console.error("Failed to log activity in Firestore:", error);
  }
}

/**
 * Fetch all students (role: 'student')
 */
export async function getAdminStudents(): Promise<UserProfile[]> {
  if (!isFirebaseConfigured || !db) {
    return getLocalStorageStudents();
  }

  try {
    // Queries from the students collection
    const snap = await getDocs(collection(db, "students"));
    const list: UserProfile[] = [];
    snap.forEach((doc) => {
      list.push({ uid: doc.id, ...doc.data() } as UserProfile);
    });
    return list;
  } catch (error) {
    console.error("Firestore getStudents failed, falling back to local:", error);
    return getLocalStorageStudents();
  }
}

/**
 * Update student profile record
 */
export async function updateStudentProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
  // Always update local storage first
  const local = getLocalStorageStudents();
  const idx = local.findIndex((s) => s.uid === uid);
  if (idx !== -1) {
    local[idx] = { ...local[idx], ...data };
    saveLocalStorageStudents(local);
  }

  if (!isFirebaseConfigured || !db) {
    return;
  }

  try {
    // Update users profile collection which holds the primary student record
    await updateDoc(doc(db!, "users", uid), data);

    // If they have activated, update their copy in detailed students collection as well
    try {
      const studentDocRef = doc(db!, "students", uid);
      const studentDocSnap = await getDoc(studentDocRef);
      if (studentDocSnap.exists()) {
        await updateDoc(studentDocRef, data);
      }
    } catch (studentErr) {
      console.warn("Non-critical: Failed to update students collection:", studentErr);
    }

    await logActivity("EDIT_STUDENT", "admin", `Updated profile details for student ${data.fullName || uid}`);
  } catch (error) {
    console.error("Firestore update student failed (fell back to local storage):", error);
  }
}

/**
 * Delete student profile record
 */
export async function deleteStudentProfile(uid: string): Promise<void> {
  // Always update local storage first
  const local = getLocalStorageStudents();
  const filtered = local.filter((s) => s.uid !== uid);
  saveLocalStorageStudents(filtered);

  if (!isFirebaseConfigured || !db) {
    return;
  }

  try {
    await deleteDoc(doc(db!, "users", uid));
    await deleteDoc(doc(db!, "students", uid));
    await logActivity("DELETE_STUDENT", "admin", `Deleted student profile with UID ${uid}`);
  } catch (error) {
    console.error("Firestore delete student failed (fell back to local storage):", error);
  }
}

/**
 * Fetch submissions from all users
 */
export async function getAllSubmissions(): Promise<Submission[]> {
  if (!isFirebaseConfigured || !db) {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem("upskill_submissions");
    if (!stored) return [];
    try {
      const list = JSON.parse(stored) as Submission[];
      return list.sort((a, b) => b.createdAt - a.createdAt);
    } catch {
      return [];
    }
  }

  try {
    const snap = await getDocs(collection(db, "learningUpdates"));
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
    console.error("Firestore getAllSubmissions failed:", error);
    return [];
  }
}

/**
 * Parse client-side student CSV string
 */
export function parseStudentCSV(csvText: string): CSVStudentRow[] {
  const rows: CSVStudentRow[] = [];
  const lines = csvText.split(/\r?\n/);
  
  if (lines.length < 2) return [];

  // Parse headers
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^["']|["']$/g, ""));
  
  // Field mappings mapping column names to parsed fields
  const getIndex = (keys: string[]) => 
    headers.findIndex((h) => keys.some((k) => h.toLowerCase().includes(k.toLowerCase())));

  const rollIdx = getIndex(["roll", "reg", "id"]);
  const nameIdx = getIndex(["name", "full name", "student"]);
  const emailIdx = getIndex(["email", "mail"]);
  const phoneIdx = getIndex(["phone", "mobile", "contact"]);
  const collegeIdx = getIndex(["college", "university", "institute"]);
  const branchIdx = getIndex(["branch", "department", "stream"]);
  const domainIdx = getIndex(["domain", "track", "technology"]);
  const mentorIdx = getIndex(["mentor", "advisor"]);
  const mentorPhoneIdx = getIndex(["mentor phone", "mentor contact", "mentor's mobile", "mentor mobile", "mentor's mobile num"]);

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Robust CSV split logic: character-by-character scanner to support commas in quotes and spaces
    const cells: string[] = [];
    let currentCell = "";
    let inQuotes = false;
    for (let charIdx = 0; charIdx < line.length; charIdx++) {
      const char = line[charIdx];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        cells.push(currentCell.trim().replace(/^["']|["']$/g, ""));
        currentCell = "";
      } else {
        currentCell += char;
      }
    }
    cells.push(currentCell.trim().replace(/^["']|["']$/g, ""));

    if (cells.length === 0 || !cells[rollIdx] || !cells[nameIdx]) continue;

    rows.push({
      rollNumber: cells[rollIdx],
      fullName: cells[nameIdx],
      email: cells[emailIdx] || `${cells[nameIdx].toLowerCase().replace(/\s+/g, "")}@upskill.com`,
      phone: phoneIdx !== -1 ? cells[phoneIdx] : undefined,
      college: collegeIdx !== -1 ? cells[collegeIdx] : undefined,
      branch: branchIdx !== -1 ? cells[branchIdx] : undefined,
      domain: domainIdx !== -1 ? cells[domainIdx] : undefined,
      mentorName: mentorIdx !== -1 ? cells[mentorIdx] : undefined,
      mentorPhone: mentorPhoneIdx !== -1 ? cells[mentorPhoneIdx] : undefined
    });
  }

  return rows;
}

/**
 * Batch upload parsed CSV student rows to Firestore
 */
export async function importStudentList(rows: CSVStudentRow[]): Promise<void> {
  const defaultStudents = rows.map((r) => ({
    fullName: r.fullName,
    email: r.email,
    username: r.email.split("@")[0],
    role: "student" as const,
    rollNumber: r.rollNumber,
    branch: r.branch || "General",
    domain: r.domain || "Web Development",
    mentorName: r.mentorName || "Unassigned",
    avatarUrl: getRandomAvatar(r.rollNumber),
    isActivated: false,
    phone: r.phone || "",
    college: r.college || "",
    mentorPhone: r.mentorPhone || ""
  }));

  // Always write to Local Storage first
  const local = getLocalStorageStudents();
  const studentsWithUid = defaultStudents.map((s, idx) => ({
    ...s,
    uid: `mock-student-imported-${Date.now()}-${idx}`
  }));
  const merged = [...local, ...studentsWithUid];
  saveLocalStorageStudents(merged);

  if (!isFirebaseConfigured || !db) {
    return new Promise((resolve) => setTimeout(resolve, 1500));
  }

  // Live Firebase batch upload
  try {
    const batch = writeBatch(db!);
    studentsWithUid.forEach((stud) => {
      // Create a document using our generated uid to keep local/remote identical
      const userRef = doc(db!, "users", stud.uid);
      batch.set(userRef, stud);
    });
    await batch.commit();
    await logActivity("CSV_IMPORT", "admin", `Imported ${defaultStudents.length} student directory templates`);
  } catch (error) {
    console.error("Firestore batch import failed (fell back to local storage):", error);
  }
}

/**
 * Add a single student manually
 */
export async function addStudent(student: CSVStudentRow): Promise<void> {
  const emailVal = student.email ? student.email.trim() : `${student.fullName.toLowerCase().replace(/\s+/g, "")}@upskill.com`;
  
  const newStudent = {
    fullName: student.fullName,
    email: emailVal,
    username: emailVal.split("@")[0],
    role: "student" as const,
    rollNumber: student.rollNumber.toUpperCase().trim(),
    branch: student.branch || "General",
    domain: student.domain || "Web Development",
    mentorName: student.mentorName || "Unassigned",
    avatarUrl: getRandomAvatar(student.rollNumber),
    isActivated: false,
    phone: student.phone || "",
    college: student.college || "",
    mentorPhone: student.mentorPhone || ""
  };

  // Always write to local storage first
  const local = getLocalStorageStudents();
  const generatedUid = `mock-student-manual-${Date.now()}`;
  const studentWithUid = {
    ...newStudent,
    uid: generatedUid
  };
  const merged = [...local, studentWithUid];
  saveLocalStorageStudents(merged);

  if (!isFirebaseConfigured || !db) {
    return new Promise((resolve) => setTimeout(resolve, 800));
  }

  try {
    // Write using our generated uid to ensure identical IDs on local and remote
    await setDoc(doc(db!, "users", generatedUid), studentWithUid);
    await logActivity("ADD_STUDENT", "admin", `Manually added student ${newStudent.fullName} (${newStudent.rollNumber})`);
  } catch (error) {
    console.error("Firestore add student failed (fell back to local storage):", error);
  }
}

export function subscribeAdminStudents(
  callback: (students: UserProfile[]) => void,
  errorCallback?: (err: Error) => void
): () => void {
  if (!isFirebaseConfigured || !db) {
    const local = getLocalStorageStudents();
    callback(local);
    return () => {};
  }

  const q = query(collection(db!, "users"), where("role", "==", "student"));
  return onSnapshot(q, (snap) => {
    const list: UserProfile[] = [];
    snap.forEach((doc) => {
      list.push({ uid: doc.id, ...doc.data() } as UserProfile);
    });
    callback(list);
  }, (err) => {
    console.error("subscribeAdminStudents failed, falling back to local storage:", err);
    const local = getLocalStorageStudents();
    callback(local);
    if (errorCallback) errorCallback(err);
  });
}

export function subscribeAllSubmissions(
  callback: (subs: Submission[]) => void,
  errorCallback?: (err: Error) => void
): () => void {
  if (!isFirebaseConfigured || !db) {
    if (typeof window === "undefined") {
      callback([]);
      return () => {};
    }
    const stored = localStorage.getItem("upskill_submissions");
    if (!stored) {
      callback([]);
      return () => {};
    }
    try {
      const list = JSON.parse(stored) as Submission[];
      callback(list.sort((a, b) => b.createdAt - a.createdAt));
    } catch {
      callback([]);
    }
    return () => {};
  }

  const q = collection(db!, "learningUpdates");
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
    console.error("subscribeAllSubmissions failed, falling back to local storage:", err);
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("upskill_submissions");
      if (stored) {
        try {
          const list = JSON.parse(stored) as Submission[];
          callback(list.sort((a, b) => b.createdAt - a.createdAt));
        } catch {
          callback([]);
        }
      } else {
        callback([]);
      }
    } else {
      callback([]);
    }
    if (errorCallback) errorCallback(err);
  });
}
