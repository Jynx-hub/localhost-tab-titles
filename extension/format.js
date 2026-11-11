// Pure helpers shared by the service worker and the popup.

export const FORMATS = [
  { id: "folder", label: "Folder · port" },
  { id: "branch", label: "Branch · port" },
  { id: "port-first", label: "Port · folder" },
  { id: "both", label: "Folder (branch) · port" },
];

export const DEFAULT_FORMAT = "folder";

/** "<name> · <port>" etc. Returns null when there's no name, so callers fall back to host:port. */
export function formatLabel(formatId, info, port) {
  const name = info?.name;
  if (!name) return null;
  const branch = info.branch || "";
  switch (formatId) {
    case "branch":
      return `${branch || name} · ${port}`;
    case "port-first":
      return `${port} · ${name}`;
    case "both":
      return branch && branch !== name ? `${name} (${branch}) · ${port}` : `${name} · ${port}`;
    default:
      return `${name} · ${port}`;
  }
}

/** { host, port } for a localhost-style URL, or null for anything else. */
export function parseLocalUrl(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  const h = u.hostname;
  const local = h === "localhost" || h === "127.0.0.1" || h === "0.0.0.0" || h === "[::1]" || h.endsWith(".localhost");
  if (!local) return null;
  return { host: u.host, port: u.port || (u.protocol === "https:" ? "443" : "80") };
}
