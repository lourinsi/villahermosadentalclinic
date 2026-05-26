import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import ApproveRejectDialog from "./ApproveRejectDialog";
import { Calendar as CalendarIcon, Clock, Stethoscope, Banknote, CreditCard, UserRound, AlertTriangle, CheckCircle2, RefreshCw, History } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAppointmentTypeName } from "@/lib/appointmentTypes";
import { formatTimeTo12h } from "@/lib/time-slots";
import { apiUrl } from "@/lib/api";
import { getAuthHeaders } from "@/lib/auth-headers";
import { toast } from "sonner";
import { useDoctors } from "@/hooks/useDoctors";
import { useAppointmentModal } from "@/hooks/useAppointmentModal";
import { formatBookingHistoryStatusLabel, normalizeBookingHistoryStatus, isSignificantBookingPaymentStatus } from "./sharedBookingLogic";
import { getDefaultAppointmentStatusColors, getDefaultPaymentStatusColors } from "@/lib/status-colors";

interface AppointmentHistoryViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentSnapshot: any;
  logDate: string;
  onViewCurrent?: (appointmentId: string) => void;
  onOpenAppointment?: (appointmentId: string, appointmentSnapshot?: any) => void;
  isAppointmentOpen?: boolean;
  isHistorical?: boolean;
  actionsDisabled?: boolean;
  restoreNotificationId?: string;
  onRestoreNotification?: (notificationId: string) => void | Promise<void>;
  openedFromBookingModal?: boolean;
}

type SnapshotState = "historical" | "latest" | "current";
type CurrentFieldChange = {
  title: string;
};

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

const isPlainObject = (value: unknown): value is Record<string, any> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const getComparableSnapshotState = (snapshot: any) => {
  if (!snapshot) return null;
  return isPlainObject(snapshot.newState) && Object.keys(snapshot.newState).length > 0
    ? { ...snapshot, ...snapshot.newState }
    : snapshot;
};

const normalizeComparableText = (value: unknown) =>
  String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");

