"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { DateRange } from "react-day-picker";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Calendar as CalendarIcon,
  CalendarRange,
  Trash2,
  Clock,
  X,
  ListFilter
} from "lucide-react";
import { useAppointmentModal } from "@/hooks/useAppointmentModal";
import { Appointment, AppointmentFilters } from "../hooks/useAppointments";
import { Badge } from "./ui/badge";
import { EditAppointmentModal } from "./EditAppointmentModal";
import { TIME_SLOTS, formatTimeTo12h } from "../lib/time-slots";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import CalendarPopover from "./CalendarPopover";
import { Label } from "./ui/label";
import { APPOINTMENT_TYPES, getAppointmentTypeName } from "../lib/appointment-types";
import { parseBackendDateToLocal, formatDateToYYYYMMDD } from "../lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { AllAppointmentsView } from "./AllAppointmentsView";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import ViewMode from "./viewMode";

const appointmentColors: Record<string, { bg: string; text: string; border: string }> = {
  "Routine Cleaning": { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  "Checkup": { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  "Filling": { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  "Root Canal": { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  "Extraction": { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  "Whitening": { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  "Other": { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" },
};

const APPOINTMENT_STATUSES = ["all", "scheduled", "confirmed", "To Pay", "tentative", "pending", "completed", "cancelled"];

export function DoctorCalendarView() {
  const { user } = useAuth();
  const doctorName = user?.username || "";

  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [isLoadingView, setIsLoadingView] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [activeRangeType, setActiveRangeType] = useState<"from" | "to">("from");

  const {
    openCreateModal,
    appointments,
    deleteAppointment,
    refreshAppointments,
    openEditModal
  } = useAppointmentModal();

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState<string | null>(null);

  // Filter appointments to only show this doctor's appointments
  const myAppointments = useMemo(() => {
    let filtered = appointments;
    if (doctorName) {
      filtered = filtered.filter(apt => String(apt.doctor || '').toLowerCase() === doctorName.toLowerCase());
    }
    if (selectedStatus === "all") {
      return filtered.filter(apt => apt.status !== "pending");
    }
    return filtered;
  }, [appointments, selectedStatus, doctorName]);

  const getViewRange = useCallback((date: Date) => {
    const start = new Date(date);
    const end = new Date(date);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (viewMode === 'day') return { start, end };
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

  useEffect(() => {
    // If custom view is active but both start and end are not yet selected,
    // don't make a backend request. Wait until a full range is chosen.
    if (viewMode === 'custom' && !(dateRange?.from && dateRange?.to)) return;

    const { start, end } = getViewRange(selectedDate);
    const filters: AppointmentFilters = {} as AppointmentFilters;

    if (searchTerm) {
      filters.search = searchTerm;
    } else {
      let fetchStartStr = "";
      let fetchEndStr = "";
      if (viewMode === 'custom' && dateRange?.from && dateRange?.to) {
        fetchStartStr = formatDateToYYYYMMDD(dateRange.from);
        fetchEndStr = formatDateToYYYYMMDD(dateRange.to);
      } else if (viewMode !== 'all') {
        const monthStart = new Date(start.getFullYear(), start.getMonth(), 1);
        const monthEnd = new Date(end.getFullYear(), end.getMonth() + 1, 0);
        monthEnd.setHours(23, 59, 59, 999);
        fetchStartStr = formatDateToYYYYMMDD(monthStart);
        fetchEndStr = formatDateToYYYYMMDD(monthEnd);
      }
      filters.startDate = fetchStartStr;
      filters.endDate = fetchEndStr;
    }

    filters.type = selectedType;
    filters.status = selectedStatus;
    filters.doctor = doctorName;

    setIsLoadingView(true);
    refreshAppointments(filters);
    const timer = setTimeout(() => setIsLoadingView(false), 500);
    return () => clearTimeout(timer);
  // Depend on the actual start/end values to avoid fetches when only the object reference changes.
  }, [viewMode, selectedDate, searchTerm, dateRange?.from, dateRange?.to, selectedType, selectedStatus, doctorName, getViewRange, refreshAppointments]);

  // Listen for global appointment updates and refresh
  useEffect(() => {
    const handler = (e: Event) => {
      try {
        const detail = (e as CustomEvent)?.detail;
        if (!detail) return;
        refreshAppointments({ doctor: doctorName, type: selectedType, status: selectedStatus } as AppointmentFilters);
      } catch (err) {
        // ignore
      }
    };
    window.addEventListener('appointments:updated', handler as EventListener);
    return () => window.removeEventListener('appointments:updated', handler as EventListener);
  }, [refreshAppointments, doctorName, selectedType, selectedStatus]);

  const timeSlots = TIME_SLOTS;
  const formatTime = formatTimeTo12h;

  const formatDateLabel = (date: Date) => {
    if (viewMode === "day") return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    if (viewMode === "week") {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    if (viewMode === "month") return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (viewMode === "all") return "All Appointments";
    if (dateRange?.from && dateRange?.to) return `${dateRange.from.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${dateRange.to.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    return "Select Range";
  };

  const getAppointmentsForDate = (date: Date) => {
    const dateStr = formatDateToYYYYMMDD(date);
    return myAppointments.filter(apt => apt.date === dateStr);
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
    const sorted = [...appointments].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time) || ((b.duration || 30) - (a.duration || 30)));
    const columns: Appointment[][] = [];
    const appointmentColumns = new Map<string, number>();
    sorted.forEach((apt) => {
      let columnIndex = 0;
      while (columnIndex < columns.length) {
        const hasOverlap = columns[columnIndex].some(existingApt => appointmentsOverlap(apt, existingApt));
        if (!hasOverlap) break;
        columnIndex++;
      }
      if (columnIndex === columns.length) columns.push([]);
      columns[columnIndex].push(apt);
      appointmentColumns.set(apt.id, columnIndex);
    });
    const maxOverlappingAt = new Map<string, number>();
    const clusters: Appointment[][] = [];
    sorted.forEach(apt => {
      let added = false;
      for (const cluster of clusters) {
        if (cluster.some(c => appointmentsOverlap(apt, c))) { cluster.push(apt); added = true; break; }
      }
      if (!added) clusters.push([apt]);
    });
    clusters.forEach(cluster => {
      const maxCol = Math.max(...cluster.map(a => appointmentColumns.get(a.id) ?? 0)) + 1;
      cluster.forEach(a => maxOverlappingAt.set(a.id, maxCol));
    });
    return { columns, appointmentColumns, maxOverlappingAt };
  };

  const calculateAppointmentStyle = (duration: number = 60) => {
    const slotHeight = 64;
    const slotsOccupied = duration / 30;
    return { height: `${slotHeight * slotsOccupied - 4}px` };
  };

  const renderDayView = () => {
    const dayAppointments = getAppointmentsForDate(selectedDate);
    const { appointmentColumns, maxOverlappingAt } = organizeAppointmentsIntoColumns(dayAppointments);
    const isMinuteOccupied: boolean[] = new Array(24 * 60).fill(false);
    dayAppointments.forEach((apt) => {
      const start = timeToMinutes(apt.time);
      const dur = apt.duration || 30;
      for (let m = start; m < start + dur; m++) if (m >= 0 && m < isMinuteOccupied.length) isMinuteOccupied[m] = true;
    });
    const isSlotCovered = (timeSlot: string) => {
      const slotStart = timeToMinutes(timeSlot);
      for (let m = slotStart; m < slotStart + 30; m++) if (isMinuteOccupied[m]) return true;
      return false;
    };

    return (
      <div className="space-y-0 relative">
        {timeSlots.map((timeSlot) => {
          const appointmentsStartingAtSlot = dayAppointments.filter((apt) => apt.time === timeSlot);
          const currentSlotIsCovered = isSlotCovered(timeSlot);
          return (
            <div key={timeSlot} className="flex items-start min-h-[64px] border-b border-gray-100 relative group">
              {!currentSlotIsCovered && (
                <div className="absolute inset-y-2 left-32 right-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer z-10 hover:bg-violet-50/50 rounded-xl border-2 border-dashed border-transparent hover:border-violet-200/50 group/plus" onClick={() => openCreateModal(selectedDate, timeSlot)}>
                  <Plus className="h-6 w-6 text-violet-300 transition-colors group-hover/plus:text-violet-600" />
                </div>
              )}

              <div className="w-28 pl-4 pt-2 text-sm text-muted-foreground font-medium sticky left-0 bg-white z-10 pointer-events-none">{formatTime(timeSlot)}</div>

              <div className="flex-1 relative min-h-[64px]">
                {appointmentsStartingAtSlot.map((appointment) => {
                  const columnIndex = appointmentColumns.get(appointment.id) ?? 0;
                  const totalColumns = maxOverlappingAt.get(appointment.id) ?? 1;
                  const typeName = getAppointmentTypeName(appointment.type, appointment.customType);
                  const colors = appointmentColors[typeName] || appointmentColors["Other"];
                  const width = `${100 / totalColumns}%`;
                  const left = `${(columnIndex * 100) / totalColumns}%`;
                  const patientAvatarSrc = (appointment as any).patientProfile || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(String(appointment.patientName || appointment.patientId || 'patient'))}`;

                  return (
                    <div key={appointment.id} className={`absolute top-0 ${colors.bg} ${colors.text} ${colors.border} border-l-4 rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-pointer z-20 overflow-hidden ${appointment.status === "tentative" ? "border-dashed opacity-90" : appointment.status === "To Pay" ? "border-double border-orange-400" : ""}`} style={{ ...calculateAppointmentStyle(appointment.duration), width: `calc(${width} - 4px)`, left: `calc(${left} + 2px)` }} onClick={(e) => { e.stopPropagation(); openEditModal(appointment); }}>
                      <div className="flex flex-col h-full">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            <Avatar className="h-10 w-10 border border-gray-100">
                              <AvatarImage src={patientAvatarSrc} alt={String(appointment.patientName || appointment.patientId || '')} />
                                <AvatarFallback>{String((appointment.patientName || String(appointment.patientId || '')).substring(0,2)).toUpperCase()}</AvatarFallback>
                            </Avatar>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm truncate pr-2 flex items-center gap-2">{appointment.patientName}<span className="text-xs opacity-80">• Dr. {appointment.doctor}</span></div>
                            <div className="text-xs opacity-90 truncate">{typeName} • {appointment.duration || 30}min</div>
                            {appointment.price != null && <div className="text-xs font-medium mt-auto pt-1">${appointment.price.toFixed(2)}</div>}
                          </div>
                        </div>
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

  const getWeekDays = (date: Date) => {
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const days = [] as Date[];
    for (let i = 0; i < 7; i++) { const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); days.push(d); }
    return days;
  };

  const renderWeekView = () => {
    const weekDays = getWeekDays(selectedDate);
    const dayLayouts = weekDays.map(day => {
      const dayAppointments = getAppointmentsForDate(day);
      const layout = organizeAppointmentsIntoColumns(dayAppointments);
      const isMinuteOccupied = new Array(24 * 60).fill(false);
      dayAppointments.forEach(apt => { const start = timeToMinutes(apt.time); const dur = apt.duration || 30; for (let m = start; m < start + dur; m++) if (m >= 0 && m < isMinuteOccupied.length) isMinuteOccupied[m] = true; });
      return { day, appointments: dayAppointments, layout, isMinuteOccupied };
    });

    return (
      <div className="overflow-x-auto">
        <div className="min-w-[1000px]">
          <div className="flex border-b-2 border-gray-200 sticky top-0 bg-white z-10">
            <div className="w-20 flex-shrink-0"></div>
            {weekDays.map((day, idx) => (
              <div key={idx} className="flex-1 text-center py-3 border-l border-gray-100">
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                <div className={`text-lg font-bold mt-1 ${day.toDateString() === new Date().toDateString() ? 'text-violet-600' : 'text-gray-900'}`}>{day.getDate()}</div>
              </div>
            ))}
          </div>

          <div className="relative">
            {timeSlots.map((timeSlot) => (
              <div key={timeSlot} className="flex min-h-[64px] border-b border-gray-50">
                <div className="w-20 flex-shrink-0 pt-2 pr-4 text-right text-sm font-medium text-muted-foreground sticky left-0 bg-white z-10">{formatTime(timeSlot)}</div>
                {weekDays.map((day, idx) => {
                  const { layout, isMinuteOccupied, appointments } = dayLayouts[idx];
                  const appointmentsForSlot = appointments.filter(apt => apt.time === timeSlot);
                  const { appointmentColumns, maxOverlappingAt } = layout;
                  const slotStartMinutes = timeToMinutes(timeSlot);
                  let currentSlotIsCovered = false;
                  for (let m = slotStartMinutes; m < slotStartMinutes + 30; m++) if (isMinuteOccupied[m]) { currentSlotIsCovered = true; break; }

                  return (
                    <div key={idx} className="flex-1 border-l border-gray-100 relative min-h-[64px] group">
                      {!currentSlotIsCovered && (
                        <div className="absolute inset-1 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer z-10 hover:bg-violet-50/50 rounded border border-dashed border-transparent hover:border-violet-200/50" onClick={() => openCreateModal(day, timeSlot)}>
                          <Plus className="h-5 w-5 text-violet-300" />
                        </div>
                      )}

                      <div className="relative w-full h-full">
                        {appointmentsForSlot.map((appointment) => {
                          const columnIndex = appointmentColumns.get(appointment.id) ?? 0;
                          const totalColumns = maxOverlappingAt.get(appointment.id) ?? 1;
                          const typeName = getAppointmentTypeName(appointment.type, appointment.customType);
                          const colors = appointmentColors[typeName] || appointmentColors["Other"];
                          const width = `${100 / totalColumns}%`;
                          const left = `${(columnIndex * 100) / totalColumns}%`;
                          const patientAvatarSrc = (appointment as any).patientProfile || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(String(appointment.patientName || appointment.patientId || 'patient'))}`;

                          return (
                            <div key={appointment.id} className={`absolute top-0 ${colors.bg} ${colors.text} ${colors.border} border-l-4 rounded-lg p-2 shadow-sm hover:shadow-md transition-all cursor-pointer z-20 overflow-hidden text-xs ${appointment.status === "tentative" ? "border-dashed opacity-90" : appointment.status === "To Pay" ? "border-double border-orange-400" : ""}`} style={{ ...calculateAppointmentStyle(appointment.duration), width: `calc(${width} - 4px)`, left: `calc(${left} + 2px)` }} onClick={(e) => { e.stopPropagation(); openEditModal(appointment); }}>
                              <div className="flex items-start gap-2">
                                <div className="flex-shrink-0">
                                  <Avatar className="h-8 w-8 border border-gray-100">
                                    <AvatarImage src={patientAvatarSrc} alt={String(appointment.patientName || appointment.patientId || '')} />
                                      <AvatarFallback>{String((appointment.patientName || String(appointment.patientId || '')).substring(0,2)).toUpperCase()}</AvatarFallback>
                                  </Avatar>
                                </div>
                                <div className="flex-1 truncate">
                                  <div className="font-semibold truncate">{appointment.patientName}</div>
                                  <div className="truncate opacity-90 text-[11px]">{typeName}</div>
                                </div>
                                <div className="text-right text-xs font-medium">{appointment.time}</div>
                              </div>
                            </div>
                          );
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

  const renderMonthView = () => {
    const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
    const startDay = startOfMonth.getDay();
    const daysInMonth = endOfMonth.getDate();
    const prevMonthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 0).getDate();
    const days: { day: number; currentMonth: boolean; date: Date }[] = [];
    for (let i = startDay - 1; i >= 0; i--) days.push({ day: prevMonthEnd - i, currentMonth: false, date: new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, prevMonthEnd - i) });
    for (let i = 1; i <= daysInMonth; i++) days.push({ day: i, currentMonth: true, date: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i) });
    const remainingSlots = 42 - days.length;
    for (let i = 1; i <= remainingSlots; i++) days.push({ day: i, currentMonth: false, date: new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, i) });

    return (
      <div className="grid grid-cols-7 border-t border-l border-gray-200">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-3 text-center text-xs font-bold text-gray-500 bg-gray-50 border-r border-b border-gray-200 uppercase tracking-wider">{day}</div>
        ))}
        {days.map((item, idx) => {
          const dayAppointments = getAppointmentsForDate(item.date);
          const sortedDayAppointments = [...dayAppointments].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
          const isToday = item.date.toDateString() === new Date().toDateString();
          return (
            <div key={idx} className={`min-h-[120px] p-2 border-r border-b border-gray-200 transition-colors cursor-pointer ${item.currentMonth ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/50 text-gray-400'}`} onClick={() => { setSelectedDate(item.date); setViewMode('day'); }}>
              <div className="flex justify-between items-start mb-2">
                <span className={`text-sm font-semibold p-1 rounded-full w-7 h-7 flex items-center justify-center ${isToday ? 'bg-violet-600 text-white' : ''}`}>{item.day}</span>
                {dayAppointments.length > 0 && <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{dayAppointments.length}</Badge>}
              </div>
              <div className="space-y-1">
                {sortedDayAppointments.slice(0,3).map((apt) => {
                  const typeName = getAppointmentTypeName(apt.type, apt.customType);
                  const colors = appointmentColors[typeName] || appointmentColors['Other'];
                  const patientAvatarSrc = (apt as any).patientProfile || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(String(apt.patientName || apt.patientId || 'patient'))}`;
                  return (
                    <div key={apt.id} className={`flex items-center text-[11px] p-1 rounded truncate border-l-2 ${colors.bg} ${colors.text} ${colors.border} ${apt.status === 'tentative' ? 'border-dashed opacity-80' : apt.status === 'To Pay' ? 'border-orange-400' : ''}`} onClick={(e) => { e.stopPropagation(); openEditModal(apt); }}>
                      <div className="flex-shrink-0 mr-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={patientAvatarSrc} alt={String(apt.patientName || '')} />
                          <AvatarFallback>{String((apt.patientName || '').substring(0,2)).toUpperCase()}</AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{apt.time} • {apt.patientName}</div>
                        <div className="text-[10px] opacity-80 truncate">{typeName}</div>
                      </div>
                      {apt.status === 'To Pay' && <div className="ml-2 text-[10px] font-black text-orange-600">P</div>}
                    </div>
                  );
                })}
                {dayAppointments.length > 3 && <div className="text-[10px] text-muted-foreground pl-1 font-medium">+ {dayAppointments.length - 3} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderCustomView = () => {
    const sortedAppointments = [...myAppointments].sort((a,b) => parseBackendDateToLocal(a.date).getTime() - parseBackendDateToLocal(b.date).getTime());
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
                <div className="text-center py-12 text-muted-foreground bg-white rounded-lg border-2 border-dashed">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No appointments found for the selected filters.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedAppointments.map((apt) => {
                    const typeName = getAppointmentTypeName(apt.type, apt.customType);
                    const colors = appointmentColors[typeName] || appointmentColors['Other'];
                    return (
                      <Card key={apt.id} className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onClick={() => openEditModal(apt)}>
                        <div className={`h-1 ${colors.bg.replace('bg-', 'bg-').split(' ')[0]}`} />
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div className="font-bold text-lg">{apt.patientName}</div>
                            <Badge className={`${colors.bg} ${colors.text} border-none`}>{typeName}</Badge>
                          </div>
                          <div className="space-y-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2"><CalendarIcon className="h-4 w-4" /><span>{parseBackendDateToLocal(apt.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {apt.time}</span></div>
                            <div className="flex items-center gap-2"><Clock className="h-4 w-4" /><span>{apt.duration || 60} minutes</span></div>
                            <div className="flex items-center gap-2"><span className="text-sm font-medium">Dr. {apt.doctor}</span></div>
                            {apt.price != null && <div className="flex items-center gap-2"><span className="font-medium">${apt.price.toFixed(2)}</span></div>}
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

  const navigateDate = (direction: 'prev' | 'next') => {
    setSearchTerm("");
    const newDate = new Date(selectedDate);
    if (viewMode === 'day') newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 1 : -1));
    else if (viewMode === 'week') newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 7 : -7));
    else if (viewMode === 'month') newDate.setMonth(selectedDate.getMonth() + (direction === 'next' ? 1 : -1));
    else if (viewMode === 'custom' && dateRange?.from && dateRange?.to) {
      const diffTime = Math.abs(dateRange.to.getTime() - dateRange.from.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      const shift = direction === 'next' ? diffDays : -diffDays;
      const newFrom = new Date(dateRange.from); newFrom.setDate(newFrom.getDate() + shift);
      const newTo = new Date(dateRange.to); newTo.setDate(newTo.getDate() + shift);
      setDateRange({ from: newFrom, to: newTo });
      return;
    }
    setSelectedDate(newDate);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Schedule</h1>
          <p className="text-muted-foreground">View and manage your appointments</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input type="text" placeholder="Search appointments..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 pr-9 w-64 h-10 shadow-sm" />
            {searchTerm && (<button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>)}
          </div>
          <Button variant="brand" onClick={() => openCreateModal(selectedDate)} className="h-10"><Plus className="h-4 w-4 mr-2" />New Appointment</Button>
        </div>
      </div>

      <Card className="shadow-sm border-none bg-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center bg-gray-50 rounded-lg p-1 border ${viewMode === 'all' ? 'opacity-50 pointer-events-none' : ''}`}>
                <Button variant="ghost" size="sm" onClick={() => navigateDate('prev')} className="h-8 w-8 p-0" disabled={viewMode === 'all'}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => navigateDate('next')} className="h-8 w-8 p-0" disabled={viewMode === 'all'}><ChevronRight className="h-4 w-4" /></Button>
              </div>

              <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-10 gap-2 font-semibold shadow-sm px-4"><CalendarRange className="h-4 w-4 text-violet-600" /><span>{formatDateLabel(selectedDate)}</span></Button>
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
                      onClose={() => setShowDatePicker(false)}
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center space-x-3">
                {/* View mode switcher for doctors */}
                <div className="flex items-center gap-2">
                  {(["day", "week", "month", "custom", "all"] as const).map((mode) => (
                    <Button
                      key={mode}
                      variant={viewMode === mode ? "brand" : "ghost"}
                      size="sm"
                      className="h-9 px-3 capitalize font-medium text-xs"
                      onClick={() => setViewMode(mode)}
                    >
                      {mode}
                    </Button>
                  ))}
                </div>
              <div className="flex items-center gap-2">
                <ListFilter className="h-4 w-4 text-gray-400" />
                <Select value={selectedType} onValueChange={setSelectedType}><SelectTrigger className="w-[180px] h-10 shadow-sm"><SelectValue placeholder="Filter by type" /></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem>{APPOINTMENT_TYPES.map((type, index) => (<SelectItem key={index} value={String(index)}>{type}</SelectItem>))}</SelectContent></Select>
              </div>
              <div className="flex items-center gap-2">
                <ListFilter className="h-4 w-4 text-gray-400" />
                <Select value={selectedStatus} onValueChange={setSelectedStatus}><SelectTrigger className="w-[180px] h-10 shadow-sm"><SelectValue placeholder="Filter by status" /></SelectTrigger><SelectContent>{APPOINTMENT_STATUSES.map((status) => (<SelectItem key={status} value={status} className="capitalize">{status === 'all' ? 'All Statuses' : status}</SelectItem>))}</SelectContent></Select>
              </div>

              <Badge variant="secondary" className="bg-violet-50 text-violet-700 border-violet-100 h-10 px-4 rounded-lg font-semibold flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-violet-600 animate-pulse" />{searchTerm !== "" ? "Search Results" : (viewMode === "day" ? "Day View" : viewMode === "week" ? "Week View" : viewMode === "month" ? "Month View" : viewMode === "all" ? "All Appointments" : "Custom Range")}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-xl border-none overflow-hidden bg-white">
        <CardHeader className="border-b bg-gray-50/50 py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold flex items-center gap-2">{viewMode === "day" && <Clock className="h-5 w-5 text-violet-600" />}{viewMode === "week" && <CalendarRange className="h-5 w-5 text-violet-600" />}{viewMode === "month" && <CalendarIcon className="h-5 w-5 text-violet-600" />}{viewMode === "custom" && <Search className="h-5 w-5 text-violet-600" />}{searchTerm !== "" ? "Search Results" : (viewMode === "day" ? "Schedule" : "Appointment Overview")}</CardTitle>
            <div className="flex items-center gap-4 flex-wrap">{Object.entries(appointmentColors).slice(0, 5).map(([type, colors]) => (<div key={type} className="flex items-center gap-1.5"><div className={`w-3 h-3 rounded-full ${colors.bg.replace('bg-', 'bg-').split(' ')[0]} border ${colors.border}`} /><span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">{type}</span></div>))}</div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[700px] overflow-y-auto">
            {isLoadingView ? (<div className="flex flex-col items-center justify-center py-24 space-y-4"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div><p className="text-sm font-medium text-muted-foreground animate-pulse">Loading schedule...</p></div>) : (<>{searchTerm !== "" ? renderCustomView() : (<>{viewMode === "day" && renderDayView()}{viewMode === "week" && renderWeekView()}{viewMode === "month" && renderMonthView()}{viewMode === "custom" && renderCustomView()}{viewMode === "all" && (<div className="p-4"><AllAppointmentsView appointments={myAppointments} isLoading={isLoadingView} /></div>)}</>)}</>) }
          </div>
        </CardContent>
      </Card>

      <EditAppointmentModal />

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Appointment</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 className="h-8 w-8" /></div>
            <p className="text-sm text-muted-foreground">Are you sure you want to delete this appointment? This action cannot be undone.</p>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="px-8">Cancel</Button>
            <Button variant="destructive" className="px-8" onClick={() => { if (appointmentToDelete) { deleteAppointment(appointmentToDelete); setIsDeleteDialogOpen(false); setAppointmentToDelete(null); } }}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Users({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
  );
}
