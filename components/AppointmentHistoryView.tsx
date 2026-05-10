import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Clock, Stethoscope, Banknote, CreditCard, Award } from "lucide-react";
import { getAppointmentTypeName } from "@/lib/appointmentTypes";
import { formatTimeTo12h } from "@/lib/time-slots";

interface AppointmentHistoryViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentSnapshot: any;
  logDate: string;
}

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

export default function AppointmentHistoryView({ open, onOpenChange, appointmentSnapshot, logDate }: AppointmentHistoryViewProps) {
  if (!appointmentSnapshot) return null;

  const appointmentDate = new Date(appointmentSnapshot.date);
  const formattedDate = Number.isNaN(appointmentDate.getTime()) ? String(appointmentSnapshot.date || "No date") : appointmentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const resolvedLogDate = logDate || appointmentSnapshot.changedAt || appointmentSnapshot.updatedAt || appointmentSnapshot.createdAt || new Date().toISOString();
  const isDateOnlyLog = typeof resolvedLogDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(resolvedLogDate);
  const parsedLogDate = new Date(isDateOnlyLog ? `${resolvedLogDate}T00:00:00` : resolvedLogDate);
  const snapshotDate = Number.isNaN(parsedLogDate.getTime())
    ? String(resolvedLogDate)
    : isDateOnlyLog
      ? parsedLogDate.toLocaleDateString()
      : parsedLogDate.toLocaleString();
  const typeName = resolveAppointmentTypeName(appointmentSnapshot.type, appointmentSnapshot.customType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Clock className="w-5 h-5" />
            Appointment Snapshot
          </DialogTitle>
          <DialogDescription>
            Recorded on {snapshotDate} {appointmentSnapshot.changedByName && `by ${appointmentSnapshot.changedByName}`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
          {/* Schedule Info */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-3">
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
                <p className="font-medium text-slate-900">{formatTimeTo12h(appointmentSnapshot.time)} ({appointmentSnapshot.duration} mins)</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-white p-2 rounded-md shadow-sm border border-slate-200">
                <Stethoscope className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <Label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Service & Doctor</Label>
                <p className="font-medium text-slate-900">{typeName}</p>
                <p className="text-sm text-slate-600">{appointmentSnapshot.doctor || "No doctor assigned"}</p>
              </div>
            </div>
          </div>

          {/* Status & Financials */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <Label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Status</Label>
              <div className="mt-1">
                 <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  appointmentSnapshot.status === 'completed' ? 'bg-green-100 text-green-700' :
                  appointmentSnapshot.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {appointmentSnapshot.status?.toUpperCase()}
                </span>
              </div>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <Label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Payment</Label>
              <div className="mt-1">
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  appointmentSnapshot.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' :
                  appointmentSnapshot.paymentStatus === 'half-paid' ? 'bg-amber-100 text-amber-700' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {appointmentSnapshot.paymentStatus?.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Cancellation Reason - shown when appointment is cancelled */}
          {appointmentSnapshot.status === 'cancelled' && appointmentSnapshot.cancellationReason && (
            <div className="bg-red-50 p-3 rounded-lg border border-red-200">
              <Label className="text-[10px] uppercase text-red-600 font-bold tracking-wider">Cancellation Reason</Label>
              <p className="mt-1 text-sm text-red-700 font-medium">{appointmentSnapshot.cancellationReason}</p>
            </div>
          )}

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Banknote className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium">Price</span>
              </div>
              <span className="font-bold">₱{appointmentSnapshot.price?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-green-600">
                <CreditCard className="w-4 h-4" />
                <span className="text-sm font-medium">Total Paid</span>
              </div>
              <span className="font-bold text-green-600">₱{appointmentSnapshot.totalPaid?.toLocaleString()}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
              <span className="text-sm font-bold text-slate-700">Remaining Balance</span>
              <span className="text-lg font-black text-primary">₱{appointmentSnapshot.balance?.toLocaleString()}</span>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <Label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Notes</Label>
            <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap italic">
              {appointmentSnapshot.notes || (appointmentSnapshot.status === 'cancelled' && appointmentSnapshot.cancellationReason ? appointmentSnapshot.cancellationReason : "—")}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="secondary" className="w-full">
            Close Snapshot
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