const normalizeComparableDate = (value: unknown) => {
  if (value === undefined || value === null || String(value).trim() === "") return "";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return normalizeComparableText(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const formatChangeValue = (value: unknown) => {
  const text = String(value ?? "").trim();
  return text || "Not set";
};

const createCurrentFieldChange = (
  fieldName: string,
  snapshotValue: unknown,
  currentValue: unknown,
  snapshotLabel = formatChangeValue(snapshotValue),
  currentLabel = formatChangeValue(currentValue),
  normalize: (value: unknown) => string = normalizeComparableText
): CurrentFieldChange | null => {
  const normalizedCurrent = normalize(currentValue);
  const normalizedSnapshot = normalize(snapshotValue);

  if (currentValue === undefined || currentValue === null || normalizedCurrent === normalizedSnapshot) return null;

  return {
    title: `Current ${fieldName}: ${currentLabel}.`,
  };
};

const CurrentChangeIndicator = ({ change }: { change?: CurrentFieldChange | null }) => {
  if (!change) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="inline-flex h-5 w-5 shrink-0 cursor-help items-center justify-center rounded-full bg-amber-100 text-amber-700 ring-1 ring-amber-200"
          aria-label={change.title}
          title={change.title}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[260px]">
        {change.title}
      </TooltipContent>
    </Tooltip>
  );
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

export default function AppointmentHistoryView({ open, onOpenChange, appointmentSnapshot, logDate, onViewCurrent, onOpenAppointment, isAppointmentOpen, isHistorical, actionsDisabled = false, restoreNotificationId, onRestoreNotification, openedFromBookingModal = false }: AppointmentHistoryViewProps) {
  const [displayedSnapshot, setDisplayedSnapshot] = useState<any | null>(appointmentSnapshot);
  const [snapshotState, setSnapshotState] = useState<SnapshotState>(Boolean(isHistorical) ? "historical" : "current");
  const [isFetchingLogs, setIsFetchingLogs] = useState(false);
  const [patientRecord, setPatientRecord] = useState<any | null>(null);
  const [latestPaymentLogAmount, setLatestPaymentLogAmount] = useState<number | null>(null);
  const [latestComparisonSnapshot, setLatestComparisonSnapshot] = useState<any | null>(null);
  const { doctors } = useDoctors(undefined, { enabled: open });
  const displayedPatientId = displayedSnapshot?.patientId || displayedSnapshot?.patient?.id || "";
  const displayedAppointmentId = displayedSnapshot?.id || displayedSnapshot?.appointmentId || "";

  // Appointment action helpers (approve/reject) using central appointment modal hook
  const { updateAppointment } = useAppointmentModal();
  const [isApproveConfirmOpen, setIsApproveConfirmOpen] = useState(false);
  const [isRejectConfirmOpen, setIsRejectConfirmOpen] = useState(false);
  const [pendingActionSnapshot, setPendingActionSnapshot] = useState<any | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

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
    setLatestComparisonSnapshot(null);

    const appointmentId = String(displayedAppointmentId || "").trim();
    if (!open || !appointmentId || snapshotState !== "historical" || !isLogSnapshot(displayedSnapshot)) return;

    const controller = new AbortController();
    const loadLatestComparisonSnapshot = async () => {
      try {
        const currentResponse = await fetch(apiUrl(`/api/appointments/${encodeURIComponent(appointmentId)}`), {
          credentials: "include",
          headers: getAuthHeaders(),
          signal: controller.signal,
        });
        const currentResult = await currentResponse.json().catch(() => null);

        if (currentResponse.ok && currentResult?.data) {
          setLatestComparisonSnapshot(currentResult.data);
          return;
        }

        const logsResponse = await fetch(apiUrl(`/api/appointments/${encodeURIComponent(appointmentId)}/logs`), {
          credentials: "include",
          headers: getAuthHeaders(),
          signal: controller.signal,
        });
        const logsResult = await logsResponse.json().catch(() => null);
        const logs = logsResponse.ok && logsResult?.success && Array.isArray(logsResult.data) ? logsResult.data : [];
        const latestLog = logs[0];
        const latestState = getComparableSnapshotState(latestLog);

        if (latestState) {
          setLatestComparisonSnapshot({
            ...latestState,
            id: latestState.id || appointmentId,
            changedAt: latestLog?.changedAt || latestState.changedAt,
            changedByName: latestLog?.changedByName || latestState.changedByName,
          });
        }
      } catch (error: any) {
        if (error?.name !== "AbortError") {
          console.warn("[AppointmentHistoryView] Failed to load current comparison snapshot:", error);
        }
      }
    };

    loadLatestComparisonSnapshot();

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
  const displayedStatusColors = getDefaultAppointmentStatusColors(nextStatus || displayedSnapshot?.status);
  const displayedPaymentStatusColors = getDefaultPaymentStatusColors(nextPaymentStatus || displayedSnapshot?.paymentStatus);

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

  const latestStateForComparison = openedFromLog ? getComparableSnapshotState(latestComparisonSnapshot) : null;
  const formatCurrencyLabel = (value: number) => `\u20b1${Number(value).toLocaleString()}`;
  const normalizeNumberComparison = (value: unknown) => {
    const numeric = parseCurrencyNumber(value);
    return numeric === null ? normalizeComparableText(value) : String(numeric);
  };
  const formatLongDate = (value: unknown) => {
    const date = new Date(String(value || ""));
    return Number.isNaN(date.getTime()) ? formatChangeValue(value || "No date") : date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  const getPatientIdentity = (snapshot: any) => {
    const patient = snapshot?.patient;
    if (patient && typeof patient !== "string" && patient.id) return String(patient.id);
    return String(snapshot?.patientId || snapshot?.patient_id || "").trim();
  };
  const resolveDoctorDisplayNameFromSnapshot = (snapshot: any) => {
    const rawName = resolveDoctorName(snapshot?.doctor || snapshot?.doctorName || snapshot?.doctorId);
    const normalizedRawName = normalizeDoctorName(rawName);
    if (!normalizedRawName) return "";

    const matchedDoctor = doctors.find((doctor: any) =>
      String(doctor.id) === String(snapshot?.doctorId || rawName) ||
      String(doctor.name) === String(rawName) ||
      normalizeDoctorName(doctor.name) === normalizedRawName
    );

    return resolveDoctorName(matchedDoctor?.name || rawName);
  };

  const latestStatus = latestStateForComparison?.status;
  const latestPaymentStatus = latestStateForComparison?.paymentStatus;
  const latestBalanceNumeric = latestStateForComparison
    ? parseCurrencyNumber(latestStateForComparison.balance ?? latestStateForComparison.remaining ?? latestStateForComparison.balanceAmount)
    : null;
  const latestBasePrice = getBasePrice(latestStateForComparison);
  const latestDiscountAmount = latestStateForComparison ? getDiscountValue(latestStateForComparison) : 0;
  const latestEffectivePrice = latestBasePrice !== null ? Math.max(0, Number(latestBasePrice) - Number(latestDiscountAmount)) : null;
  const latestPatientName = latestStateForComparison ? resolvePatientName(latestStateForComparison) : "";
  const latestDoctorDisplayName = latestStateForComparison ? resolveDoctorDisplayNameFromSnapshot(latestStateForComparison) : "";
  const latestTimeLabel = latestStateForComparison ? formatAppointmentTimeRange(latestStateForComparison.time, latestStateForComparison.duration) : "";
  const displayedTimeLabel = formatAppointmentTimeRange(displayedSnapshot.time, displayedSnapshot.duration);
  const latestHasTreatment = Boolean(latestStateForComparison && (latestStateForComparison.type !== undefined || latestStateForComparison.customType));
  const latestTreatmentName = latestHasTreatment ? resolveAppointmentTypeName(latestStateForComparison.type, latestStateForComparison.customType) : "";
  const latestTotalPaidAmount = latestBalanceNumeric !== null && latestEffectivePrice !== null
    ? Math.max(0, Number(latestEffectivePrice) - Number(latestBalanceNumeric))
    : null;
  const displayedNotesComparisonText = displayedSnapshot.notes || (displayedSnapshot.status === 'cancelled' ? displayedSnapshot.cancellationReason || "" : "");
  const latestNotesComparisonText = latestStateForComparison
    ? latestStateForComparison.notes || (latestStateForComparison.status === 'cancelled' ? latestStateForComparison.cancellationReason || "" : "")
    : undefined;
  const displayedNotesText = displayedNotesComparisonText || "No additional notes provided for this snapshot.";

  const statusCurrentChange = createCurrentFieldChange(
    "status",
    nextStatus || displayedSnapshot.status,
    latestStatus,
    formatBookingHistoryStatusLabel(nextStatus || displayedSnapshot.status),
    formatBookingHistoryStatusLabel(latestStatus),
    normalizeBookingHistoryStatus
  );
  const paymentStatusCurrentChange = createCurrentFieldChange(
    "payment status",
    nextPaymentStatus || displayedSnapshot.paymentStatus,
    latestPaymentStatus,
    formatBookingHistoryStatusLabel(nextPaymentStatus || displayedSnapshot.paymentStatus),
    formatBookingHistoryStatusLabel(latestPaymentStatus),
    normalizeBookingHistoryStatus
  );
  const balanceCurrentChange = createCurrentFieldChange(
    "remaining balance",
    displayedBalanceNumeric,
    latestBalanceNumeric,
    displayedBalanceLabel,
    latestBalanceNumeric !== null ? formatCurrencyLabel(latestBalanceNumeric) : undefined,
    normalizeNumberComparison
  );
  const patientCurrentChange = createCurrentFieldChange(
    "patient",
    getPatientIdentity(displayedSnapshot) || patientName,
    latestStateForComparison ? getPatientIdentity(latestStateForComparison) || latestPatientName : undefined,
    patientName,
    latestPatientName
  );
  const doctorCurrentChange = createCurrentFieldChange(
    "assigned doctor",
    displayedDoctorName || "No doctor assigned",
    latestStateForComparison ? latestDoctorDisplayName || "No doctor assigned" : undefined,
    displayedDoctorName || "No doctor assigned",
    latestDoctorDisplayName || "No doctor assigned",
    normalizeDoctorName
  );
  const dateCurrentChange = createCurrentFieldChange(
    "date",
    displayedSnapshot.date,
    latestStateForComparison?.date,
    formattedDate,
    latestStateForComparison ? formatLongDate(latestStateForComparison.date) : undefined,
    normalizeComparableDate
  );
  const timeCurrentChange = createCurrentFieldChange(
    "time slot",
    `${displayedSnapshot.time || ""}|${displayedSnapshot.duration || ""}`,
    latestStateForComparison ? `${latestStateForComparison.time || ""}|${latestStateForComparison.duration || ""}` : undefined,
    displayedTimeLabel,
    latestTimeLabel
  );
  const serviceCurrentChange = createCurrentFieldChange(
    "service",
    typeName,
    latestHasTreatment ? latestTreatmentName : undefined,
    typeName,
    latestTreatmentName
  );
  const priceCurrentChange = createCurrentFieldChange(
    "service price",
    displayedEffectivePrice,
    latestEffectivePrice,
    formatCurrencyLabel(Number(displayedEffectivePrice) || 0),
    latestEffectivePrice !== null ? formatCurrencyLabel(latestEffectivePrice) : undefined,
    normalizeNumberComparison
  );
  const totalPaidCurrentChange = createCurrentFieldChange(
    "total amount paid",
    totalPaidAmount,
    latestTotalPaidAmount,
    formatCurrencyLabel(Number(totalPaidAmount) || 0),
    latestTotalPaidAmount !== null ? formatCurrencyLabel(latestTotalPaidAmount) : undefined,
    normalizeNumberComparison
  );
  const cancellationReasonCurrentChange = createCurrentFieldChange(
    "cancellation reason",
    displayedSnapshot.cancellationReason,
    latestStateForComparison ? latestStateForComparison.cancellationReason || "" : undefined,
    displayedSnapshot.cancellationReason || "Not set",
    latestStateForComparison?.cancellationReason || "Not set"
  );
  const notesCurrentChange = createCurrentFieldChange(
    "notes",
    displayedNotesComparisonText,
    latestNotesComparisonText,
    displayedNotesComparisonText || "No notes",
    latestNotesComparisonText || "No notes"
  );

  const patientChanged = isPatientChange(displayedSnapshot);
  const changeSuffix = patientChanged ? "Patient Changed" : (changedByName ? `by ${changedByName}` : "");

  const appointmentId = displayedAppointmentId;
  const canOpenAppointment = Boolean(!actionsDisabled && appointmentId && snapshotState === "current" && onOpenAppointment && !isAppointmentOpen);
  const canRestoreNotification = Boolean(actionsDisabled && restoreNotificationId && onRestoreNotification);

  const viewLatestSnapshot = () => {
    if (appointmentId && typeof onViewCurrent === "function") {
      onViewCurrent(appointmentId);
      return;
    }

    fetchLatestLogSnapshot();
  };

  // Action handlers mirroring RequestsView behavior
  const openApproveConfirm = (snap: any) => {
    setPendingActionSnapshot(snap);
    setIsApproveConfirmOpen(true);
  };

  const openRejectConfirm = (snap: any) => {
    setPendingActionSnapshot(snap);
    setIsRejectConfirmOpen(true);
  };

  const performApprove = async () => {
    if (!pendingActionSnapshot) return;
    setIsProcessingAction(true);
    try {
      const currentStatus = normalizeBookingHistoryStatus(pendingActionSnapshot?.status || displayedSnapshot?.status || "");
      let newStatus = "scheduled";
      if (currentStatus === "tbd") newStatus = "completed";
      const idToUpdate = String(pendingActionSnapshot.id || displayedAppointmentId || "");
      await updateAppointment(idToUpdate, { status: newStatus });
      toast.success("Appointment updated");
      // trigger a global refresh event used in other views
      setTimeout(() => window.dispatchEvent(new Event('refreshNotifications')), 500);
      setIsApproveConfirmOpen(false);
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update appointment");
    } finally {
      setIsProcessingAction(false);
      setPendingActionSnapshot(null);
    }
  };

  const performReject = async () => {
    if (!pendingActionSnapshot) return;
    setIsProcessingAction(true);
    try {
      const idToUpdate = String(pendingActionSnapshot.id || displayedAppointmentId || "");
      await updateAppointment(idToUpdate, { status: "cancelled" });
      toast.success("Appointment cancelled");
      setTimeout(() => window.dispatchEvent(new Event('refreshNotifications')), 500);
      setIsRejectConfirmOpen(false);
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to cancel appointment");
    } finally {
      setIsProcessingAction(false);
      setPendingActionSnapshot(null);
    }
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
      setLatestComparisonSnapshot(null);
    } catch (err) {
      console.error("Failed to load logs:", err);
      toast.error("Failed to load appointment logs");
    } finally {
      setIsFetchingLogs(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[520px] overflow-hidden p-0 sm:p-0">
        <DialogHeader>
          <div className="flex w-full flex-col gap-3 p-6 pb-2 pr-10 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1 min-w-0 pr-2">
              <DialogTitle className="flex flex-wrap items-center gap-2 text-primary">
                <Clock className="w-5 h-5 shrink-0" />
                <span className="truncate">Appointment Snapshot</span>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide shrink-0 ${stateBadgeClass}`}>
                  <StateIcon className="h-3.5 w-3.5" />
                  {stateLabel}
                </span>
              </DialogTitle>
              <DialogDescription className="truncate text-xs sm:text-sm">
                {timestampPrefix} {snapshotDate}{changeSuffix ? ` ${changeSuffix}` : ""}
              </DialogDescription>
            </div>

            <div className="flex items-center gap-2 shrink-0 sm:ml-2">
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
          <div className="mx-6 mt-2 mb-3 p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-[13px] flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <div>
              This is an older appointment log. Use "Latest" to open the current appointment details before making decisions.
            </div>
          </div>
        ) : null}

        <div className="grid gap-6 px-6 py-6 max-h-[75vh] overflow-y-auto pr-4 custom-scrollbar bg-slate-50/40">
          {/* Top Summary Cards - Redesigned for better alignment and aesthetics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col min-h-[100px]">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-[10px] uppercase text-slate-400 font-bold tracking-[0.1em]">Status</Label>
                <CurrentChangeIndicator change={statusCurrentChange} />
              </div>
              <div className="flex-1 flex flex-col justify-center gap-1">
                <span className={`inline-flex w-fit px-3.5 py-1.5 rounded-full text-[11px] font-black tracking-wider uppercase shadow-sm ${displayedStatusColors.bgColor} ${displayedStatusColors.textColor}`}>
                  {formatBookingHistoryStatusLabel(nextStatus || displayedSnapshot.status)}
                </span>
                <div className="min-h-[14px]">
                  {prevStatus && nextStatus && prevStatusNorm && nextStatusNorm && !isInsignificantStatus(prevStatusNorm) && prevStatusNorm !== nextStatusNorm ? (
                    <p className="text-[10px] text-slate-400 font-bold italic truncate flex items-center gap-1">
                      <History className="w-2.5 h-2.5" />
                      Was {formatBookingHistoryStatusLabel(prevStatus)}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col min-h-[100px]">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-[10px] uppercase text-slate-400 font-bold tracking-[0.1em]">Payment</Label>
                <CurrentChangeIndicator change={paymentStatusCurrentChange} />
              </div>
              <div className="flex-1 flex flex-col justify-center gap-1">
                <span className={`inline-flex w-fit px-3.5 py-1.5 rounded-full text-[11px] font-black tracking-wider uppercase shadow-sm ${displayedPaymentStatusColors.bgColor} ${displayedPaymentStatusColors.textColor}`}>
                  {formatBookingHistoryStatusLabel(nextPaymentStatus || displayedSnapshot.paymentStatus)}
                </span>
                <div className="min-h-[14px]">
                  {prevPaymentStatus && nextPaymentStatus && prevPaymentStatusNorm && nextPaymentStatusNorm && !isInsignificantStatus(prevPaymentStatusNorm) && prevPaymentStatusNorm !== nextPaymentStatusNorm ? (
                    <p className="text-[10px] text-slate-400 font-bold italic truncate flex items-center gap-1">
                      <History className="w-2.5 h-2.5" />
                      Was {formatBookingHistoryStatusLabel(prevPaymentStatus)}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {/* Balance Highlight Card - More "Pretty" and focused */}
          <div className="bg-gradient-to-br from-primary/[0.07] to-primary/[0.02] p-5 rounded-3xl border border-primary/10 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <Banknote className="w-16 h-16 text-primary" />
            </div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-white p-3 rounded-2xl shadow-sm border border-primary/10">
                  <Banknote className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <Label className="text-[10px] uppercase text-primary/60 font-black tracking-[0.15em] mb-0.5 block">Settlement</Label>
                  <p className="text-sm font-bold text-slate-500">Remaining Balance</p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <p className="text-3xl font-black text-primary tracking-tighter">{displayedBalanceLabel}</p>
                  <CurrentChangeIndicator change={balanceCurrentChange} />
                </div>
              </div>
            </div>
          </div>

          {/* Participants Card - Elegant hierarchy */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm space-y-6">
            <div className="flex items-start gap-4">
              <div className="relative">
                <Avatar className="h-14 w-14 rounded-2xl border-4 border-slate-50 shadow-md transition-transform hover:scale-105">
                  <AvatarImage src={resolvedPatientImage} alt={patientName} className="object-cover" />
                  <AvatarFallback className="rounded-2xl bg-slate-50">
                    <UserRound className="w-7 h-7 text-blue-400" />
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-lg shadow-sm border border-slate-100">
                  <UserRound className="w-3 h-3 text-blue-500" />
                </div>
              </div>
              <div className="min-w-0 pt-0.5">
                <Label className="text-[9px] uppercase text-slate-400 font-black tracking-[0.2em] mb-1 block">Patient Record</Label>
                <div className="flex min-w-0 items-center gap-2">
                  <p className="font-black text-slate-800 truncate text-lg leading-tight tracking-tight">{patientName}</p>
                  <CurrentChangeIndicator change={patientCurrentChange} />
                </div>
                {/* Show warning if patient changed in log/historical view, or if prevState/nextState differ */}
                {(() => {
                  // In historical/log view, compare displayed patient to latest/current patient
                  if (isPastSnapshot && latestStateForComparison) {
                    const logPatient = getPatientIdentity(displayedSnapshot) || patientName;
                    const currentPatient = getPatientIdentity(latestStateForComparison) || latestPatientName;
                    if (
                      logPatient &&
                      currentPatient &&
                      logPatient !== currentPatient &&
                      !isIgnorablePatientName(logPatient)
                    ) {
                      return (
                        <p className="text-[11px] font-bold text-blue-500/80 mt-1 flex items-center gap-1">
                          <History className="w-2.5 h-2.5" />
                          {shortPatientLabel(logPatient)}
                        </p>
                      );
                    }
                  }
                  // Fallback: original logic for prevState/nextState
                  if (
                    prevState &&
                    nextState &&
                    prevPatientName &&
                    nextPatientName &&
                    prevPatientName !== nextPatientName &&
                    !isIgnorablePatientName(prevPatientName)
                  ) {
                    return (
                      <p className="text-[11px] font-bold text-blue-500/80 mt-1 flex items-center gap-1">
                        <History className="w-2.5 h-2.5" />
                        {shortPatientLabel(prevPatientName)}
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>

            <div className="h-px bg-slate-100/80 mx-2" />

            <div className="flex items-start gap-4">
              <div className="relative">
                <Avatar className="h-14 w-14 rounded-2xl border-4 border-slate-50 shadow-md transition-transform hover:scale-105">
                  <AvatarImage src={resolvedDoctorImage} alt={displayedDoctorName || "Doctor"} className="object-cover" />
                  <AvatarFallback className="rounded-2xl bg-slate-50">
                    <Stethoscope className="w-7 h-7 text-emerald-400" />
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-lg shadow-sm border border-slate-100">
                  <Stethoscope className="w-3 h-3 text-emerald-500" />
                </div>
              </div>
              <div className="min-w-0 pt-0.5">
                <Label className="text-[9px] uppercase text-slate-400 font-black tracking-[0.2em] mb-1 block">Assigned Doctor</Label>
                <div className="flex min-w-0 items-center gap-2">
                  <p className="font-black text-slate-800 truncate text-lg leading-tight tracking-tight">{displayedDoctorName || "No doctor assigned"}</p>
                  <CurrentChangeIndicator change={openedFromBookingModal ? doctorCurrentChange : null} />
                </div>
                {(() => {
                  if (!openedFromBookingModal) return null;

                  const prevDoc = prevState ? resolveDoctorName(prevState?.doctor || prevState?.doctorName || prevState?.doctorId) : "";
                  const nextDoc = nextState ? resolveDoctorName(nextState?.doctor || nextState?.doctorName || nextState?.doctorId) : "";
                  const prevDocNorm = prevDoc ? normalizeDoctorName(prevDoc) : "";
                  const nextDocNorm = nextDoc ? normalizeDoctorName(nextDoc) : "";

                  if (!prevState || !nextState || !prevDocNorm || !nextDocNorm || prevDocNorm === nextDocNorm) return null;

                  return (
                    <p className="text-[11px] font-bold text-blue-500/80 mt-1 flex items-center gap-1">
                      <History className="w-2.5 h-2.5" />
                      {shortDoctorLabel(prevDoc)}
                    </p>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Schedule Card - Clean & modern grid */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm grid grid-cols-2 gap-6 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-px bg-slate-100 hidden sm:block" />
            
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-blue-50 p-1.5 rounded-lg">
                  <CalendarIcon className="w-3.5 h-3.5 text-blue-500" />
                </div>
                <Label className="text-[9px] uppercase text-slate-400 font-black tracking-[0.2em] leading-none">Date</Label>
              </div>
              <div className="flex items-start gap-2">
                <p className="font-black text-slate-800 text-base tracking-tight">{formattedDate}</p>
                <CurrentChangeIndicator change={dateCurrentChange} />
              </div>
              {prevState && nextState && prevState.date !== nextState.date && isValidDateValue(prevState.date) ? (
                <p className="text-[11px] font-bold text-blue-500/80 flex items-center gap-1">
                  <History className="w-2.5 h-2.5" />
                  From {new Date(prevState.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5 sm:pl-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-amber-50 p-1.5 rounded-lg">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <Label className="text-[9px] uppercase text-slate-400 font-black tracking-[0.2em] leading-none">Time Slot</Label>
              </div>
              <div className="flex items-start gap-2">
                <p className="font-black text-slate-800 text-base tracking-tight">{displayedTimeLabel}</p>
                <CurrentChangeIndicator change={timeCurrentChange} />
              </div>
              {prevState && nextState && (prevState.time !== nextState.time || (prevState.duration || 0) !== (nextState.duration || 0)) && isMeaningfulTime(prevState.time, prevState.duration) ? (
                <p className="text-[11px] font-bold text-blue-500/80 flex items-center gap-1">
                  <History className="w-2.5 h-2.5" />
                  From {formatAppointmentTimeRange(prevState.time, prevState.duration)}
                </p>
              ) : null}
            </div>
          </div>

          {/* Service & Financials - Unified Card */}
          <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="p-5 bg-slate-50/50 border-b border-slate-100 flex items-center gap-4">
              <div className="bg-white p-2.5 rounded-2xl shadow-sm border border-slate-100">
                <Stethoscope className="w-5 h-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <Label className="text-[9px] uppercase text-slate-400 font-black tracking-[0.2em] mb-0.5 block">Service Provided</Label>
                <div className="flex min-w-0 items-center gap-2">
                  <p className="font-black text-slate-800 text-lg leading-tight tracking-tight truncate">{typeName}</p>
                  <CurrentChangeIndicator change={serviceCurrentChange} />
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex justify-between items-center group">
                <span className="inline-flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-wider">
                  Price
                  <CurrentChangeIndicator change={priceCurrentChange} />
                </span>
                <div className="text-right">
                  {prevPrice !== null && nextPrice !== null && Number(prevPrice) !== Number(nextPrice) && Number(prevPrice) > 0 ? (
                    <>
                      <div className="font-black text-slate-800 text-base">₱{Number(nextPrice).toLocaleString()}</div>
                      <div className="text-[10px] font-black text-blue-500 uppercase flex items-center justify-end gap-1">
                        <History className="w-2.5 h-2.5" />
                        WAS ₱{Number(prevPrice).toLocaleString()}
                      </div>
                    </>
                  ) : (
                    (displayedDiscountAmount > 0) ? (
                      <>
                        <div className="text-[10px] text-slate-300 line-through font-bold">₱{Number(displayedBasePrice).toLocaleString()}</div>
                        <div className="font-black text-slate-800 text-base">₱{Number(displayedEffectivePrice).toLocaleString()}</div>
                      </>
                    ) : (
                      <span className="font-black text-slate-800 text-base">₱{(Number(displayedEffectivePrice) || 0).toLocaleString()}</span>
                    )
                  )}
                </div>
              </div>

              {isLogSnapshot(displayedSnapshot) && openedFromBookingModal && (
                <div className="flex justify-between items-center py-1">
                  <span className="text-emerald-600 font-black text-xs uppercase tracking-wider">Paid in Snapshot</span>
                  <span className="font-black text-emerald-600 text-base">₱{snapshotPaymentAmount.toLocaleString()}</span>
                </div>
              )}

              {totalPaidAmount !== null ? (
                <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                  <span className="inline-flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-wider">
                    Total Paid
                    <CurrentChangeIndicator change={totalPaidCurrentChange} />
                  </span>
                  <span className="font-black text-slate-800 text-base">₱{Number(totalPaidAmount).toLocaleString()}</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Cancellation Reason - More distinct */}
          {displayedSnapshot.status === 'cancelled' && displayedSnapshot.cancellationReason && (
            <div className="bg-red-50/50 p-5 rounded-3xl border border-red-100/60 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <AlertTriangle className="w-12 h-12 text-red-500" />
              </div>
              <div className="flex items-center gap-2 mb-3">
                <div className="bg-red-100 p-1.5 rounded-lg">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                </div>
                <Label className="text-[10px] uppercase text-red-600 font-black tracking-[0.2em] leading-none">Cancellation Reason</Label>
                <CurrentChangeIndicator change={cancellationReasonCurrentChange} />
              </div>
              <p className="text-sm text-red-700/90 font-bold leading-relaxed">{displayedSnapshot.cancellationReason}</p>
            </div>
          )}

          {/* Notes Card - Cleaner look */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <div className="bg-slate-50 p-1.5 rounded-lg">
                <History className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <Label className="text-[10px] uppercase text-slate-400 font-black tracking-[0.2em]">Notes & Internal Remarks</Label>
              <CurrentChangeIndicator change={notesCurrentChange} />
            </div>
            <p className="text-sm text-slate-600 font-medium whitespace-pre-wrap leading-relaxed italic border-l-4 border-slate-100 pl-4 py-1">
              {displayedNotesText}
            </p>
          </div>
        </div>

        {/* Action Note */}
        {snapshotState === "current" &&
          !actionsDisabled &&
          !isAppointmentOpen &&
          (nextStatusNorm === "reserved" || nextStatusNorm === "tbd") && (
            <div className="px-6 py-2 bg-amber-50/50 border-t border-b border-amber-100/50">
              <p className="text-[11px] text-amber-700 font-medium flex items-center justify-center gap-1.5 text-center">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {nextStatusNorm === "tbd" 
                  ? "Accept to mark this appointment as completed or cancel it if needed."
                  : "Accept to confirm this schedule or cancel the appointment request."
                }
              </p>
            </div>
          )}

        <DialogFooter className="flex flex-col sm:flex-row gap-2 p-6 pt-4 bg-white border-t border-slate-100">
          {/* Accept/Cancel buttons for reserved appointments (current, not historical, and modal not open) */}
          {snapshotState === "current" &&
            !actionsDisabled &&
            !isAppointmentOpen &&
            (nextStatusNorm === "reserved" || nextStatusNorm === "tbd") && (
              <div className="flex flex-1 gap-2">
                <Button
                  className="flex-1 rounded-xl bg-emerald-600 font-bold text-white shadow-md transition-all hover:bg-emerald-700 hover:shadow-lg active:scale-95"
                  onClick={() => openApproveConfirm(displayedSnapshot)}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Accept Request
                </Button>
                <Button
                  className="flex-1 rounded-xl bg-white border-red-200 font-bold text-red-600 shadow-sm transition-all hover:bg-red-50 hover:border-red-300 active:scale-95"
                  onClick={() => openRejectConfirm(displayedSnapshot)}
                  variant="outline"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Decline
                </Button>
              </div>
            )}
          {canRestoreNotification ? (
            <Button
              className="flex-1 rounded-xl bg-violet-600 font-bold text-white shadow-md transition-all hover:bg-violet-700 active:scale-95"
              onClick={async () => {
                await onRestoreNotification?.(restoreNotificationId!);
                onOpenChange(false);
              }}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Restore Notification
            </Button>
          ) : null}
          <Button
            onClick={() => onOpenChange(false)}
            variant="ghost"
            className="flex-1 rounded-xl font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            Close Snapshot
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ApproveRejectDialog
      open={isApproveConfirmOpen}
      onOpenChange={setIsApproveConfirmOpen}
      mode="approve"
      appointment={displayedSnapshot}
      onConfirm={performApprove}
      isProcessing={isProcessingAction}
    />

    <ApproveRejectDialog
      open={isRejectConfirmOpen}
      onOpenChange={setIsRejectConfirmOpen}
      mode="reject"
      appointment={displayedSnapshot}
      onConfirm={performReject}
      isProcessing={isProcessingAction}
    />
    </>
  );
}
