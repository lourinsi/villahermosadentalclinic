import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Clock, Stethoscope, Banknote, CreditCard, UserRound, AlertTriangle, CheckCircle2, RefreshCw, History } from "lucide-react";
import { getAppointmentTypeName } from "@/lib/appointmentTypes";
import { formatTimeTo12h } from "@/lib/time-slots";
import { apiUrl } from "@/lib/api";
import { getAuthHeaders } from "@/lib/auth-headers";
import { toast } from "sonner";

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

export default function AppointmentHistoryView({ open, onOpenChange, appointmentSnapshot, logDate, onViewCurrent, onOpenAppointment, isAppointmentOpen, isHistorical }: AppointmentHistoryViewProps) {
  const [displayedSnapshot, setDisplayedSnapshot] = useState<any | null>(appointmentSnapshot);
  const [snapshotState, setSnapshotState] = useState<SnapshotState>(Boolean(isHistorical) ? "historical" : "current");
  const [isFetchingLogs, setIsFetchingLogs] = useState(false);

  useEffect(() => {
    setDisplayedSnapshot(appointmentSnapshot);
    setSnapshotState(Boolean(isHistorical) ? "historical" : "current");
  }, [appointmentSnapshot, isHistorical]);

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
  const changedByName = displayedSnapshot.changedByName || appointmentSnapshot?.changedByName;
  const isPastSnapshot = snapshotState === "historical";
  const stateLabel = isPastSnapshot ? "Past Log" : snapshotState === "latest" ? "Latest" : "Current";
  const stateBadgeClass = isPastSnapshot
    ? "border-amber-200 bg-amber-50 text-amber-700"
    : snapshotState === "latest"
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";
  const StateIcon = isPastSnapshot ? History : CheckCircle2;
  const timestampPrefix = isPastSnapshot ? "Saved on" : snapshotState === "latest" ? "Latest log from" : "Current as of";

  const appointmentId = displayedSnapshot?.id || displayedSnapshot?.appointmentId;
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
      setSnapshotState("latest");
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
                {timestampPrefix} {snapshotDate} {changedByName && `by ${changedByName}`}
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
              This is an older saved log. Use "View Latest" to open the current appointment details before making decisions.
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
          {/* Schedule Info */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-3">
            <div className="flex items-center gap-3">
              <div className="bg-white p-2 rounded-md shadow-sm border border-slate-200">
                <UserRound className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <Label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Patient</Label>
                <p className="font-medium text-slate-900">{patientName}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-white p-2 rounded-md shadow-sm border border-slate-200">
                <CalendarIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <Label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Date</Label>
                <p className="font-medium text-slate-900">{formattedDate}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-white p-2 rounded-md shadow-sm border border-slate-200">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <Label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Time</Label>
                <p className="font-medium text-slate-900">{formatTimeTo12h(displayedSnapshot.time)} ({displayedSnapshot.duration} mins)</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-white p-2 rounded-md shadow-sm border border-slate-200">
                <Stethoscope className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <Label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Service & Doctor</Label>
                <p className="font-medium text-slate-900">{typeName}</p>
                <p className="text-sm text-slate-600">{displayedSnapshot.doctor || "No doctor assigned"}</p>
              </div>
            </div>
          </div>

          {/* Status & Financials */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <Label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Status</Label>
              <div className="mt-1">
                 <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  displayedSnapshot.status === 'completed' ? 'bg-green-100 text-green-700' :
                  displayedSnapshot.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                  'bg-blue-100 text-blue-700'
                }`}> 
                  {displayedSnapshot.status?.toUpperCase()}
                </span>
              </div>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <Label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Payment</Label>
              <div className="mt-1">
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  displayedSnapshot.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' :
                  displayedSnapshot.paymentStatus === 'half-paid' ? 'bg-amber-100 text-amber-700' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {displayedSnapshot.paymentStatus?.toUpperCase()}
                </span>
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
              <span className="font-bold">₱{displayedSnapshot.price?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-green-600">
                <CreditCard className="w-4 h-4" />
                <span className="text-sm font-medium">Total Paid</span>
              </div>
                <span className="font-bold text-green-600">₱{displayedSnapshot.totalPaid?.toLocaleString()}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
              <span className="text-sm font-bold text-slate-700">Remaining Balance</span>
                <span className="text-lg font-black text-primary">₱{displayedSnapshot.balance?.toLocaleString()}</span>
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
