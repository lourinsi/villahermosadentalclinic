"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TIME_SLOTS, formatTimeTo12h } from "@/lib/time-slots";
import { formatDateToYYYYMMDD, cn } from "@/lib/utils";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Appointment } from "@/hooks/useAppointments";
import AppointmentHistoryView from "./AppointmentHistoryView";

interface TimePickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date;
  selectedTime: string;
  doctorName: string;
  duration?: string;
  onTimeSelect: (time: string) => void;
  onDateChange?: (date: Date) => void;
  excludeAppointmentId?: string;
}

const getAppointmentFetchOptions = (): RequestInit => {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return { headers, credentials: "include" };
};

export function TimePickerModal({
  open,
  onOpenChange,
  selectedDate,
  selectedTime,
  doctorName,
  duration,
  onTimeSelect,
  onDateChange,
  excludeAppointmentId
}: TimePickerModalProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewDate, setViewDate] = useState<Date>(new Date(selectedDate));
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const fetchAppointments = useCallback(async (dateToFetch: Date) => {
    if (!doctorName) {
      setAppointments([]);
      return;
    }
    try {
      setIsLoading(true);
      const dateStr = formatDateToYYYYMMDD(dateToFetch);
      const url = `http://localhost:3001/api/appointments?doctor=${encodeURIComponent(doctorName)}&startDate=${dateStr}&endDate=${dateStr}&includeUnpaid=true`;
      
      const response = await fetch(url, getAppointmentFetchOptions());
      const result = await response.json();
      if (result.success) {
        setAppointments(result.data || []);
      } else {
        setAppointments([]);
      }
    } catch (error) {
      console.error("Failed to fetch doctor appointments", error);
      setAppointments([]);
    } finally {
      setIsLoading(false);
    }
  }, [doctorName]);

  // When modal opens, sync viewDate with selectedDate and fetch appointments
  useEffect(() => {
    if (open) {
      const newViewDate = new Date(selectedDate);
      setViewDate(newViewDate);
      fetchAppointments(newViewDate);
    }
  }, [open, selectedDate, fetchAppointments]);

  // When selectedDate changes (from DatePickerModal), update viewDate and fetch new appointments
  useEffect(() => {
    if (open) {
      const dateStr = formatDateToYYYYMMDD(viewDate);
      const selectedDateStr = formatDateToYYYYMMDD(selectedDate);
      
      // Only update if they're different
      if (dateStr !== selectedDateStr) {
        setViewDate(new Date(selectedDate));
        fetchAppointments(selectedDate);
      }
    }
  }, [selectedDate, open, viewDate, fetchAppointments]);

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(viewDate);
    newDate.setDate(viewDate.getDate() + (direction === 'next' ? 1 : -1));
    setViewDate(newDate);
    if (onDateChange) {
      onDateChange(newDate);
    }
    fetchAppointments(newDate);
  };

  const slots = useMemo(() => {
    const dateStr = formatDateToYYYYMMDD(viewDate);
    const now = new Date();
    const todayStr = formatDateToYYYYMMDD(now);
    const isToday = dateStr === todayStr;
    const isPastDate = !isToday && viewDate < new Date(now.setHours(0, 0, 0, 0));
    
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    const timeToMinutes = (time: string): number => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };
    
    const activeAppointments = appointments.filter(apt => 
      apt.status !== 'cancelled' && apt.id !== excludeAppointmentId
    );

    return TIME_SLOTS.map(slot => {
      const [hour, minute] = slot.split(':').map(Number);
      const isPastTime = isToday && (hour < currentHour || (hour === currentHour && minute <= currentMinute));
      const isPast = isPastTime || isPastDate;
      
      const slotMinutes = timeToMinutes(slot);
      const slotEndMinutes = slotMinutes + (Number(duration) || 30);
      
      let isBooked = false;
      let isTentative = false;
      let isPending = false;
      let appointment: Appointment | null = null;
      
      for (const apt of activeAppointments) {
        const aptStart = timeToMinutes(apt.time);
        const aptEnd = aptStart + (apt.duration || 30);
        
        if (slotMinutes < aptEnd && slotEndMinutes > aptStart) {
          isBooked = true;
          appointment = apt;
          if (apt.status === 'tentative' || apt.status === 'reserved') {
            isTentative = true;
          } else if (apt.status === 'pending') {
            isPending = true;
          }
          break;
        }
      }

      const isSelected = selectedTime === slot && formatDateToYYYYMMDD(viewDate) === formatDateToYYYYMMDD(selectedDate);
      
      return {
        time: slot,
        isAvailable: (!isBooked || isPending) && !isPast,
        isBooked,
        isTentative,
        isPending,
        isPast,
        isSelected,
        appointment
      };
    });
  }, [appointments, viewDate, selectedDate, selectedTime, excludeAppointmentId, duration]);

  const handleTimeSelect = (time: string) => {
    onTimeSelect(time);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Select Time</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3">
          {/* Date Navigation Header */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => navigateDate('prev')}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors border border-gray-100"
            >
              <ChevronLeft className="h-4 w-4 text-gray-600" />
            </button>
            
            <p className="text-sm font-semibold text-gray-700 flex-1 text-center">
              {viewDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            
            <button
              onClick={() => navigateDate('next')}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors border border-gray-100"
            >
              <ChevronRight className="h-4 w-4 text-gray-600" />
            </button>
          </div>

          <p className="text-sm text-gray-600 text-center">
            {doctorName}
          </p>
          
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <Loader2 className="h-8 w-8 animate-spin mb-2 opacity-40" />
              <span className="text-xs font-semibold">Loading times...</span>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2 max-h-[400px] overflow-y-auto">
              {slots.map((slot) => (
                <button
                  key={slot.time}
                  onClick={() => {
                    if (slot.isAvailable) {
                      handleTimeSelect(slot.time);
                    } else if (slot.appointment) {
                      setSelectedAppointment(slot.appointment);
                      setSnapshotOpen(true);
                    }
                  }}
                  disabled={slot.isPast && !slot.appointment}
                  className={cn(
                    "px-2 py-2 rounded-lg font-semibold text-xs transition-all border",
                    slot.isSelected
                      ? "bg-blue-600 text-white border-blue-700 shadow-md"
                      : slot.isPast && !slot.appointment
                      ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                      : slot.isAvailable && (!slot.isBooked || slot.isPending)
                      ? "bg-white text-gray-900 border-gray-300 hover:border-blue-400 hover:bg-blue-50 cursor-pointer"
                      : slot.isTentative
                      ? "bg-amber-50 text-amber-700 border-amber-200 cursor-pointer"
                      : "bg-red-50 text-red-700 border-red-200 cursor-pointer"
                  ) }
                  title={
                    slot.isPast && !slot.appointment ? "Past time"
                    : slot.isTentative ? "Reserved (Click to view details)"
                    : slot.isBooked && !slot.isPending ? "Booked (Click to view details)"
                    : "Available"
                  }
                >
                  <div>{formatTimeTo12h(slot.time)}</div>
                  <div className="text-[8px] opacity-70">
                    {slot.isPast && !slot.appointment ? "Passed"
                    : slot.isTentative ? "Rsrvd"
                    : slot.isBooked && !slot.isPending ? "Booked"
                    : "Open"}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>

      {selectedAppointment && (
        <AppointmentHistoryView
          open={snapshotOpen}
          onOpenChange={setSnapshotOpen}
          appointmentSnapshot={selectedAppointment}
          logDate={selectedAppointment.updatedAt || selectedAppointment.createdAt || new Date().toISOString()}
        />
      )}
    </Dialog>
  );
}
