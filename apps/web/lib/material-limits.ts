// Keep the browser limits aligned with the API and the nginx upload limit.
export const PDF_MAX_MB = 20;
export const PDF_MAX_PAGES = 40;
export const PDF_MAX_BYTES = PDF_MAX_MB * 1024 * 1024;
export const PDF_UPLOAD_BODY_BYTES = 28 * 1024 * 1024;
export const PDF_EDIT_BODY_BYTES = 12 * 1024 * 1024;
