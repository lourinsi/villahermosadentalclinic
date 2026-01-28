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
  Edit, 
  Trash2, 
  Clock,
  X,
  DollarSign,
  ListFilter,
  Keyboard
} from "lucide-react";
import { useAppointmentModal } from "@/hooks/useAppointmentModal";
import { Appointment, AppointmentFilters } from "../hooks/useAppointments";
import { Badge } from "./ui/badge";
import { EditAppointmentModal } from "./EditAppointmentModal";
import { useDoctors } from "../hooks/useDoctors";
import { TIME_SLOTS, formatTimeTo12h } from "../lib/time-slots";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { Label } from "./ui/label";
import { APPOINTMENT_TYPES, getAppointmentTypeName } from "../lib/appointment-types";
import { parseBackendDateToLocal, formatDateToYYYYMMDD } from "../lib/utils";
import { AllAppointmentsView } from "./AllAppointmentsView";

type ViewMode = "month" | "week" | "day" | "custom" | "all";

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


export function CalendarView() {
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("all");
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
  const { doctors, isLoadingDoctors } = useDoctors();
  
  // Filter appointments when "all" status is selected to exclude "pending"
  const filteredAppointments = useMemo(() => {
    if (selectedStatus === "all") {
      return appointments.filter(apt => apt.status !== "pending");
    }
    return appointments;
  }, [appointments, selectedStatus]);

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

  useEffect(() => {
    const { start, end } = getViewRange(selectedDate);
    
    const filters: AppointmentFilters = {};

    if (searchTerm) {
      filters.search = searchTerm;
    } else {
      let fetchStartStr: string;
      let fetchEndStr: string;

      if (viewMode === 'custom' && dateRange?.from && dateRange?.to) {
        fetchStartStr = formatDateToYYYYMMDD(dateRange.from);
        fetchEndStr = formatDateToYYYYMMDD(dateRange.to);
      } else if (viewMode !== 'all') { // For day, week, month, use a monthly range
        const monthStart = new Date(start.getFullYear(), start.getMonth(), 1);
        const monthEnd = new Date(end.getFullYear(), end.getMonth() + 1, 0);
        monthEnd.setHours(23, 59, 59, 999);
        fetchStartStr = formatDateToYYYYMMDD(monthStart);
        fetchEndStr = formatDateToYYYYMMDD(monthEnd);
      } else { // 'all' view has no date constraints unless custom range is set
        fetchStartStr = "";
        fetchEndStr = "";
      }
      filters.startDate = fetchStartStr;
      filters.endDate = fetchEndStr;
    }

    // Always apply other filters
    filters.doctor = selectedDoctor;
    filters.type = selectedType;
    filters.status = selectedStatus;

    setIsLoadingView(true);
    refreshAppointments(filters);
    const timer = setTimeout(() => setIsLoadingView(false), 500);
    return () => clearTimeout(timer);
    
  }, [viewMode, selectedDate, searchTerm, dateRange, selectedDoctor, selectedType, selectedStatus, getViewRange, refreshAppointments]);

  const timeSlots = TIME_SLOTS;

  const formatTime = formatTimeTo12h;

  const formatDateLabel = (date: Date) => {
    if (viewMode === "day") {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
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
    } else {
      if (dateRange?.from && dateRange?.to) {
        return `${dateRange.from.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${dateRange.to.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      }
      return "Select Range";
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    setSearchTerm("");
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

  const getAppointmentsForDate = (date: Date) => {
    const dateStr = formatDateToYYYYMMDD(date);
    // Filtering is now done by the backend, we just need to filter by date for the calendar views
    return filteredAppointments.filter(apt => apt.date === dateStr);
  };

  const getColorForType = (type: string) => {
    return appointmentColors[type] || appointmentColors["Other"];
  };

  // NOTE: Convert time string to minutes since midnight for easier comparison
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // NOTE: Check if two appointments overlap
  const appointmentsOverlap = (apt1: Appointment, apt2: Appointment): boolean => {
    const start1 = timeToMinutes(apt1.time);
    const end1 = start1 + (apt1.duration || 30);
    const start2 = timeToMinutes(apt2.time);
    const end2 = start2 + (apt2.duration || 30);
    
    return start1 < end2 && start2 < end1;
  };

  // NOTE: Organize appointments into columns to handle overlaps
  const organizeAppointmentsIntoColumns = (appointments: Appointment[]) => {
    if (appointments.length === 0) return { columns: [], appointmentColumns: new Map<string, number>(), maxOverlappingAt: new Map<string, number>() };
    
    // Sort appointments by start time, then by duration (longer first)
    const sorted = [...appointments].sort((a, b) => {
      const timeCompare = timeToMinutes(a.time) - timeToMinutes(b.time);
      if (timeCompare !== 0) return timeCompare;
      return (b.duration || 30) - (a.duration || 30);
    });

    const columns: Appointment[][] = [];
    const appointmentColumns = new Map<string, number>(); // appointmentId -> columnIndex
    
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
    
    // Group appointments into clusters of overlapping ones
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
    const slotHeight = 80; // pixels per 30-minute slot
    const slotsOccupied = duration / 30;
    return {
      height: `${slotHeight * slotsOccupied - 4}px`
    };
  };

  const renderDayView = () => {
    const dayAppointments = getAppointmentsForDate(selectedDate);
    const { appointmentColumns, maxOverlappingAt } = organizeAppointmentsIntoColumns(dayAppointments);

    // Calculate occupied time segments for the entire day (minute by minute)
    // This will help determine if a 30-minute slot is covered by any appointment duration.
const isMinuteOccupied: boolean[] = new Array(24 * 60).fill(false);
    dayAppointments.forEach((apt: Appointment) => {
      const startTimeMinutes = timeToMinutes(apt.time);
      const duration = apt.duration || 30; // Default to 30 mins
      const endTimeMinutes = startTimeMinutes + duration;

      for (let m = startTimeMinutes; m < endTimeMinutes; m++) {
        if (m >= 0 && m < isMinuteOccupied.length) {
          isMinuteOccupied[m] = true;
        }
      }
    });

    // Function to check if a 30-minute timeSlot is covered by an appointment
    const isSlotCovered = (timeSlot: string): boolean => {
      const slotStartMinutes = timeToMinutes(timeSlot);
      // Check if any minute within this 30-minute slot is occupied
      for (let m = slotStartMinutes; m < slotStartMinutes + 30; m++) {
        if (isMinuteOccupied[m]) {
          return true;
        }
      }
      return false;
    };

    return (
      <div className="space-y-0 relative">
        {timeSlots.map((timeSlot) => {
          const appointmentsStartingAtSlot = dayAppointments.filter((apt: Appointment) => apt.time === timeSlot);
          const currentSlotIsCovered = isSlotCovered(timeSlot); // Check if the 30-min slot is covered

          return (
            <div key={timeSlot} className="flex items-start min-h-[80px] border-b border-gray-100 relative group">
              {!currentSlotIsCovered && (
                /* Wide position for empty slots: centered in the main area */
                <div
                  className="absolute inset-y-2 left-32 right-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer z-10 hover:bg-violet-50/50 rounded-xl border-2 border-dashed border-transparent hover:border-violet-200/50 group/plus"
                  onClick={() => openCreateModal(selectedDate, timeSlot)}
                >
                  <Plus className="h-6 w-6 text-violet-300 transition-colors group-hover/plus:text-violet-600" />
                </div>
              )}

              {/* Time Label */}
              <div className="w-28 pl-4 pt-2 text-sm text-muted-foreground font-medium sticky left-0 bg-white z-10 pointer-events-none">
                {formatTime(timeSlot)}
              </div>
              
              <div className="flex-1 relative min-h-[80px]">
                {/* Appointments starting at this slot */}
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
                      className={`absolute top-0 ${colors?.bg} ${colors?.text} ${colors?.border} border-l-4 rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-pointer z-20 overflow-hidden ${
                        appointment.status === "tentative" ? "border-dashed opacity-90" : 
                        appointment.status === "To Pay" ? "border-double border-orange-400" : ""
                      }`}
                      style={{
                        ...calculateAppointmentStyle(appointment.duration),
                        width: `calc(${width} - 4px)`,
                        left: `calc(${left} + 2px)`,
                      }}
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(appointment);
                          }}
                    >
                      <div className="flex flex-col h-full">
                        <div className="flex items-start justify-between">
                          <div className="font-semibold text-sm truncate pr-2 flex items-center gap-1">
                            {appointment.patientName}
                            {appointment.status === "tentative" && (
                              <Badge variant="outline" className="text-[8px] h-3 px-1 bg-yellow-100 border-yellow-300 text-yellow-700">Reserved</Badge>
                            )}
                            {appointment.status === "To Pay" && (
                              <Badge variant="outline" className="text-[8px] h-3 px-1 bg-orange-100 border-orange-300 text-orange-700">To Pay</Badge>
                            )}
                          </div>
                          <div className="flex flex-shrink-0 space-x-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 w-6 p-0 hover:bg-black/5"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditModal(appointment);
                              }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 w-6 p-0 hover:bg-black/5"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAppointmentToDelete(appointment.id);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="text-xs opacity-90 truncate">
                          {typeName} • {appointment.duration || 30}min
                        </div>
                        <div className="text-xs opacity-80 mt-1 truncate">
                          {appointment.doctor}
                        </div>
                        {appointment.price != null && (
                          <div className="text-xs font-medium mt-auto pt-1">
                            ${appointment.price.toFixed(2)}
                          </div>
                        )}
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

    // Pre-calculate layout for each day
    const dayLayouts = weekDays.map(day => {
      const dayAppointments = getAppointmentsForDate(day);
      const layout = organizeAppointmentsIntoColumns(dayAppointments);
      
      // Calculate occupied minutes
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
            {timeSlots.map((timeSlot) => (
              <div key={timeSlot} className="flex min-h-[80px] border-b border-gray-50">
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
                      className="flex-1 border-l border-gray-100 relative min-h-[80px] group"
                    >
                        {/* Plus button */}
                        {!currentSlotIsCovered && (
                            <div
                            className="absolute inset-1 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer z-10 hover:bg-violet-50/50 rounded border border-dashed border-transparent hover:border-violet-200/50"
                            onClick={() => openCreateModal(day, timeSlot)}
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
                              className={`absolute top-0 ${colors?.bg} ${colors?.text} ${colors?.border} border-l-4 rounded-lg p-2 shadow-sm hover:shadow-md transition-all cursor-pointer z-20 overflow-hidden text-xs ${
                                appointment.status === "tentative" ? "border-dashed opacity-90" : 
                                appointment.status === "To Pay" ? "border-double border-orange-400" : ""
                              }`}
                              style={{
                                ...calculateAppointmentStyle(appointment.duration),
                                width: `calc(${width} - 4px)`,
                                left: `calc(${left} + 2px)`,
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditModal(appointment);
                              }}
                            >
                              <div className="flex justify-between items-start">
                                <div className="font-semibold truncate pr-1 flex flex-wrap items-center gap-1">
                                  {appointment.patientName}
                                  {appointment.status === "tentative" && (
                                    <Badge variant="outline" className="text-[7px] h-2.5 px-0.5 bg-yellow-100 border-yellow-300 text-yellow-700 leading-none">R</Badge>
                                  )}
                                  {appointment.status === "To Pay" && (
                                    <Badge variant="outline" className="text-[7px] h-2.5 px-0.5 bg-orange-100 border-orange-300 text-orange-700 leading-none">P</Badge>
                                  )}
                                </div>
                              </div>
                              <div className="truncate opacity-90">{typeName}</div>
                              <div className="truncate opacity-75 mt-0.5">{appointment.doctor}</div>
                              {appointment.price != null && <div className="mt-1 font-medium">${appointment.price.toFixed(2)}</div>}
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

  const renderMonthView = () => {
    const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
    const startDay = startOfMonth.getDay();
    const daysInMonth = endOfMonth.getDate();
    
    const prevMonthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 0).getDate();
    
    const days = [];
    // Previous month days
    for (let i = startDay - 1; i >= 0; i--) {
      days.push({ day: prevMonthEnd - i, currentMonth: false, date: new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, prevMonthEnd - i) });
    }
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, currentMonth: true, date: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i) });
    }
    // Next month days
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
          const sortedDayAppointments = [...dayAppointments].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
          const isToday = item.date.toDateString() === new Date().toDateString();

          return (
            <div
              key={idx}
              className={`min-h-[120px] p-2 border-r border-b border-gray-200 transition-colors cursor-pointer ${
                item.currentMonth ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/50 text-gray-400'
              }`}
              onClick={() => {
                setSelectedDate(item.date);
                setViewMode("day");
              }}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`text-sm font-semibold p-1 rounded-full w-7 h-7 flex items-center justify-center ${
                  isToday ? 'bg-violet-600 text-white' : ''
                }`}>
                  {item.day}
                </span>
                {dayAppointments.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                    {dayAppointments.length}
                  </Badge>
                )}
              </div>
              <div className="space-y-1">
                {sortedDayAppointments.slice(0, 3).map((apt: Appointment) => {
                  const typeName = getAppointmentTypeName(apt.type, apt.customType);
                  const colors = getColorForType(typeName);
                  return (
                    <div
                      key={apt.id}
                      className={`text-[10px] p-1 rounded truncate border-l-2 ${colors.bg} ${colors.text} ${colors.border} ${
                        apt.status === "tentative" ? "border-dashed opacity-80" : 
                        apt.status === "To Pay" ? "border-orange-400" : ""
                      }`}
                    >
                      {apt.time} {apt.patientName} 
                      {apt.status === "tentative" && " (R)"}
                      {apt.status === "To Pay" && " (P)"}
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

  const renderCustomView = () => {
    // Client-side filtering is removed, appointments are pre-filtered
    const sortedAppointments = [...filteredAppointments].sort((a, b) => parseBackendDateToLocal(a.date).getTime() - parseBackendDateToLocal(b.date).getTime());
    
    return (
      <div className="space-y-4 p-4">
        {sortedAppointments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-gray-50 rounded-lg border-2 border-dashed">
            <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No appointments found for the selected filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedAppointments.map((apt: Appointment) => {
              const typeName = getAppointmentTypeName(apt.type, apt.customType);
              const colors = getColorForType(typeName);
              return (
                <Card key={apt.id} className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onClick={() => { openEditModal(apt); }}>
                  <div className={`h-1 ${colors.bg.replace('bg-', 'bg-').split(' ')[0]}`} />
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-bold text-lg">{apt.patientName}</div>
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
                        <Users className="h-4 w-4" />
                        <span>{apt.doctor}</span>
                      </div>
                      {apt.price != null && (
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          <span>${apt.price.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointment Calendar</h1>
          <p className="text-muted-foreground">Manage clinic schedules and patient bookings</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search appointments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-9 w-64 h-10 shadow-sm"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button variant="brand" onClick={() => openCreateModal(selectedDate)} className="h-10">
            <Plus className="h-4 w-4 mr-2" />
            New Appointment
          </Button>
        </div>
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
                  <div className={`bg-white rounded-2xl overflow-hidden ${viewMode === "custom" ? "min-w-[600px]" : "min-w-[320px]"}`}>
                    {viewMode === "custom" ? (
                      <>
                        {/* Header: Range Summary and Inputs */}
                        <div className="p-6 border-b flex items-start justify-between">
                          <div className="space-y-1">
                            <h3 className="text-2xl font-bold text-gray-900">
                              {dateRange?.from && dateRange?.to ? (
                                <>
                                  {Math.ceil(Math.abs(dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1} days range
                                </>
                              ) : (
                                "Select dates"
                              )}
                            </h3>
                            <p className="text-sm text-gray-500 font-medium">
                              {dateRange?.from ? (
                                <>
                                  {dateRange.from.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  {dateRange.to && ` - ${dateRange.to.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                                </>
                              ) : (
                                "Choose your appointment period"
                              )}
                            </p>
                          </div>

                          <div className="flex items-center gap-0 border rounded-xl overflow-hidden shadow-sm">
                            <button 
                              onClick={() => setActiveRangeType("from")}
                              className={`px-4 py-2 border-r bg-white min-w-[140px] text-left transition-colors ${activeRangeType === "from" ? "ring-2 ring-inset ring-violet-600" : "hover:bg-gray-50"}`}
                            >
                              <Label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-0.5 cursor-pointer">Start Date</Label>
                              <div className="text-sm font-semibold text-gray-700">
                                {dateRange?.from ? dateRange.from.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) : "MM/DD/YYYY"}
                              </div>
                            </button>
                            <button 
                              onClick={() => setActiveRangeType("to")}
                              className={`px-4 py-2 bg-white min-w-[140px] text-left transition-colors ${activeRangeType === "to" ? "ring-2 ring-inset ring-violet-600" : "hover:bg-gray-50"}`}
                            >
                              <Label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-0.5 cursor-pointer">End Date</Label>
                              <div className="text-sm font-semibold text-gray-700">
                                {dateRange?.to ? dateRange.to.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) : "MM/DD/YYYY"}
                              </div>
                            </button>
                          </div>
                        </div>

                        {/* View Mode Switcher */}
                        <div className="px-6 py-3 bg-gray-50/50 border-b flex items-center gap-3">
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mr-2">View:</span>
                          <div className="flex items-center bg-white rounded-lg p-1 border shadow-sm">
                            {(["day", "week", "month", "custom", "all"] as const).map((mode) => (
                              <Button
                                key={mode}
                                variant={viewMode === mode ? "brand" : "ghost"}
                                size="sm"
                                className={`h-8 px-4 capitalize font-bold text-xs ${viewMode === mode ? "" : "text-gray-500 hover:text-gray-900"}`}
                                onClick={() => {
                                  setSearchTerm("");
                                  setViewMode(mode);
                                  if (mode !== "custom") setShowDatePicker(false);
                                }}
                              >
                                {mode}
                              </Button>
                            ))}
                          </div>
                        </div>

                        {/* Calendar Content */}
                        <div className="p-4 flex justify-center">
                          <Calendar
                            mode="range"
                            selected={dateRange}
                            onSelect={(_range: DateRange | undefined, selectedDay: Date) => {
                              setSearchTerm("");
                              // When using mode="range", the library handles the range logic.
                              // We use activeRangeType to override/direct which part of the range is being set.
                              const selectedDate = selectedDay;
                              
                              if (activeRangeType === "from") {
                                if (selectedDate) {
                                  setDateRange({ from: selectedDate, to: dateRange?.to && selectedDate <= dateRange.to ? dateRange.to : undefined });
                                  setActiveRangeType("to");
                                }
                              } else {
                                if (selectedDate) {
                                  if (dateRange?.from && selectedDate < dateRange.from) {
                                    // If user picks an end date before start date, treat it as new start date
                                    setDateRange({ from: selectedDate, to: undefined });
                                    setActiveRangeType("to");
                                  } else {
                                    setDateRange({ from: dateRange?.from || selectedDate, to: selectedDate });
                                  }
                                }
                              }
                            }}
                            numberOfMonths={2}
                            className="border-none shadow-none"
                            classNames={{
                              months: "flex flex-row gap-8",
                              month: "space-y-4",
                              caption: "flex justify-center pt-1 relative items-center",
                              caption_label: "text-sm font-bold text-gray-900",
                              nav: "space-x-1 flex items-center",
                              nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                              nav_button_previous: "absolute left-1",
                              nav_button_next: "absolute right-1",
                              table: "w-full border-collapse space-y-1",
                              head_row: "flex",
                              head_cell: "text-gray-400 rounded-md w-9 font-bold text-[10px] uppercase",
                              row: "flex w-full mt-2",
                              cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-full [&:has([aria-selected].day-range-start)]:rounded-l-full first:[&:has([aria-selected])]:rounded-l-full last:[&:has([aria-selected])]:rounded-r-full focus-within:relative focus-within:z-20",
                              day: "h-9 w-9 p-0 font-bold aria-selected:opacity-100 rounded-full hover:bg-gray-100 transition-colors",
                              day_range_start: "day-range-start bg-violet-600 text-white hover:bg-violet-600 hover:text-white focus:bg-violet-600 focus:text-white",
                              day_range_end: "day-range-end bg-violet-600 text-white hover:bg-violet-600 hover:text-white focus:bg-violet-600 focus:text-white",
                              day_selected: "bg-violet-600 text-white hover:bg-violet-600 hover:text-white focus:bg-violet-600 focus:text-white",
                              day_today: "bg-gray-100 text-gray-900",
                              day_outside: "text-gray-300 opacity-50",
                              day_disabled: "text-gray-300 opacity-50",
                              day_range_middle: "aria-selected:bg-violet-50 aria-selected:text-violet-900 rounded-none",
                              day_hidden: "invisible",
                            }}
                          />
                        </div>

                        {/* Footer: Action Buttons */}
                        <div className="p-4 border-t bg-gray-50/30 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                             <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-10 w-10 text-gray-400 hover:text-violet-600"
                            >
                              <Keyboard className="h-5 w-5" />
                            </Button>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <Button 
                              variant="ghost" 
                              className="text-sm font-bold text-gray-900 hover:bg-gray-100 underline decoration-2 underline-offset-4"
                              onClick={() => {
                                setDateRange(undefined);
                                setSearchTerm("");
                              }}
                            >
                              Clear dates
                            </Button>
                            <Button 
                              className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2 rounded-xl font-bold transition-all shadow-md active:scale-95"
                              onClick={() => setShowDatePicker(false)}
                            >
                              Close
                            </Button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="p-4 space-y-4 bg-white rounded-xl">
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-wider text-gray-400">View Mode</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {(["day", "week", "month", "custom", "all"] as const).map((mode) => (
                              <Button
                                key={mode}
                                variant={viewMode === mode ? "brand" : "outline"}
                                size="sm"
                                className="h-9 capitalize font-medium"
                                onClick={() => {
                                  setSearchTerm("");
                                  setViewMode(mode);
                                  if (mode !== "custom") setShowDatePicker(false);
                                }}
                              >
                                {mode}
                              </Button>
                            ))}
                          </div>
                        </div>

                        <div className="border-t pt-4">
                          <Label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 block">
                            Select Date
                          </Label>
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={(date: Date | undefined) => {
                              if (date) {
                                setSearchTerm("");
                                setSelectedDate(date);
                                setViewMode(viewMode);
                                setShowDatePicker(false);
                              }
                            }}
                            className="rounded-md border shadow-sm"
                            classNames={{
                              today: "bg-violet-600 text-white rounded-full",
                            }}
                            components={{
                              MonthCaption: ({ calendarMonth, ...props }: { calendarMonth: { date: Date } }) => (
                                <div {...props}>
                                  <span 
                                    className="hover:text-violet-600 transition-colors cursor-pointer text-sm font-medium"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSearchTerm("");
                                      setSelectedDate(calendarMonth.date);
                                      setViewMode("month");
                                      setShowDatePicker(false);
                                    }}
                                  >
                                    {calendarMonth.date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                  </span>
                                </div>
                              )
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-400" />
                <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                  <SelectTrigger className="w-[180px] h-10 shadow-sm">
                    <SelectValue placeholder={isLoadingDoctors ? "Loading..." : "Filter by doctor"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Doctors</SelectItem>
                    {doctors.map((doctor) => (
                      <SelectItem key={doctor.id} value={doctor.name}>{doctor.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <ListFilter className="h-4 w-4 text-gray-400" />
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-[180px] h-10 shadow-sm">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {APPOINTMENT_TYPES.map((type, index) => (
                      <SelectItem key={index} value={String(index)}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <ListFilter className="h-4 w-4 text-gray-400" />
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-[180px] h-10 shadow-sm">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    {APPOINTMENT_STATUSES.map((status) => (
                      <SelectItem key={status} value={status} className="capitalize">{status === 'all' ? 'All Statuses' : status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Badge variant="secondary" className="bg-violet-50 text-violet-700 border-violet-100 h-10 px-4 rounded-lg font-semibold flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-violet-600 animate-pulse" />
                {searchTerm !== "" ? "Search Results" : (viewMode === "day" ? "Day View" : viewMode === "week" ? "Week View" : viewMode === "month" ? "Month View" : viewMode === "custom" ? "Custom Range" : "All Appointments")}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-xl border-none overflow-hidden bg-white">
        <CardHeader className="border-b bg-gray-50/50 py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              {viewMode === "day" && <Clock className="h-5 w-5 text-violet-600" />}
              {viewMode === "week" && <CalendarRange className="h-5 w-5 text-violet-600" />}
              {viewMode === "month" && <CalendarIcon className="h-5 w-5 text-violet-600" />}
              {viewMode === "custom" && <Search className="h-5 w-5 text-violet-600" />}
              {searchTerm !== "" ? "Search Results" : (viewMode === "day" ? "Schedule" : "Appointment Overview")}
            </CardTitle>
            <div className="flex items-center gap-4 flex-wrap">
              {Object.entries(appointmentColors).slice(0, 5).map(([type, colors]) => (
                <div key={type} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded-full ${colors.bg.replace('bg-', 'bg-').split(' ')[0]} border ${colors.border}`} />
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">{type}</span>
                </div>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[700px] overflow-y-auto">
            {isLoadingView ? (
              <div className="flex flex-col items-center justify-center py-24 space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
                <p className="text-sm font-medium text-muted-foreground animate-pulse">Loading schedule...</p>
              </div>
            ) : (
              <>
                {searchTerm !== "" ? renderCustomView() : (
                  <>
                    {viewMode === "day" && renderDayView()}
                    {viewMode === "week" && renderWeekView()}
                    {viewMode === "month" && renderMonthView()}
                    {viewMode === "custom" && renderCustomView()}
                    {viewMode === "all" && (
                      <div className="p-4">
                        <AllAppointmentsView appointments={filteredAppointments} isLoading={isLoadingView} />
                      </div>
                    )}
                  </>
                )}
              </>
            )}
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
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="h-8 w-8" />
            </div>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete this appointment? This action cannot be undone.
            </p>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="px-8">
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              className="px-8"
              onClick={() => {
                if (appointmentToDelete) {
                  deleteAppointment(appointmentToDelete);
                  setIsDeleteDialogOpen(false);
                  setAppointmentToDelete(null);
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Missing icon used in the snippet for custom view
function Users({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
