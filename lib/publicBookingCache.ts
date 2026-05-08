const PUBLIC_BOOKING_PATIENTS_KEY = "villahermosa.publicBookingPatients";

export type PublicBookingPatient = {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  [key: string]: any;
};

export function getCachedPublicBookingPatients(): PublicBookingPatient[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(PUBLIC_BOOKING_PATIENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function cachePublicBookingPatient(patient: PublicBookingPatient) {
  if (typeof window === "undefined" || !patient?.id) return;

  const normalized = {
    ...patient,
    id: String(patient.id),
    name: patient.name || `${patient.firstName || ""} ${patient.lastName || ""}`.trim() || "Patient",
  };

  const existing = getCachedPublicBookingPatients();
  const next = [
    normalized,
    ...existing.filter((cached) => String(cached.id) !== String(normalized.id)),
  ];

  window.localStorage.setItem(PUBLIC_BOOKING_PATIENTS_KEY, JSON.stringify(next));
}

export async function createPublicBookingAppointment({
  patient,
  date,
  time,
  duration,
  type,
  customType,
  doctor,
  notes,
}: {
  patient: PublicBookingPatient;
  date: string;
  time: string;
  duration: number;
  type: number;
  customType?: string;
  doctor: string;
  notes?: string;
}) {
  const nameParts = String(patient.name || "").trim().split(/\s+/);
  const firstName = patient.firstName || nameParts[0] || "Patient";
  const lastName = patient.lastName || nameParts.slice(1).join(" ") || "Guest";

  const response = await fetch("http://localhost:3001/api/appointments/public-book", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      patientId: patient.id,
      firstName,
      lastName,
      email: patient.email || "",
      phone: patient.phone || "",
      date,
      time,
      duration,
      type,
      customType,
      doctor,
      notes: notes || "",
    }),
  });

  const result = await response.json();
  if (result?.success && result.data) {
    return result.data;
  }

  throw new Error(result?.message || "Failed to request appointment");
}
