import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Clock, Stethoscope, Banknote, CreditCard, UserRound, AlertTriangle, CheckCircle2, RefreshCw, History } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAppointmentTypeName } from "@/lib/appointmentTypes";
import { formatTimeTo12h } from "@/lib/time-slots";
import { apiUrl } from "@/lib/api";
import { getAuthHeaders } from "@/lib/auth-headers";
import { toast } from "sonner";
import { useDoctors } from "@/hooks/useDoctors";
import { formatBookingHistoryStatusLabel, normalizeBookingHistoryStatus, isSignificantBookingPaymentStatus } from "./sharedBookingLogic";

interface AppointmentHistoryViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentSnapshot: any;
  logDate: string;
  onViewCurrent?: (appointmentId: string) => void;
  onOpenAppointment?: (appointmentId: string, appointmentSnapshot?: any) => void;
  isAppointmentOpen?: boolean;
  isHistorical?: boolean;
}

type SnapshotState = "historical" | "latest" | "current";

const resolveAppointmentTypeName = (type: unknown, customType?: string) => {
  const numericType = typeof type === "number" ? type : typeof type === "string" && type.trim() ? Number(type) : NaN;

  if (Number.isFinite(numericType)) {
    return getAppointmentTypeName(numericType, customType);
  }

  if (typeof type === "string" && type.trim()) {
    return type;
  }

  return customType || "Appointment";
};

const resolvePatientName = (appointmentSnapshot: any) => {
  const patient = appointmentSnapshot?.patient;
  const nestedPatientName = typeof patient === "string"
    ? patient
    : patient?.name || patient?.fullName || [patient?.firstName, patient?.lastName].filter(Boolean).join(" ");
  const directPatientName =
    appointmentSnapshot?.patientName ||
    appointmentSnapshot?.patient_name ||
    [appointmentSnapshot?.patientFirstName, appointmentSnapshot?.patientLastName].filter(Boolean).join(" ");

  return directPatientName || nestedPatientName || appointmentSnapshot?.patientId || "No patient assigned";
};

const pickImageSource = (...sources: unknown[]) => {
  for (const source of sources) {
    if (typeof source !== "string") continue;
    const trimmed = source.trim();
    if (trimmed) return trimmed;
  }

  return undefined;
};

const resolveImageSource = (source?: string) => {
  if (!source) return undefined;
  if (
    source.startsWith("http") ||
    source.startsWith("data:") ||
    source.startsWith("blob:")
  ) {
    return source;
  }

  return apiUrl(source);
};

const getPatientProfilePicture = (snapshot: any, patientRecord?: any) =>
  pickImageSource(
    snapshot?.patientProfile,
    snapshot?.patientProfilePicture,
    snapshot?.patientPhoto,
    snapshot?.patientImage,
    snapshot?.patientAvatar,
    snapshot?.profilePicture,
    snapshot?.patient?.profilePicture,
    snapshot?.patient?.profilePictureUrl,
    snapshot?.patient?.photo,
    snapshot?.patient?.avatar,
    patientRecord?.profilePicture,
    patientRecord?.profilePictureUrl,
    patientRecord?.photo,
    patientRecord?.avatar
  );

const resolveDoctorName = (doctor: any) => {
  if (!doctor) return "";
  if (typeof doctor === "string") return doctor;
  return doctor.name || doctor.fullName || doctor.username || doctor.id || "";
};

const normalizeDoctorName = (doctor: any) => {
  const normalized = resolveDoctorName(doctor).replace(/^Dr\.\s+/i, "").toLowerCase().trim();
  return /^(none|null|undefined|unassigned|no doctor assigned)$/.test(normalized) ? "" : normalized;
};

const shortDoctorLabel = (fullName?: string, prefix = "From") => {
  if (!fullName) return "";
  const stripped = String(fullName).replace(/^Dr\.?\s+/i, "").trim();
  const first = stripped.split(/\s+/)[0] || stripped;
  return `${prefix} Dr. ${first}`;
};

const shortPatientLabel = (fullName?: string, prefix = "From") => {
  if (!fullName) return "";
  const stripped = String(fullName).trim();
  return `${prefix} ${stripped}`;
};

const shortScheduleLabel = (snapshot: any) => {
  if (!snapshot) return "";
  const date = snapshot?.date;
  const time = snapshot?.time;
  const duration = snapshot?.duration;
  try {
    const dateLabel = new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const timeLabel = formatAppointmentTimeRange(time, duration);
    return `${dateLabel} ${timeLabel}`;
  } catch (e) {
    return formatAppointmentTimeRange(time, duration) || String(date || "");
  }
};

const formatCompactTime = (time24?: string) => formatTimeTo12h(time24 || "").replace(/\s+/g, "");

