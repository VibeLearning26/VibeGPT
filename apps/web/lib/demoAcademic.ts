import { SUBJECTS, type Subject } from "./mockData";

const STORAGE_KEY = "vibegpt_demo_subjects_v1";
export const ACADEMIC_DATA_EVENT = "vibegpt-academic-data-changed";

export function readDemoSubjects(): Subject[] {
  if (typeof window === "undefined") return SUBJECTS;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return SUBJECTS;
  try {
    const parsed = JSON.parse(stored) as Subject[];
    return Array.isArray(parsed) ? parsed : SUBJECTS;
  } catch {
    return SUBJECTS;
  }
}

export function writeDemoSubjects(subjects: Subject[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(subjects));
  window.dispatchEvent(new Event(ACADEMIC_DATA_EVENT));
}
