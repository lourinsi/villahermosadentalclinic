import { apiUrl } from "@/lib/api";
import { getAuthHeaders } from "@/lib/auth-headers";

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
};

export async function fetchSnapshotFromLogs(appointmentId: string, logDate?: string): Promise<any | null> {
  if (!appointmentId || !logDate) return null;

  const res = await fetch(apiUrl(`/api/appointments/${encodeURIComponent(appointmentId)}/logs`), {
    credentials: "include",
    headers: getAuthHeaders(),
  });

  const payload = (await res.json().catch(() => ({}))) as ApiResponse<any[]>;
  if (!res.ok) {
    throw new Error(payload.message || `Failed to load logs for ${appointmentId}`);
  }

  const logs = Array.isArray(payload.data) ? payload.data : [];
  if (!logs.length) return null;

  // Normalize transaction time. If logDate is date-only (YYYY-MM-DD) treat as end of day.
  let txTime = Date.parse(String(logDate));
  if (Number.isNaN(txTime) && /^\d{4}-\d{2}-\d{2}$/.test(String(logDate))) {
    txTime = Date.parse(`${logDate}T23:59:59`);
  }
  if (Number.isNaN(txTime)) return null;

  // Sort ascending and pick the newest log with changedAt <= txTime
  const sorted = logs.slice().sort((a: any, b: any) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime());
  let matched: any = null;
  for (const l of sorted) {
    const t = new Date(l.changedAt).getTime();
    if (!Number.isNaN(t) && t <= txTime) matched = l;
    if (t > txTime) break;
  }

  if (!matched) return null;

  const snapshot = matched.newState ?? matched.previousState ?? null;
  if (!snapshot) return null;

  // Attach metadata and ensure we have an id for the appointment
  if (!snapshot.id) snapshot.id = appointmentId;
  snapshot.changedAt = matched.changedAt;
  snapshot.changedByName = matched.changedByName;
  snapshot._isHistorical = sorted[sorted.length - 1] !== matched;

  return snapshot;
}

export default fetchSnapshotFromLogs;