const formatAppointmentTimeRange = (time?: string, duration?: unknown) => {
  const startLabel = formatCompactTime(time);
  const [hourPart, minutePart] = String(time || "").split(":");
  const hours = Number(hourPart);
  const minutes = Number(minutePart);
  const durationMinutes = Number(duration) || 0;

  if (!startLabel || !Number.isFinite(hours) || !Number.isFinite(minutes) || durationMinutes <= 0) {
    return startLabel || "No time";
  }

  const endTime = new Date(2000, 0, 1, hours, minutes + durationMinutes);
  const endTime24 = `${String(endTime.getHours()).padStart(2, "0")}:${String(endTime.getMinutes()).padStart(2, "0")}`;

  return `${startLabel} - ${formatCompactTime(endTime24)}`;
};

const isIgnorablePatientName = (name?: string) => {
  if (!name) return true;
  const n = String(name).trim().toLowerCase();
  return n === "" || /^(no patient assigned|no patient|occupied|unassigned|none|null|n\/a|-)$/.test(n);
};

const isValidDateValue = (value: any) => {
  if (value === undefined || value === null || String(value).trim() === "") return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
};

const isMeaningfulTime = (time?: string, duration?: unknown) => {
  const label = formatAppointmentTimeRange(time, duration);
  if (!label) return false;
  const n = String(label).trim().toLowerCase();
  return n !== "no time" && n !== "";
};

const isMeaningfulTreatmentName = (name?: string) => {
  if (!name) return false;
  const n = String(name).trim().toLowerCase();
  return n !== "appointment" && n !== "";
};

const isInsignificantStatus = (status?: string) => {
  const n = String(status ?? "").toLowerCase().trim();
  return n === "" || /^(updated|invalid|unknown|none|n\/a|-)$/.test(n);
};

const pickNumericValue = (...values: unknown[]) => {
  for (const value of values) {
    if (value === undefined || value === null || value === "") continue;
    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) return numericValue;
  }

  return null;
};

const getExplicitSnapshotPaymentAmount = (snapshot: any) =>
  pickNumericValue(
    snapshot?.amount,
    snapshot?.paymentAmount,
    snapshot?.newPayment,
    snapshot?.amountPaid,
    snapshot?.paymentDetails?.amount
  );

const isLogSnapshot = (snapshot: any) =>
  Boolean(snapshot?.logType || snapshot?.changeType || snapshot?.previousState || snapshot?.newState);

const isPatientChange = (snapshot: any) => {
  const prev = snapshot?.previousState;
  const next = snapshot?.newState;
  if (!prev || !next) return false;

  const resolvePatient = (s: any) => {
    if (!s) return "";
    if (typeof s.patient === "string") return s.patient;
    if (s.patient?.id) return String(s.patient.id);
    if (s.patient?.name) return String(s.patient.name);
    if (s.patientId) return String(s.patientId);
    if (s.patientName) return String(s.patientName || s.patient_name);
    const first = s.patientFirstName || s.patient?.firstName;
    const last = s.patientLastName || s.patient?.lastName;
    if (first || last) return [first, last].filter(Boolean).join(" ");
    return "";
  };

  const pPrev = String(resolvePatient(prev) || "").trim();
  const pNext = String(resolvePatient(next) || "").trim();
  return Boolean(pPrev && pNext && pPrev !== pNext);
};

type DoctorReassignment = {
  previousDoctorName: string;
  currentDoctorName: string;
};

