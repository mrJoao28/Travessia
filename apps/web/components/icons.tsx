export type IconName =
  | "book"
  | "users"
  | "document"
  | "message"
  | "settings"
  | "help"
  | "arrow"
  | "clock"
  | "list"
  | "eye";
const paths: Record<IconName, string> = {
  book: "M12 6C8 3 4 3 1 4v16c4-1 7-1 11 2 4-3 7-3 11-2V4c-3-1-7-1-11 2Zm0 0v16",
  users:
    "M16 21v-3c0-3-2-5-6-5s-6 2-6 5v3M10 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm8 1a4 4 0 0 1 0 8m1 2c3 1 4 3 4 6",
  document: "M5 2h11l4 4v16H5V2Zm10 0v6h5M8 12h9M8 16h9M8 19h5",
  message: "M21 11a9 9 0 0 1-9 9H8l-6 3 2-7a9 9 0 1 1 17-5Z",
  settings: "M2 6h8m4 0h8M2 18h12m4 0h4M10 3v6m4 6v6M10 6h4m0 12h4",
  help: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM9 8a3 3 0 1 1 5 3c-2 1-2 2-2 4m0 3h.01",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-16v7l5 3",
  list: "M7 5h15M7 12h15M7 19h15M2 5h.1M2 12h.1M2 19h.1",
  eye: "M2 2l20 20M9 5c6-2 11 3 13 7-1 2-2 3-4 5M6 6c-2 1-3 3-5 6 3 5 7 8 13 6M9 9a4 4 0 0 0 6 6",
};
export function Icon({ name }: { name: IconName }) {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
export function Brand() {
  return (
    <span className="brand-lockup">
      <svg viewBox="0 0 150 92" width="130" height="80" aria-hidden="true">
        <circle cx="59" cy="16" r="12" fill="var(--gold)" />
        <path
          d="M23 37c18 1 28 6 37 16 12-14 29-19 50-21v19c-23-1-38 6-36 13 2 8 36-5 50 12M23 37v30c16 0 27 4 37 9 7-4 14-6 22-7M60 53v23M29 43c12 1 22 5 28 11"
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
        />
      </svg>
      <strong>travessia</strong>
      <small>
        ENSINO SUPERIOR
        <br />
        PARA NOVOS HORIZONTES
      </small>
    </span>
  );
}
