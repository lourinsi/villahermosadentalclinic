"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { DateRange } from "react-day-picker";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CalendarRange,
  Clock,
  Stethoscope,
  Trash2,
  AlertCircle,
  CreditCard,
  Filter,
  Keyboard
} from "lucide-react";
import { Appointment } from "../hooks/useAppointments";
import { useAppointmentModal } from "@/hooks/useAppointmentModal";
import { usePaymentModal } from "@/hooks/usePaymentModal";
import { Badge } from "./ui/badge";
import { formatTimeTo12h, TIME_SLOTS } from "../lib/time-slots";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import CalendarPopover from "./CalendarPopover";
import { Label } from "./ui/label";
import { getAppointmentTypeName } from "../lib/appointment-types";
import { parseBackendDateToLocal, formatDateToYYYYMMDD } from "../lib/utils";
import { useAuth } from "@/hooks/useAuth.tsx";
import { AllAppointmentsView } from "./AllAppointmentsView";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "./ConfirmDialog";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { useDoctors } from "@/hooks/useDoctors";

type ViewMode = "month" | "week" | "day" | "custom" | "all" | "cart";

const appointmentColors: Record<string, { bg: string; text: string; border: string }> = {
  "Routine Cleaning": { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  "Checkup": { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  "Filling": { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  "Root Canal": { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  "Extraction": { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  "Whitening": { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  "Other": { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" },
};

export function PatientCalendarView() {
  const { user } = useAuth();
  const router = useRouter();
  const parentId = user?.patientId;

  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isLoadingView, setIsLoadingView] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [activeRangeType, setActiveRangeType] = useState<"from" | "to">("from");
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  // confirmation modal state for destructive actions
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState<string | undefined>(undefined);
  const [confirmMessage, setConfirmMessage] = useState<string | undefined>(undefined);
  const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { openPatientBookingModal, appointments, isLoading, refreshAppointments, deleteAppointment, updateAppointment } = useAppointmentModal();
  const { openPatientPaymentFor } = usePaymentModal();
  const { doctors, isLoadingDoctors } = useDoctors();

  const filteredAppointments = useMemo(() => {
    if (viewMode === "cart") {
      return appointments.filter(apt => apt.status === "pending" || apt.status === "tentative");
    }
    
    // In normal calendar views, hide pending appointments (they are in the "Cart")
    // but show confirmed/scheduled/completed/To Pay/tentative even if unpaid
    const filtered = appointments.filter(apt => apt.status !== "pending");

    return filtered;
  }, [appointments, viewMode]);

  const handleDelete = (id: string) => {
    setConfirmTitle("Delete appointment");
    setConfirmMessage("Are you sure you want to delete this pending appointment?");
    setConfirmAction(() => async () => {
      setIsProcessing(true);
      try {
        await deleteAppointment(id);
        toast.success("Appointment deleted successfully");
        setSelectedAppointment(null);
        refreshAppointments(filters);
      } catch (err) {
        console.error(err);
        toast.error("Failed to delete appointment");
      } finally {
        setIsProcessing(false);
      }
    });
    setIsConfirmOpen(true);
  };

  const handleCancelReservation = (id: string) => {
    setConfirmTitle("Cancel reservation");
    setConfirmMessage("Cancel this reservation? This will free the slot immediately.");
    setConfirmAction(() => async () => {
      setIsProcessing(true);
      try {
        await deleteAppointment(id);
        // Notify other components that an appointment changed/was removed
        try {
          window.dispatchEvent(new CustomEvent('appointments:updated', { detail: { appointmentId: id, newStatus: 'cancelled' } }));
        } catch (e) {
          // ignore dispatch errors
        }
        toast.success("Reservation cancelled");
        setSelectedAppointment(null);
        refreshAppointments(filters);
      } catch (err) {
        console.error(err);
        toast.error("Failed to cancel reservation");
      } finally {
        setIsProcessing(false);
      }
    });
    setIsConfirmOpen(true);
  };

  const handleRequestCancellation = (appointment: Appointment) => {
    setConfirmTitle("Request cancellation");
    setConfirmMessage("Would you like to request a cancellation for this confirmed appointment? The doctor will be notified.");
    setConfirmAction(() => async () => {
      setIsProcessing(true);
      try {
        // For now, we'll update the notes or status to indicate a cancellation request
        // Ideally, there should be a 'cancellation_requested' status or a notification system
        await updateAppointment(appointment.id, {
          notes: appointment.notes + "\n[CANCELLATION REQUESTED BY PATIENT]",
          status: "tentative" // Using tentative to indicate it's being reviewed
        });
        toast.success("Cancellation request sent to the doctor.");
        setSelectedAppointment(null);
        refreshAppointments(filters);
      } catch (err) {
        console.error(err);
        toast.error("Failed to send cancellation request");
      } finally {
        setIsProcessing(false);
      }
    });
    setIsConfirmOpen(true);
  };

  const handlePay = (appointment: Appointment) => {
  openPatientPaymentFor(appointment);
    setSelectedAppointment(null);
  };
  
  const getViewRange = useCallback((date: Date) => {
    const start = new Date(date);
    const end = new Date(date);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (viewMode === 'day') {
      return { start, end };
    }

    if (viewMode === 'week') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      return { start: weekStart, end: weekEnd };
    }

    if (viewMode === 'month') {
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      monthStart.setHours(0, 0, 0, 0);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);
      return { start: monthStart, end: monthEnd };
    }

    if (viewMode === 'custom' && dateRange?.from && dateRange?.to) {
      const start = new Date(dateRange.from);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateRange.to);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    return { start, end };
  }, [viewMode, dateRange]);

  const filters = useMemo(() => {
    const { start, end } = getViewRange(selectedDate);
    
    let fetchStartStr: string | undefined;
    let fetchEndStr: string | undefined;

    if (viewMode === 'custom' && dateRange?.from && dateRange?.to) {
      fetchStartStr = formatDateToYYYYMMDD(dateRange.from);
      fetchEndStr = formatDateToYYYYMMDD(dateRange.to);
    } else if (viewMode !== 'all' && viewMode !== 'cart') {
      // For day, week, month, use the range calculated by getViewRange
      // Actually, Admin portal uses a monthly range for day/week/month to avoid too many fetches
      const monthStart = new Date(start.getFullYear(), start.getMonth(), 1);
      const monthEnd = new Date(end.getFullYear(), end.getMonth() + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);
      fetchStartStr = formatDateToYYYYMMDD(monthStart);
      fetchEndStr = formatDateToYYYYMMDD(monthEnd);
    }

    return { 
      parentId,
      status: viewMode === "cart" ? undefined : (statusFilter === "all" ? undefined : statusFilter),
      startDate: fetchStartStr,
      endDate: fetchEndStr,
      // Only request unpaid appointments when viewing the Cart — otherwise
      // asking for includeUnpaid may return unpaid records outside the requested
      // date range depending on backend semantics.
      includeUnpaid: viewMode === "cart" ? true : undefined
    };
  }, [parentId, statusFilter, viewMode, selectedDate, dateRange, getViewRange]);

  useEffect(() => {
    // Don't trigger a backend fetch when the custom picker is opened but a full
    // range isn't selected yet. This prevents fetching unrelated dates when only
    // the start date is set.
    if (viewMode === 'custom' && !(dateRange?.from && dateRange?.to)) return;

    if (parentId) {
      // Debug: log filters so we can confirm what ranges are being requested
      // in the browser console when the custom range is applied.
      // Remove or guard these logs in production.
      try {
        // eslint-disable-next-line no-console
        console.debug("PatientCalendarView: refreshAppointments called with filters:", filters);
      } catch (e) {}
      refreshAppointments(filters);
    }
  // Narrow dependencies so changes to the actual start/end dates trigger refresh,
  // but opening the picker (which may create a new DateRange object) does not.
  }, [parentId, filters.parentId, filters.status, filters.startDate, filters.endDate, refreshAppointments, viewMode, dateRange?.from, dateRange?.to]);

  useEffect(() => {
    const onUpdated = (e: Event) => {
      try {
        const detail = (e as CustomEvent)?.detail || {};
        const { appointmentId, newStatus, newPaymentStatus } = detail;
        if (appointmentId) {
          // optimistic update: update appointments array in place
          // updateAppointment hook exists but we can optimistically update the cached appointments
          // Since appointments come from useAppointmentModal, call refresh to get canonical state
          refreshAppointments(filters);
        }
      } catch (err) {}
    };
    window.addEventListener('appointments:updated', onUpdated as EventListener);
    return () => window.removeEventListener('appointments:updated', onUpdated as EventListener);
  }, [filters, refreshAppointments]);

  useEffect(() => {
    setIsLoadingView(true);
    const timer = setTimeout(() => setIsLoadingView(false), 500);
    return () => clearTimeout(timer);
  }, [viewMode, selectedDate, appointments]);


  const formatTime = formatTimeTo12h;

  const formatDateLabel = (date: Date) => {
    if (viewMode === "day") {
      return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } else if (viewMode === "week") {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else if (viewMode === "month") {
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else if (viewMode === "all") {
      return "All Appointments";
    } else if (viewMode === "cart") {
      return "My Appointment Cart";
    } else if (viewMode === "custom") {
      if (dateRange?.from && dateRange?.to) {
        return `${dateRange.from.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${dateRange.to.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      }
      return "Select Range";
    }
    return "Select Date";
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'day') {
      newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'week') {
      newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 7 : -7));
    } else if (viewMode === 'month') {
      newDate.setMonth(selectedDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'custom' && dateRange?.from && dateRange?.to) {
      const diffTime = Math.abs(dateRange.to.getTime() - dateRange.from.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      const shift = direction === 'next' ? diffDays : -diffDays;
      
      const newFrom = new Date(dateRange.from);
      newFrom.setDate(newFrom.getDate() + shift);
      const newTo = new Date(dateRange.to);
      newTo.setDate(newTo.getDate() + shift);
      
      setDateRange({ from: newFrom, to: newTo });
      return;
    }
    setSelectedDate(newDate);
  };

  const getWeekDays = (date: Date) => {
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const appointmentsOverlap = (apt1: Appointment, apt2: Appointment): boolean => {
    const start1 = timeToMinutes(apt1.time);
    const end1 = start1 + (apt1.duration || 30);
    const start2 = timeToMinutes(apt2.time);
    const end2 = start2 + (apt2.duration || 30);
    
    return start1 < end2 && start2 < end1;
  };

  const organizeAppointmentsIntoColumns = (appointments: Appointment[]) => {
    if (appointments.length === 0) return { columns: [], appointmentColumns: new Map<string, number>(), maxOverlappingAt: new Map<string, number>() };
    
    const sorted = [...appointments].sort((a, b) => {
      const timeCompare = timeToMinutes(a.time) - timeToMinutes(b.time);
      if (timeCompare !== 0) return timeCompare;
      return (b.duration || 30) - (a.duration || 30);
    });

    const columns: Appointment[][] = [];
    const appointmentColumns = new Map<string, number>();
    
    sorted.forEach((apt: Appointment) => {
      let columnIndex = 0;
      while (columnIndex < columns.length) {
        const hasOverlap = columns[columnIndex].some(existingApt => 
          appointmentsOverlap(apt, existingApt)
        );
        if (!hasOverlap) break;
        columnIndex++;
      }
      
      if (columnIndex === columns.length) {
        columns.push([]);
      }
      
      columns[columnIndex].push(apt);
      appointmentColumns.set(apt.id, columnIndex);
    });

    const maxOverlappingAt = new Map<string, number>();
    const clusters: Appointment[][] = [];
    sorted.forEach((apt: Appointment) => {
      let addedToCluster = false;
      for (const cluster of clusters) {
        if (cluster.some(c => appointmentsOverlap(apt, c))) {
          cluster.push(apt);
          addedToCluster = true;
          break;
        }
      }
      if (!addedToCluster) {
        clusters.push([apt]);
      }
    });

    clusters.forEach(cluster => {
      const maxCol = Math.max(...cluster.map(a => appointmentColumns.get(a.id) ?? 0)) + 1;
      cluster.forEach(a => {
        maxOverlappingAt.set(a.id, maxCol);
      });
    });

    return { columns, appointmentColumns, maxOverlappingAt };
  };

  const calculateAppointmentStyle = (duration: number = 60) => {
  const slotHeight = 64;
    const slotsOccupied = duration / 30;
    return {
      height: `${slotHeight * slotsOccupied - 4}px`
    };
  };

  const getAppointmentsForDate = (date: Date) => {
    const dateStr = formatDateToYYYYMMDD(date);
    return filteredAppointments.filter(apt => apt.date === dateStr);
  };

  const getColorForType = (type: string) => {
    return appointmentColors[type] || appointmentColors["Other"];
  };

  const renderDayView = () => {
    const dayAppointments = getAppointmentsForDate(selectedDate);
    const { appointmentColumns, maxOverlappingAt } = organizeAppointmentsIntoColumns(dayAppointments);

    const isMinuteOccupied: boolean[] = new Array(24 * 60).fill(false);
    dayAppointments.forEach((apt: Appointment) => {
      const startTimeMinutes = timeToMinutes(apt.time);
      const duration = apt.duration || 30;
      const endTimeMinutes = startTimeMinutes + duration;

      for (let m = startTimeMinutes; m < endTimeMinutes; m++) {
        if (m >= 0 && m < isMinuteOccupied.length) {
          isMinuteOccupied[m] = true;
        }
      }
    });

    const isSlotCovered = (timeSlot: string): boolean => {
      const slotStartMinutes = timeToMinutes(timeSlot);
      for (let m = slotStartMinutes; m < slotStartMinutes + 30; m++) {
        if (isMinuteOccupied[m]) {
          return true;
        }
      }
      return false;
    };

    return (
      <div className="space-y-0 relative bg-white">
        {TIME_SLOTS.map((timeSlot) => {
          const appointmentsStartingAtSlot = dayAppointments.filter((apt: Appointment) => apt.time === timeSlot);
          const currentSlotIsCovered = isSlotCovered(timeSlot);
          const isPast = new Date(`${formatDateToYYYYMMDD(selectedDate)}T${timeSlot}`) < new Date();

          return (
            <div key={timeSlot} className="flex items-start min-h-[64px] border-b border-gray-100 relative group">
              {!currentSlotIsCovered && !isPast && (
                <div
                  className="absolute inset-y-2 left-32 right-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer z-10 hover:bg-violet-50/50 rounded-xl border-2 border-dashed border-transparent hover:border-violet-200/50 group/plus"
                  onClick={() => openPatientBookingModal(selectedDate, timeSlot)}
                >
                  <Plus className="h-6 w-6 text-violet-300 transition-colors group-hover/plus:text-violet-600" />
                </div>
              )}

              <div className="w-28 pl-4 pt-2 text-sm text-muted-foreground font-medium sticky left-0 bg-white z-10 pointer-events-none">
                {formatTime(timeSlot)}
              </div>
              
              <div className="flex-1 relative min-h-[64px]">
                {appointmentsStartingAtSlot.map((appointment: Appointment) => {
                  const columnIndex = appointmentColumns.get(appointment.id) ?? 0;
                  const totalColumns = maxOverlappingAt.get(appointment.id) ?? 1;
                  const typeName = getAppointmentTypeName(appointment.type, appointment.customType);
                  const colors = getColorForType(typeName);
                  
                  const width = `${100 / totalColumns}%`;
                  const left = `${(columnIndex * 100) / totalColumns}%`;
                  
                  return (
                    <div 
                      key={appointment.id}
                      className={`absolute top-0 ${colors?.bg} ${colors?.text} ${colors?.border} border-l-4 rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-pointer z-20 overflow-hidden ${appointment.paymentStatus === 'unpaid' ? 'opacity-85 border-dashed border-2' : ''}`}
                      style={{
                        ...calculateAppointmentStyle(appointment.duration),
                        width: `calc(${width} - 4px)`,
                        left: `calc(${left} + 2px)`,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAppointment(appointment);
                      }}
                    >
                      <div className="flex flex-col h-full">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            <Avatar className="h-10 w-10 border border-gray-100">
                              {(() => {
                                const doc = doctors.find(d => String(d.name) === String(appointment.doctor) || String(d.id) === String(appointment.doctor));
                                const src = doc?.profilePicture || (appointment as any).doctorProfile || `https://api.dicebear.com/7.x/avataaars/svg?seed=${appointment.doctor}`;
                                return <AvatarImage src={src} alt={appointment.doctor} />;
                              })()}
                              <AvatarFallback>{String(appointment.doctor || '').substring(0,2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm truncate pr-2 flex items-center gap-2">
                              {appointment.patientName}
                              {appointment.paymentStatus === 'unpaid' && (
                                <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-[8px] h-3 px-1 uppercase font-black">Unpaid</Badge>
                              )}
                            </div>
                            <div className="text-xs opacity-90 truncate">
                              {typeName} • {appointment.duration || 30}min
                            </div>
                            <div className="text-xs opacity-80 mt-1 truncate flex items-center gap-2">
                              <div className="text-[12px] font-medium">Dr. {appointment.doctor}</div>
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px] bg-white/50 backdrop-blur-sm mt-auto self-start">
                          {appointment.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekDays = getWeekDays(selectedDate);
    const dayLayouts = weekDays.map(day => {
      const dayAppointments = getAppointmentsForDate(day);
      const layout = organizeAppointmentsIntoColumns(dayAppointments);
      
      const isMinuteOccupied = new Array(24 * 60).fill(false);
      dayAppointments.forEach(apt => {
        const startTimeMinutes = timeToMinutes(apt.time);
        const duration = apt.duration || 30;
        const endTimeMinutes = startTimeMinutes + duration;
        for (let m = startTimeMinutes; m < endTimeMinutes; m++) {
            if (m >= 0 && m < isMinuteOccupied.length) isMinuteOccupied[m] = true;
        }
      });

      return { day, appointments: dayAppointments, layout, isMinuteOccupied };
    });
    
    return (
      <div className="overflow-x-auto">
        <div className="min-w-[1000px]">
          <div className="flex border-b-2 border-gray-200 sticky top-0 bg-white z-10">
            <div className="w-20 flex-shrink-0"></div>
            {weekDays.map((day, idx) => (
              <div key={idx} className="flex-1 text-center py-3 border-l border-gray-100">
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className={`text-lg font-bold mt-1 ${
                  day.toDateString() === new Date().toDateString() 
                    ? 'text-violet-600' 
                    : 'text-gray-900'
                }`}>
                  {day.getDate()}
                </div>
              </div>
            ))}
          </div>

          <div className="relative">
            {TIME_SLOTS.map((timeSlot) => (
              <div key={timeSlot} className="flex min-h-[64px] border-b border-gray-50">
                <div className="w-20 flex-shrink-0 pt-2 pr-4 text-right text-sm font-medium text-muted-foreground sticky left-0 bg-white z-10">
                  {formatTime(timeSlot)}
                </div>
                {weekDays.map((day, idx) => {
                  const { layout, isMinuteOccupied, appointments } = dayLayouts[idx];
                  const appointmentsForSlot = appointments.filter(apt => apt.time === timeSlot);
                  const { appointmentColumns, maxOverlappingAt } = layout;

                  const slotStartMinutes = timeToMinutes(timeSlot);
                  let currentSlotIsCovered = false;
                  for (let m = slotStartMinutes; m < slotStartMinutes + 30; m++) {
                      if (isMinuteOccupied[m]) {
                          currentSlotIsCovered = true;
                          break;
                      }
                  }
                  
                  return (
                    <div 
                      key={idx} 
                      className="flex-1 border-l border-gray-100 relative min-h-[64px] group"
                    >
                        {!currentSlotIsCovered && (
                            <div
                            className="absolute inset-1 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer z-10 hover:bg-violet-50/50 rounded border border-dashed border-transparent hover:border-violet-200/50"
                            onClick={() => openPatientBookingModal(day, timeSlot)}
                            >
                            <Plus className="h-5 w-5 text-violet-300" />
                            </div>
                        )}

                      <div className="relative w-full h-full">
                        {appointmentsForSlot.map((appointment: Appointment) => {
                          const columnIndex = appointmentColumns.get(appointment.id) ?? 0;
                          const totalColumns = maxOverlappingAt.get(appointment.id) ?? 1;
                          const typeName = getAppointmentTypeName(appointment.type, appointment.customType);
                          const colors = getColorForType(typeName);
                          
                          const width = `${100 / totalColumns}%`;
                          const left = `${(columnIndex * 100) / totalColumns}%`;

                          return (
                            <div 
                              key={appointment.id}
                              className={`absolute top-0 ${colors?.bg} ${colors?.text} ${colors?.border} border-l-4 rounded-lg p-2 shadow-sm hover:shadow-md transition-all cursor-pointer z-20 overflow-hidden text-xs ${appointment.paymentStatus === 'unpaid' ? 'opacity-85 border-dashed border-2' : ''}`}
                              style={{
                                ...calculateAppointmentStyle(appointment.duration),
                                width: `calc(${width} - 4px)`,
                                left: `calc(${left} + 2px)`,
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAppointment(appointment);
                              }}
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex items-start gap-2">
                                  <div className="flex-shrink-0">
                                    <Avatar className="h-8 w-8 border border-gray-100">
                                      {(() => {
                                        const doc = doctors.find(d => String(d.name) === String(appointment.doctor) || String(d.id) === String(appointment.doctor));
                                        const src = doc?.profilePicture || (appointment as any).doctorProfile || `https://api.dicebear.com/7.x/avataaars/svg?seed=${appointment.doctor}`;
                                        return <AvatarImage src={src} alt={appointment.doctor} />;
                                      })()}
                                      <AvatarFallback>{String(appointment.doctor || '').substring(0,2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                  </div>
                                  <div className="font-semibold truncate pr-1 flex items-center gap-1 min-w-0">
                                    {appointment.patientName}
                                    {appointment.paymentStatus === 'unpaid' && (
                                      <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-[7px] h-2.5 px-0.5 uppercase font-black">UNPAID</Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="truncate opacity-90">{typeName}</div>
                              <div className="truncate opacity-75 mt-0.5 flex items-center gap-2">
                                <span className="text-sm font-medium">Dr. {appointment.doctor}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderCustomView = () => {
    const sortedAppointments = [...filteredAppointments].sort((a, b) => parseBackendDateToLocal(a.date).getTime() - parseBackendDateToLocal(b.date).getTime());
    const days = dateRange && dateRange.from && dateRange.to ? Math.ceil((+dateRange.to - +dateRange.from) / (1000 * 60 * 60 * 24)) + 1 : undefined;

    return (
      <div>
        <div className="p-6 border-b bg-white">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold">{days ? `${days} days range` : 'Custom range'}</h2>
              <p className="text-sm text-muted-foreground">{dateRange && dateRange.from && dateRange.to ? `${dateRange.from.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${dateRange.to.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : 'Select a start and end date'}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-2 border rounded-lg">
                <div className="text-xs text-muted-foreground uppercase">Start date</div>
                <div className="font-medium">{dateRange?.from ? dateRange.from.toLocaleDateString() : '—'}</div>
              </div>
              <div className="p-2 border rounded-lg">
                <div className="text-xs text-muted-foreground uppercase">End date</div>
                <div className="font-medium">{dateRange?.to ? dateRange.to.toLocaleDateString() : '—'}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              {sortedAppointments.length === 0 ? (
                <div className="text-center p-12 bg-white rounded border-2 border-dashed text-muted-foreground">No appointments in this range</div>
              ) : (
                <div className="space-y-4">
                  {sortedAppointments.map((apt) => {
                    const typeName = getAppointmentTypeName(apt.type, apt.customType);
                    const colors = getColorForType(typeName);
                    return (
                      <Card key={apt.id} className={`overflow-hidden hover:shadow-md transition-shadow cursor-pointer ${apt.paymentStatus === 'unpaid' ? 'bg-orange-50/20 border-dashed border-orange-200' : ''}`} onClick={() => { setSelectedAppointment(apt); }}>
                        <div className={`h-1 ${colors.bg.replace('bg-', 'bg-').split(' ')[0]}`} />
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div className="font-bold text-lg flex items-center gap-2">
                              {apt.patientName}
                              {apt.paymentStatus === 'unpaid' && (
                                <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-[10px] uppercase font-black">Unpaid</Badge>
                              )}
                            </div>
                            <Badge className={`${colors.bg} ${colors.text} border-none`}>{typeName}</Badge>
                          </div>
                          <div className="space-y-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <CalendarIcon className="h-4 w-4" />
                              <span>{parseBackendDateToLocal(apt.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {apt.time}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <span>{apt.duration || 60} minutes</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Stethoscope className="h-4 w-4" />
                              <span>Dr. {apt.doctor}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
            <div>
              <div className="p-4 bg-white rounded border shadow-sm">
                <div className="text-sm font-semibold mb-2">Range controls</div>
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">Select range using the calendar</div>
                  <Calendar mode="range" selected={dateRange} onSelect={(r) => setDateRange(r as DateRange | undefined)} className="rounded-md" />
                  <div className="flex items-center justify-between mt-3">
                    <Button variant="ghost" onClick={() => setDateRange(undefined)}>Clear dates</Button>
                    <Button onClick={() => { /* noop - keep range */ }} className="bg-violet-600 text-white">Apply</Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
    const startDay = startOfMonth.getDay();
    const daysInMonth = endOfMonth.getDate();
    const prevMonthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 0).getDate();
    const days = [];
    for (let i = startDay - 1; i >= 0; i--) {
      days.push({ day: prevMonthEnd - i, currentMonth: false, date: new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, prevMonthEnd - i) });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, currentMonth: true, date: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i) });
    }
    const remainingSlots = 42 - days.length;
    for (let i = 1; i <= remainingSlots; i++) {
      days.push({ day: i, currentMonth: false, date: new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, i) });
    }

    return (
      <div className="grid grid-cols-7 border-t border-l border-gray-200">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-3 text-center text-xs font-bold text-gray-500 bg-gray-50 border-r border-b border-gray-200 uppercase tracking-wider">
            {day}
          </div>
        ))}
        {days.map((item, idx) => {
          const dayAppointments = getAppointmentsForDate(item.date);
          const isToday = item.date.toDateString() === new Date().toDateString();

          return (
            <div
              key={idx}
              className={`min-h-[120px] p-2 border-r border-b border-gray-200 transition-colors cursor-pointer ${item.currentMonth ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/50 text-gray-400'}`}
              onClick={() => {
                setSelectedDate(item.date);
                setViewMode("day");
              }}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`text-sm font-semibold p-1 rounded-full w-7 h-7 flex items-center justify-center ${isToday ? 'bg-violet-600 text-white' : ''}`}>
                  {item.day}
                </span>
                {dayAppointments.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                    {dayAppointments.length}
                  </Badge>
                )}
              </div>
              <div className="space-y-1">
                {dayAppointments.slice(0, 3).map((apt: Appointment) => {
                  const typeName = getAppointmentTypeName(apt.type, apt.customType);
                  const colors = getColorForType(typeName);
                  return (
                    <div
                      key={apt.id}
                      className={`text-[10px] p-1 rounded truncate border-l-2 ${colors.bg} ${colors.text} ${colors.border} ${apt.paymentStatus === 'unpaid' ? 'opacity-75 border-dashed' : ''} flex items-center justify-between gap-2`}
                      onClick={(e) => { e.stopPropagation(); setSelectedAppointment(apt); }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex-shrink-0">
                          <Avatar className="h-7 w-7 border border-gray-100">
                            {(() => {
                              const doc = doctors.find(d => String(d.name) === String(apt.doctor) || String(d.id) === String(apt.doctor));
                              const src = doc?.profilePicture || (apt as any).doctorProfile || `https://api.dicebear.com/7.x/avataaars/svg?seed=${apt.doctor}`;
                              return <AvatarImage src={src} alt={apt.doctor} />;
                            })()}
                            <AvatarFallback>{String(apt.doctor || '').substring(0,2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="truncate text-[11px]">
                          <div className="font-medium truncate">{apt.time} • Dr. {apt.doctor}</div>
                          <div className="text-[10px] opacity-80 truncate">{typeName}</div>
                        </div>
                      </div>
                      {apt.paymentStatus === 'unpaid' && (
                        <span className="ml-1 text-[7px] font-black text-orange-600 bg-orange-50 px-0.5 rounded border border-orange-100 uppercase">U</span>
                      )}
                    </div>
                  )
                })}
                {dayAppointments.length > 3 && (
                  <div className="text-[10px] text-muted-foreground pl-1 font-medium">
                    + {dayAppointments.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Other render views (day, week) would be similar but simplified from DoctorCalendarView
  // For brevity, I'll focus on the month view and the main structure.
  // A full implementation would require adapting renderDayView and renderWeekView as well.

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Appointments</h1>
        <Button 
          onClick={() => router.push('/patient/doctors')} 
          className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
        >
          <Plus className="h-4 w-4" />
          Book Appointment
        </Button>
      </div>
      
      <Card className="shadow-sm border-none bg-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center bg-gray-50 rounded-lg p-1 border ${viewMode === 'all' ? 'opacity-50 pointer-events-none' : ''}`}>
                <Button variant="ghost" size="sm" onClick={() => navigateDate('prev')} className="h-8 w-8 p-0" disabled={viewMode === 'all'}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigateDate('next')} className="h-8 w-8 p-0" disabled={viewMode === 'all'}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-10 gap-2 font-semibold shadow-sm px-4">
                    <CalendarRange className="h-4 w-4 text-violet-600" />
                    <span>{formatDateLabel(selectedDate)}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 shadow-2xl border-none rounded-2xl" align="start">
                  <div className="p-2">
                    <CalendarPopover
                      viewMode={viewMode}
                      setViewMode={setViewMode}
                      selectedDate={selectedDate}
                      setSelectedDate={setSelectedDate}
                      dateRange={dateRange}
                      setDateRange={setDateRange}
                      includeCart={true}
                      onClose={() => setShowDatePicker(false)}
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px] h-10 shadow-sm">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-xl border-none overflow-hidden bg-white">
        <CardContent className="p-0">
            {isLoading || isLoadingView ? (
              <div className="flex justify-center items-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
              </div>
            ) : (
              viewMode === "day" ? renderDayView() : 
              viewMode === "week" ? renderWeekView() : 
              viewMode === "month" ? renderMonthView() : 
              viewMode === "all" || viewMode === "cart" ? (
                <div className="p-4 bg-white">
                  <AllAppointmentsView 
                    appointments={filteredAppointments} 
                    isLoading={isLoading || isLoadingView}
                    onPay={handlePay}
                    onDelete={handleDelete}
                    isCart={viewMode === "cart"}
                  />
                </div>
              ) :
              renderCustomView()
            )}
        </CardContent>
      </Card>
      
      <ConfirmDialog
        open={isConfirmOpen}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmAction(null);
          }
          setIsConfirmOpen(open);
        }}
        title={confirmTitle}
        message={confirmMessage}
        loading={isProcessing}
        onConfirm={async () => {
          if (confirmAction) {
            await confirmAction();
            setConfirmAction(null);
          }
        }}
        confirmLabel="Confirm"
        cancelLabel="Cancel"
      />

      <Dialog open={!!selectedAppointment} onOpenChange={() => setSelectedAppointment(null)}>
        <DialogContent className="max-w-md">
            <DialogHeader>
                <DialogTitle>Appointment Details</DialogTitle>
            </DialogHeader>
            {selectedAppointment && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-gray-500 text-xs uppercase tracking-wider">Patient</Label>
                        <p className="font-semibold text-gray-900">{selectedAppointment.patientName}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-gray-500 text-xs uppercase tracking-wider">Doctor</Label>
                        <p className="font-semibold text-gray-900">Dr. {selectedAppointment.doctor}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-gray-500 text-xs uppercase tracking-wider">Service</Label>
                        <p className="font-semibold text-gray-900">{getAppointmentTypeName(selectedAppointment.type, selectedAppointment.customType)}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-gray-500 text-xs uppercase tracking-wider">Status</Label>
                        <div>
                          <Badge variant={selectedAppointment.status === 'scheduled' ? 'default' : 'secondary'}>
                            {selectedAppointment.status.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-gray-500 text-xs uppercase tracking-wider">Date</Label>
                        <div className="flex items-center gap-2 font-medium text-gray-900">
                          <CalendarIcon className="h-4 w-4 text-violet-500" />
                          {formatDateToYYYYMMDD(parseBackendDateToLocal(selectedAppointment.date))}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-gray-500 text-xs uppercase tracking-wider">Time</Label>
                        <div className="flex items-center gap-2 font-medium text-gray-900">
                          <Clock className="h-4 w-4 text-violet-500" />
                          {formatTimeTo12h(selectedAppointment.time)}
                        </div>
                      </div>
                    </div>

                    {selectedAppointment.notes && (
                      <div className="space-y-1 border-t pt-4">
                        <Label className="text-gray-500 text-xs uppercase tracking-wider">Notes</Label>
                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md italic">&quot;{selectedAppointment.notes}&quot;</p>
                      </div>
                    )}

                    <DialogFooter className="flex-col sm:flex-row gap-2 pt-4 border-t">
                      {(() => {
                        // show cancel when the appointment is NOT confirmed/scheduled and not in the past
                        const aptDate = parseBackendDateToLocal(selectedAppointment.date);
                        const endOfDay = new Date(aptDate);
                        endOfDay.setHours(23, 59, 59, 999);
                        const isPast = endOfDay.getTime() < new Date().getTime();
                        const showCancel = !["scheduled", "confirmed"].includes(selectedAppointment.status) && !isPast;

                        if (showCancel) {
                          return (
                            <Button
                              variant="destructive"
                              className="w-full gap-2"
                              onClick={() => {
                                if (selectedAppointment.status === 'pending') {
                                  handleDelete(selectedAppointment.id);
                                } else {
                                  handleCancelReservation(selectedAppointment.id);
                                }
                              }}
                              disabled={isProcessing}
                            >
                              <Trash2 className="h-4 w-4" />
                              Cancel Appointment
                            </Button>
                          );
                        }

                        return null;
                      })()}

                      {(selectedAppointment.status === 'scheduled' || selectedAppointment.status === 'confirmed') && (
                        <Button 
                          variant="outline" 
                          className="w-full gap-2 border-amber-200 text-amber-700 hover:bg-amber-50" 
                          onClick={() => handleRequestCancellation(selectedAppointment)}
                          disabled={isProcessing}
                        >
                          <AlertCircle className="h-4 w-4" />
                          Request Cancellation
                        </Button>
                      )}

                      {selectedAppointment.paymentStatus !== 'paid' && selectedAppointment.status !== 'cancelled' && (
                        <Button 
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2" 
                          onClick={() => handlePay(selectedAppointment)}
                          disabled={isProcessing}
                        >
                          <CreditCard className="h-4 w-4" />
                          Pay Now
                        </Button>
                      )}

                      <Button 
                        variant="ghost" 
                        onClick={() => setSelectedAppointment(null)}
                        className="w-full"
                        disabled={isProcessing}
                      >
                        Close
                      </Button>
                    </DialogFooter>
                </div>
            )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