export default function AppointmentHistoryView({ open, onOpenChange, appointmentSnapshot, logDate, onViewCurrent, onOpenAppointment, isAppointmentOpen, isHistorical }: AppointmentHistoryViewProps) {
  const [displayedSnapshot, setDisplayedSnapshot] = useState<any | null>(appointmentSnapshot);
  const [snapshotState, setSnapshotState] = useState<SnapshotState>(Boolean(isHistorical) ? "historical" : "current");
  const [isFetchingLogs, setIsFetchingLogs] = useState(false);
  const [patientRecord, setPatientRecord] = useState<any | null>(null);
  const [latestPaymentLogAmount, setLatestPaymentLogAmount] = useState<number | null>(null);
  const [latestDoctorReassignment, setLatestDoctorReassignment] = useState<DoctorReassignment | null>(null);
  const { doctors } = useDoctors(undefined, { enabled: open });
  const displayedPatientId = displayedSnapshot?.patientId || displayedSnapshot?.patient?.id || "";
  const displayedAppointmentId = displayedSnapshot?.id || displayedSnapshot?.appointmentId || "";

  useEffect(() => {
    setDisplayedSnapshot(appointmentSnapshot);
    // Prefer explicit snapshot metadata when available. If the snapshot includes
    // `_isHistorical` (set by `fetchSnapshotFromLogs`), honor that value. Otherwise
    // fall back to the `isHistorical` prop provided by the caller.
    const derivedHistorical = appointmentSnapshot && Object.prototype.hasOwnProperty.call(appointmentSnapshot, "_isHistorical")
      ? Boolean(appointmentSnapshot._isHistorical)
      : Boolean(isHistorical);
    setSnapshotState(derivedHistorical ? "historical" : "current");
  }, [appointmentSnapshot, isHistorical]);

  useEffect(() => {
    const patientId = String(displayedPatientId || "").trim();
    setPatientRecord(null);

    if (!open || !patientId || patientId === "Occupied" || patientId === "No patient assigned") return;

    const controller = new AbortController();
    const loadPatientRecord = async () => {
      try {
        const response = await fetch(apiUrl(`/api/patients/${encodeURIComponent(patientId)}`), {
          credentials: "include",
          headers: getAuthHeaders(),
          signal: controller.signal,
        });
        const result = await response.json().catch(() => null);
        if (response.ok && result?.success && result.data) {
          setPatientRecord(result.data);
        }
      } catch (error: any) {
        if (error?.name !== "AbortError") {
          console.warn("[AppointmentHistoryView] Failed to load patient photo:", error);
        }
      }
    };

    loadPatientRecord();

    return () => controller.abort();
  }, [open, displayedPatientId]);

  useEffect(() => {
    setLatestPaymentLogAmount(null);

    const appointmentId = String(displayedAppointmentId || "").trim();
    const explicitAmount = getExplicitSnapshotPaymentAmount(displayedSnapshot);
    if (
      !open ||
      !appointmentId ||
      snapshotState === "historical" ||
      (explicitAmount !== null && explicitAmount > 0)
    ) return;

    const controller = new AbortController();
    const loadLatestPaymentLogAmount = async () => {
      try {
        const response = await fetch(apiUrl(`/api/appointments/${encodeURIComponent(appointmentId)}/payments`), {
          credentials: "include",
          headers: getAuthHeaders(),
          signal: controller.signal,
        });
        const result = await response.json().catch(() => null);
        const logs = response.ok && result?.success && Array.isArray(result.data) ? result.data : [];
        const latestPositiveAmount = logs
          .map((log: any) => Number(log?.amount || 0))
          .find((amount: number) => amount > 0);

        setLatestPaymentLogAmount(latestPositiveAmount ?? 0);
      } catch (error: any) {
        if (error?.name !== "AbortError") {
          console.warn("[AppointmentHistoryView] Failed to load payment logs:", error);
          setLatestPaymentLogAmount(0);
        }
      }
    };

    loadLatestPaymentLogAmount();

    return () => controller.abort();
  }, [
    open,
    displayedAppointmentId,
    displayedSnapshot,
    snapshotState,
  ]);

  useEffect(() => {
    setLatestDoctorReassignment(null);

    const appointmentId = String(displayedAppointmentId || "").trim();
    if (!open || !appointmentId || snapshotState === "historical") return;

    const inlinePreviousDoctor = resolveDoctorName(displayedSnapshot?.previousDoctor || displayedSnapshot?.previousState?.doctor);
    const inlineCurrentDoctor = resolveDoctorName(
      displayedSnapshot?.newDoctor ||
      displayedSnapshot?.newState?.doctor ||
      displayedSnapshot?.doctor ||
      displayedSnapshot?.doctorName ||
      displayedSnapshot?.doctorId
    );
    const hasInlineReassignment =
      normalizeDoctorName(inlinePreviousDoctor) &&
      normalizeDoctorName(inlineCurrentDoctor) &&
      normalizeDoctorName(inlinePreviousDoctor) !== normalizeDoctorName(inlineCurrentDoctor);

    if (hasInlineReassignment) return;

    const controller = new AbortController();
    const loadLatestDoctorReassignment = async () => {
      try {
        const response = await fetch(apiUrl(`/api/appointments/${encodeURIComponent(appointmentId)}/logs`), {
          credentials: "include",
          headers: getAuthHeaders(),
          signal: controller.signal,
        });
        const result = await response.json().catch(() => null);
        const logs = response.ok && result?.success && Array.isArray(result.data) ? result.data : [];
        const currentDoctorNorm = normalizeDoctorName(inlineCurrentDoctor);
        const reassignmentLog = logs.find((log: any) => {
          const previousDoctor = resolveDoctorName(log?.previousState?.doctor);
          const nextDoctor = resolveDoctorName(log?.newState?.doctor);
          const previousNorm = normalizeDoctorName(previousDoctor);
          const nextNorm = normalizeDoctorName(nextDoctor);

          return (
            previousNorm &&
            nextNorm &&
            previousNorm !== nextNorm &&
            (!currentDoctorNorm || nextNorm === currentDoctorNorm)
          );
        });

        if (!reassignmentLog) return;

        setLatestDoctorReassignment({
          previousDoctorName: resolveDoctorName(reassignmentLog.previousState?.doctor),
          currentDoctorName: resolveDoctorName(reassignmentLog.newState?.doctor),
        });
      } catch (error: any) {
        if (error?.name !== "AbortError") {
          console.warn("[AppointmentHistoryView] Failed to load appointment logs:", error);
        }
      }
    };

    loadLatestDoctorReassignment();

    return () => controller.abort();
  }, [
    open,
    displayedAppointmentId,
    displayedSnapshot,
    snapshotState,
  ]);

  if (!displayedSnapshot) return null;

  const appointmentDate = new Date(displayedSnapshot.date);
  const formattedDate = Number.isNaN(appointmentDate.getTime()) ? String(displayedSnapshot.date || "No date") : appointmentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const resolvedLogDate = logDate || displayedSnapshot.changedAt || displayedSnapshot.updatedAt || displayedSnapshot.createdAt || new Date().toISOString();
  const isDateOnlyLog = typeof resolvedLogDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(resolvedLogDate);
  const parsedLogDate = new Date(isDateOnlyLog ? `${resolvedLogDate}T00:00:00` : resolvedLogDate);
  const snapshotDate = Number.isNaN(parsedLogDate.getTime())
    ? String(resolvedLogDate)
    : isDateOnlyLog
      ? parsedLogDate.toLocaleDateString()
      : parsedLogDate.toLocaleString();
  const typeName = resolveAppointmentTypeName(displayedSnapshot.type, displayedSnapshot.customType);
  const patientName = resolvePatientName(displayedSnapshot);
  const resolvedPatientImage = resolveImageSource(getPatientProfilePicture(displayedSnapshot, patientRecord));
  const rawDisplayedDoctorName = resolveDoctorName(displayedSnapshot.doctor || displayedSnapshot.doctorName || displayedSnapshot.doctorId);
  const displayedDoctorName = normalizeDoctorName(rawDisplayedDoctorName) ? rawDisplayedDoctorName : "";
  const rawPreviousDoctorName = resolveDoctorName(displayedSnapshot.previousDoctor || displayedSnapshot.previousState?.doctor);
  const rawCurrentDoctorName = resolveDoctorName(displayedSnapshot.newDoctor || displayedSnapshot.newState?.doctor || displayedDoctorName);
  const previousDoctorName = normalizeDoctorName(rawPreviousDoctorName) ? rawPreviousDoctorName : "";
  const currentDoctorName = normalizeDoctorName(rawCurrentDoctorName) ? rawCurrentDoctorName : "";
  const hasDoctorReassignment =
    previousDoctorName &&
    currentDoctorName &&
    normalizeDoctorName(previousDoctorName) !== normalizeDoctorName(currentDoctorName);
  const fetchedDoctorReassignmentMatchesCurrent = Boolean(
    latestDoctorReassignment?.previousDoctorName &&
    latestDoctorReassignment?.currentDoctorName &&
    normalizeDoctorName(latestDoctorReassignment.previousDoctorName) !== normalizeDoctorName(latestDoctorReassignment.currentDoctorName) &&
    (!currentDoctorName || normalizeDoctorName(latestDoctorReassignment.currentDoctorName) === normalizeDoctorName(currentDoctorName))
  );
  const resolvedPreviousDoctorName = hasDoctorReassignment
    ? previousDoctorName
    : fetchedDoctorReassignmentMatchesCurrent
      ? latestDoctorReassignment?.previousDoctorName || ""
      : "";
  const resolvedCurrentDoctorName = hasDoctorReassignment
    ? currentDoctorName
    : fetchedDoctorReassignmentMatchesCurrent
      ? currentDoctorName || latestDoctorReassignment?.currentDoctorName || ""
      : "";
  const hasResolvedDoctorReassignment = Boolean(resolvedPreviousDoctorName && resolvedCurrentDoctorName);

  const doctorRecord = doctors.find((doctor: any) =>
    String(doctor.id) === String(displayedSnapshot.doctorId || displayedDoctorName) ||
    String(doctor.name) === String(displayedDoctorName) ||
    normalizeDoctorName(doctor.name) === normalizeDoctorName(displayedDoctorName)
  );
  const doctorImage =
    displayedSnapshot.doctorProfile ||
    displayedSnapshot.doctorProfilePicture ||
    displayedSnapshot.doctorPhoto ||
    displayedSnapshot.doctor?.profilePicture ||
    displayedSnapshot.doctor?.profilePictureUrl ||
    doctorRecord?.profilePicture ||
    (doctorRecord as any)?.profilePictureUrl;

  const resolvedDoctorImage = resolveImageSource(pickImageSource(doctorImage));

  // Prepare previous / next state values for explicit change lines
  const prevState = displayedSnapshot?.previousState || null;
  const nextState = displayedSnapshot?.newState || displayedSnapshot || null;

  const prevPatientName = prevState ? resolvePatientName(prevState) : null;
  const nextPatientName = nextState ? resolvePatientName(nextState) : patientName;

  const prevTreatmentName = prevState ? resolveAppointmentTypeName(prevState.type, prevState.customType) : null;
  const nextTreatmentName = nextState ? resolveAppointmentTypeName(nextState.type, nextState.customType) : typeName;

  // Price calculations: account for `discount` on snapshots (appointments may store `discount`)
  const getBasePrice = (s: any) => (s ? pickNumericValue(s.price, s.amount, s.totalPrice) : null);
  const getDiscountValue = (s: any) => {
    const d = s ? pickNumericValue(s.discount) : null;
    return Number(d ?? 0);
  };

  const prevBase = getBasePrice(prevState);
  const prevDiscount = prevState ? getDiscountValue(prevState) : 0;
  const prevPrice = prevBase !== null ? Math.max(0, Number(prevBase) - Number(prevDiscount)) : null;

  const nextBase = getBasePrice(nextState) ?? getBasePrice(displayedSnapshot);
  const nextDiscount = nextState ? (getDiscountValue(nextState) || getDiscountValue(displayedSnapshot)) : getDiscountValue(displayedSnapshot);
  const nextPrice = nextBase !== null ? Math.max(0, Number(nextBase) - Number(nextDiscount)) : null;

  // Values for rendering: prefer next (current) values, fallback to previous or raw snapshot
  const displayedBasePrice = nextBase ?? prevBase ?? pickNumericValue(displayedSnapshot.price) ?? 0;
  const displayedDiscountAmount = Number(nextDiscount ?? prevDiscount ?? pickNumericValue(displayedSnapshot.discount) ?? 0);
  const displayedEffectivePrice = nextPrice ?? prevPrice ?? Math.max(0, Number(displayedBasePrice) - Number(displayedDiscountAmount));

  // Parse numeric remaining balance (accepts numbers or currency strings)
  const parseCurrencyNumber = (v: any) => {
    if (v === undefined || v === null) return null;
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
    const cleaned = String(v).replace(/[^0-9.-]/g, '');
    const n2 = Number(cleaned);
    return Number.isFinite(n2) ? n2 : null;
  };

  const displayedBalanceNumeric = parseCurrencyNumber(displayedSnapshot.balance ?? displayedSnapshot.remaining ?? displayedSnapshot.balanceAmount);

  const prevStatus = prevState?.status || null;
  const nextStatus = nextState?.status || displayedSnapshot?.status || null;

  const prevPaymentStatus = prevState?.paymentStatus || null;
  const nextPaymentStatus = nextState?.paymentStatus || displayedSnapshot?.paymentStatus || null;

  const prevStatusNorm = normalizeBookingHistoryStatus(prevStatus);
  const nextStatusNorm = normalizeBookingHistoryStatus(nextStatus || displayedSnapshot?.status);
  const prevPaymentStatusNorm = normalizeBookingHistoryStatus(prevPaymentStatus);
  const nextPaymentStatusNorm = normalizeBookingHistoryStatus(nextPaymentStatus || displayedSnapshot?.paymentStatus);

  const prevScheduleLabel = prevState ? `${new Date(prevState.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })} ${formatAppointmentTimeRange(prevState.time, prevState.duration)}` : null;
  const nextScheduleLabel = nextState ? `${new Date(nextState.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })} ${formatAppointmentTimeRange(nextState.time, nextState.duration)}` : null;
  const changedByName = displayedSnapshot.changedByName || appointmentSnapshot?.changedByName;
  const isPastSnapshot = snapshotState === "historical";
  // Consider the snapshot to be a "log view" only when it's actually historical.
  // Many snapshots reconstructed from logs include `previousState`/`newState` metadata
  // but may represent the most-recent (current) state — those should not be shown as
  // historical. Use `snapshotState` (which prefers `_isHistorical` when available)
  // as the authoritative source.
  const openedFromLog = isLogSnapshot(displayedSnapshot) && isPastSnapshot;

  // Use authoritative snapshotState to determine header label/prefix.
  // Treat "latest" the same as "current" (show as Current) so the most recent log appears as Current.
  const stateLabel = isPastSnapshot ? "Log" : "Current";

  const stateBadgeClass = snapshotState === "historical"
    ? "border-amber-200 bg-amber-50 text-amber-700"
    : "border-emerald-200 bg-emerald-50 text-emerald-700";

  const StateIcon = snapshotState === "historical" ? History : CheckCircle2;

  const timestampPrefix = snapshotState === "historical" ? "Logged on" : "Current as of";
  const isLogView = isPastSnapshot; // authoritative
  const explicitSnapshotPaymentAmount = getExplicitSnapshotPaymentAmount(displayedSnapshot);
  const snapshotPaymentAmount = isLogView
    ? // historical log: show any explicit payment amount recorded on the log (or 0)
      explicitSnapshotPaymentAmount ?? 0
    : // current view: prefer explicit snapshot payment if present, else fall back to latest payment log amount
      (explicitSnapshotPaymentAmount && explicitSnapshotPaymentAmount > 0 ? explicitSnapshotPaymentAmount : latestPaymentLogAmount ?? 0);

  // Compute total paid (price - remaining balance) when possible, fallback to snapshot payment
  const totalPaidAmount = (displayedBalanceNumeric !== null && Number.isFinite(Number(displayedEffectivePrice)))
    ? Math.max(0, Number(displayedEffectivePrice) - Number(displayedBalanceNumeric))
    : (snapshotPaymentAmount ?? 0);

  const displayedBalanceLabel = displayedBalanceNumeric !== null
    ? `₱${Number(displayedBalanceNumeric).toLocaleString()}`
    : (displayedSnapshot.balance !== undefined && displayedSnapshot.balance !== null ? String(displayedSnapshot.balance) : '₱0');

  const patientChanged = isPatientChange(displayedSnapshot);
  const changeSuffix = patientChanged ? "Patient Changed" : (changedByName ? `by ${changedByName}` : "");

  const appointmentId = displayedAppointmentId;
  const canOpenAppointment = Boolean(appointmentId && snapshotState === "current" && onOpenAppointment && !isAppointmentOpen);

  const viewLatestSnapshot = () => {
    if (appointmentId && typeof onViewCurrent === "function") {
      onViewCurrent(appointmentId);
      return;
    }

    fetchLatestLogSnapshot();
  };

  const fetchLatestLogSnapshot = async () => {
    if (!appointmentId) {
      toast.error("No appointment id available for logs");
      return;
    }

    setIsFetchingLogs(true);
    try {
      const res = await fetch(apiUrl(`/api/appointments/${encodeURIComponent(appointmentId)}/logs`), {
        credentials: "include",
        headers: getAuthHeaders(),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(payload?.message || "Failed to fetch appointment logs");
        return;
      }

      const logs = Array.isArray(payload.data) ? payload.data : [];
      if (!logs.length) {
        toast.error("No logs found for this appointment");
        return;
      }

      // Server returns logs ordered desc; take the first as the most recent
      const latest = logs[0];
      const snap = latest.newState && Object.keys(latest.newState).length > 0 ? latest.newState : latest.previousState;
      if (!snap) {
        toast.error("No snapshot data available in latest log");
        return;
      }

      // Attach metadata
      snap.id = snap.id || appointmentId;
      snap.changedAt = latest.changedAt;
      snap.changedByName = latest.changedByName;

      setDisplayedSnapshot(snap);
      setSnapshotState("current");
    } catch (err) {
      console.error("Failed to load logs:", err);
      toast.error("Failed to load appointment logs");
    } finally {
      setIsFetchingLogs(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] overflow-hidden">
        <DialogHeader>
          <div className="flex w-full flex-col gap-3 pr-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1 min-w-0">
              <DialogTitle className="flex flex-wrap items-center gap-2 text-primary">
                <Clock className="w-5 h-5 shrink-0" />
                <span className="truncate">Appointment Snapshot</span>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide shrink-0 ${stateBadgeClass}`}>
                  <StateIcon className="h-3.5 w-3.5" />
                  {stateLabel}
                </span>
              </DialogTitle>
              <DialogDescription className="truncate">
                {timestampPrefix} {snapshotDate}{changeSuffix ? ` ${changeSuffix}` : ""}
              </DialogDescription>
            </div>

            <div className="flex items-center gap-2 shrink-0 sm:ml-4">
              {canOpenAppointment ? (
                <Button
                  className="h-9 rounded-xl bg-blue-600 px-4 font-bold text-white shadow-sm hover:bg-blue-700"
                  title="Open this appointment"
                  onClick={() => onOpenAppointment?.(String(appointmentId), displayedSnapshot)}
                >
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  Open
                </Button>
              ) : null}
              {isPastSnapshot ? (
                <Button
                  className="h-9 rounded-xl bg-blue-600 px-4 font-bold text-white shadow-sm hover:bg-blue-700"
                  title={appointmentId ? "Open the current appointment snapshot" : "No appointment id available"}
                  disabled={!appointmentId || isFetchingLogs}
                  onClick={viewLatestSnapshot}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isFetchingLogs ? "animate-spin" : ""}`} />
                  Latest
                </Button>
              ) : null}
            </div>
          </div>
        </DialogHeader>

        {isPastSnapshot ? (
          <div className="mt-2 mb-3 p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <div>
              This is an older payment log. Use "Latest" to open the current appointment details before making decisions.
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
          {/* Schedule Info */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-11 w-11 rounded-md border border-slate-200 bg-white shadow-sm">
                <AvatarImage src={resolvedPatientImage} alt={patientName} className="object-cover" />
                <AvatarFallback className="rounded-md bg-white">
                  <UserRound className="w-5 h-5 text-blue-600" />
                </AvatarFallback>
              </Avatar>
              <div>
                <Label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Patient</Label>
                <p className="font-medium text-slate-900">{patientName}</p>
                {prevState && nextState && prevPatientName && nextPatientName && prevPatientName !== nextPatientName && !isIgnorablePatientName(prevPatientName) ? (
                  <p className="mt-1 text-xs font-semibold text-blue-700">{shortPatientLabel(prevPatientName)}</p>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-white p-2 rounded-md shadow-sm border border-slate-200">
                <CalendarIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <Label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Date</Label>
                <p className="font-medium text-slate-900">{formattedDate}</p>
                {prevState && nextState && prevState.date !== nextState.date && isValidDateValue(prevState.date) ? (
                  <p className="mt-1 text-xs font-semibold text-blue-700">From {new Date(prevState.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-white p-2 rounded-md shadow-sm border border-slate-200">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <Label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Time</Label>
                <p className="font-medium text-slate-900">{formatAppointmentTimeRange(displayedSnapshot.time, displayedSnapshot.duration)}</p>
                {prevState && nextState && (prevState.time !== nextState.time || (prevState.duration || 0) !== (nextState.duration || 0)) && isMeaningfulTime(prevState.time, prevState.duration) ? (
                  <p className="mt-1 text-xs font-semibold text-blue-700">From {formatAppointmentTimeRange(prevState.time, prevState.duration)}</p>
                ) : null}
              </div>
            </div>

            {/* Service block */}
            <div className="flex items-center gap-3">
              <div className="bg-white p-2 rounded-md shadow-sm border border-slate-200">
                <Stethoscope className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <Label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Service</Label>
                <p className="font-medium text-slate-900">{typeName}</p>
                {prevState && nextState && prevTreatmentName && nextTreatmentName && prevTreatmentName !== nextTreatmentName && isMeaningfulTreatmentName(prevTreatmentName) ? (
                  <p className="mt-1 text-xs font-semibold text-blue-700">From {prevTreatmentName}</p>
                ) : null}
              </div>
            </div>

            {/* Doctor block */}
            <div className="flex items-center gap-3">
              <Avatar className="h-11 w-11 rounded-md border border-slate-200 bg-white shadow-sm">
                <AvatarImage src={resolvedDoctorImage} alt={displayedDoctorName || "Doctor"} className="object-cover" />
                <AvatarFallback className="rounded-md bg-white">
                  <Stethoscope className="w-5 h-5 text-blue-600" />
                </AvatarFallback>
              </Avatar>
              <div>
                <Label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Doctor</Label>
                <p className="font-medium text-slate-900">{displayedDoctorName || "No doctor assigned"}</p>
                {(() => {
                  const prevDoc = prevState ? resolveDoctorName(prevState?.doctor || prevState?.doctorName || prevState?.doctorId) : "";
                  const nextDoc = nextState ? resolveDoctorName(nextState?.doctor || nextState?.doctorName || nextState?.doctorId) : "";
                  const prevDocNorm = prevDoc ? normalizeDoctorName(prevDoc) : "";
                  const nextDocNorm = nextDoc ? normalizeDoctorName(nextDoc) : "";
                  const resolvedPrevNorm = resolvedPreviousDoctorName ? normalizeDoctorName(resolvedPreviousDoctorName) : "";
                  const resolvedNextNorm = resolvedCurrentDoctorName ? normalizeDoctorName(resolvedCurrentDoctorName) : "";

                  const docChanged = (
                    (resolvedPrevNorm && resolvedNextNorm && resolvedPrevNorm !== resolvedNextNorm) ||
                    (prevDocNorm && nextDocNorm && prevDocNorm !== nextDocNorm)
                  );

                  if (!docChanged) return null;

                  const labelSource = (resolvedPrevNorm && resolvedNextNorm) ? resolvedPreviousDoctorName : prevDoc;
                  return <p className="mt-1 text-xs font-semibold text-blue-700">{shortDoctorLabel(labelSource)}</p>;
                })()}
              </div>
            </div>
          </div>

          {/* Status & Financials */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <Label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Status</Label>
              <div className="mt-1">
                 <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  (nextStatus || displayedSnapshot.status) === 'completed' ? 'bg-green-100 text-green-700' :
                  (nextStatus || displayedSnapshot.status) === 'cancelled' ? 'bg-red-100 text-red-700' :
                  'bg-blue-100 text-blue-700'
                }`}> 
                  {formatBookingHistoryStatusLabel(nextStatus || displayedSnapshot.status).toUpperCase()}
                </span>
                {prevStatus && nextStatus && prevStatusNorm && nextStatusNorm && !isInsignificantStatus(prevStatusNorm) && prevStatusNorm !== nextStatusNorm ? (
                  <p className="mt-1 text-xs text-slate-600">{formatBookingHistoryStatusLabel(prevStatus)} → {formatBookingHistoryStatusLabel(nextStatus)}</p>
                ) : null}
              </div>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <Label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Payment</Label>
              <div className="mt-1">
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  (nextPaymentStatus || displayedSnapshot.paymentStatus) === 'paid' ? 'bg-green-100 text-green-700' :
                  (nextPaymentStatus || displayedSnapshot.paymentStatus) === 'half-paid' ? 'bg-amber-100 text-amber-700' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {formatBookingHistoryStatusLabel(nextPaymentStatus || displayedSnapshot.paymentStatus).toUpperCase()}
                </span>
                {prevPaymentStatus && nextPaymentStatus && prevPaymentStatusNorm && nextPaymentStatusNorm && !isInsignificantStatus(prevPaymentStatusNorm) && prevPaymentStatusNorm !== nextPaymentStatusNorm ? (
                  <p className="mt-1 text-xs text-slate-600">{formatBookingHistoryStatusLabel(prevPaymentStatus)} → {formatBookingHistoryStatusLabel(nextPaymentStatus)}</p>
                ) : null}
              </div>
            </div>
          </div>

          {/* Cancellation Reason - shown when appointment is cancelled */}
          {displayedSnapshot.status === 'cancelled' && displayedSnapshot.cancellationReason && (
            <div className="bg-red-50 p-3 rounded-lg border border-red-200">
              <Label className="text-[10px] uppercase text-red-600 font-bold tracking-wider">Cancellation Reason</Label>
              <p className="mt-1 text-sm text-red-700 font-medium">{displayedSnapshot.cancellationReason}</p>
            </div>
          )}

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Banknote className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium">Price</span>
              </div>
              {prevPrice !== null && nextPrice !== null && Number(prevPrice) !== Number(nextPrice) && Number(prevPrice) > 0 ? (
                <div className="text-right">
                  <div className="font-bold">₱{Number(nextPrice).toLocaleString()}</div>
                  <div className="text-xs font-semibold text-blue-700">From ₱{Number(prevPrice).toLocaleString()}</div>
                </div>
              ) : (
                (displayedDiscountAmount > 0) ? (
                  <div className="text-right">
                    <div className="text-xs text-blue-200 line-through opacity-80 mb-0.5">₱{Number(displayedBasePrice).toLocaleString()}</div>
                    <div className="font-bold">₱{Number(displayedEffectivePrice).toLocaleString()}</div>
                  </div>
                ) : (
                  <span className="font-bold">₱{(Number(displayedEffectivePrice) || 0).toLocaleString()}</span>
                )
              )}
            </div>
            {isLogSnapshot(displayedSnapshot) && (
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-green-600">
                  <CreditCard className="w-4 h-4" />
                  <span className="text-sm font-medium">Paid in Snapshot</span>
                </div>
                <span className="font-bold text-green-600">₱{snapshotPaymentAmount.toLocaleString()}</span>
              </div>
            )}
            {totalPaidAmount !== null ? (
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-medium">Total Paid</span>
                </div>
                <span className="font-bold">₱{Number(totalPaidAmount).toLocaleString()}</span>
              </div>
            ) : null}
            <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
              <span className="text-sm font-bold text-slate-700">Remaining Balance</span>
                <span className="text-lg font-black text-primary">{displayedBalanceLabel}</span>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <Label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Notes</Label>
            <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap italic">
              {displayedSnapshot.notes || (displayedSnapshot.status === 'cancelled' && displayedSnapshot.cancellationReason ? displayedSnapshot.cancellationReason : "—")}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button onClick={() => onOpenChange(false)} variant="secondary" className="flex-1">
            Close Snapshot
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
