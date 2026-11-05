export const PDF_MAX_MB = 20;
export const PDF_MAX_PAGES = 40;
export const PDF_MAX_BYTES = PDF_MAX_MB * 1024 * 1024;
export const PDF_UPLOAD_BODY_BYTES = 28 * 1024 * 1024;
export const PDF_EDIT_BODY_BYTES = 12 * 1024 * 1024;
export const PDF_TEXT_PER_PAGE = 40000;
export const PDF_DOCUMENT_CHARACTERS = PDF_MAX_PAGES * (PDF_TEXT_PER_PAGE + 4000);

// Keep provider context and image payloads bounded while preserving page boundaries.
export function materialBatches<T extends { text: string }>(pages: T[]): T[][] {
  const batches: T[][] = [];
  let current: T[] = [];
  let characters = 0;
  for (const page of pages) {
    if (current.length && (current.length === 4 || characters + page.text.length > 12000)) {
      batches.push(current);
      current = [];
      characters = 0;
    }
    current.push(page);
    characters += page.text.length;
  }
  if (current.length) batches.push(current);
  return batches;
}
