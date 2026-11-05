export type StudentDraft = {
  versionId: string;
  revision: number;
  content: string;
  completed: string[];
  stepId: string;
};

export function readStudentDraft(key: string): StudentDraft | null {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "null");
    if (value && typeof value.versionId === "string" && Number.isSafeInteger(value.revision)
        && typeof value.content === "string" && value.content.length <= 12000
        && typeof value.stepId === "string" && Array.isArray(value.completed)
        && value.completed.every((id: unknown) => typeof id === "string")) return value;
  } catch { /* Storage can be unavailable. */ }
  return null;
}

export function storeStudentDraft(key: string, value: StudentDraft | null): boolean {
  try {
    if (value) localStorage.setItem(key, JSON.stringify(value));
    else localStorage.removeItem(key);
    return true;
  } catch { return false; }
}
