"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { DateRange } from "react-day-picker";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import CalendarPopover from "./CalendarPopover";
import { Calendar as CalendarIcon, CalendarRange, ChevronLeft, ChevronRight, Search, Plus, Users, ListFilter } from "lucide-react";
import { useAppointmentModal } from "@/hooks/useAppointmentModal";
import { AllAppointmentsView } from "./AllAppointmentsView";
import { formatDateToYYYYMMDD, parseBackendDateToLocal } from "../lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { APPOINTMENT_TYPES } from "../lib/appointment-types";
import { useDoctors } from "../hooks/useDoctors";
import { Badge } from "./ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";

type ViewMode = "month" | "week" | "day" | "custom" | "all";

const APPOINTMENT_STATUSES = ["all", "scheduled", "confirmed", "To Pay", "tentative", "pending", "completed", "cancelled"];

export default function AdminCalendarView() {
  const [viewMode, setViewMode] = useState<ViewMode>("custom");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [isLoadingView, setIsLoadingView] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const { appointments, refreshAppointments } = useAppointmentModal();
  const { doctors, isLoadingDoctors } = useDoctors();

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

  const filters = useMemo(() => {
    const { start, end } = getViewRange(selectedDate);
    let fetchStartStr: string | undefined;
    let fetchEndStr: string | undefined;

    if (viewMode === 'custom') {
      if (dateRange?.from && dateRange?.to) {
        fetchStartStr = formatDateToYYYYMMDD(dateRange.from);
        fetchEndStr = formatDateToYYYYMMDD(dateRange.to);
      } else {
        // In custom mode without range, don't fetch by date
        fetchStartStr = undefined;
        fetchEndStr = undefined;
      }
    } else if (viewMode !== 'all') {
      const monthStart = new Date(start.getFullYear(), start.getMonth(), 1);
      const monthEnd = new Date(end.getFullYear(), end.getMonth() + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);
      fetchStartStr = formatDateToYYYYMMDD(monthStart);
      fetchEndStr = formatDateToYYYYMMDD(monthEnd);
    }

    return { 
      startDate: fetchStartStr, 
      endDate: fetchEndStr,
      doctor: selectedDoctor,
      type: selectedType,
      status: selectedStatus,
      search: searchTerm
    };
  }, [getViewRange, selectedDate, viewMode, dateRange, selectedDoctor, selectedType, selectedStatus, searchTerm]);

  useEffect(() => {
    // If we're in the custom view but the user hasn't selected both a start and end date,
    // don't fetch yet to avoid fetching month of selectedDate.
    if (viewMode === 'custom' && !(dateRange?.from && dateRange?.to)) {
      return;
    }

    refreshAppointments(filters);
    setIsLoadingView(true);
    const t = setTimeout(() => setIsLoadingView(false), 400);
    return () => clearTimeout(t);
  }, [filters, refreshAppointments, viewMode, dateRange?.from, dateRange?.to]);

  const navigateDate = useCallback((direction: 'prev' | 'next') => {
    if (viewMode === 'all') return;
    
    if (viewMode === 'custom' && dateRange?.from && dateRange?.to) {
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

    const newDate = new Date(selectedDate);
    if (viewMode === 'day') {
      newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'week') {
      newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 7 : -7));
    } else if (viewMode === 'month') {
      newDate.setMonth(selectedDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setSelectedDate(newDate);
  }, [viewMode, selectedDate, dateRange]);

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
    if (viewMode === "custom" && dateRange?.from && dateRange?.to) return `${dateRange.from.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${dateRange.to.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    return "Select Range";
  };

  const renderCustomAdminView = () => {
    const list = [...appointments].filter((a) => {
      if (!dateRange?.from || !dateRange?.to) return false;
      const d = parseBackendDateToLocal(a.date);
      // Strip time for pure date comparison
      const checkDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const fromDate = new Date(dateRange.from.getFullYear(), dateRange.from.getMonth(), dateRange.from.getDate());
      const toDate = new Date(dateRange.to.getFullYear(), dateRange.to.getMonth(), dateRange.to.getDate());
      return checkDate >= fromDate && checkDate <= toDate;
    }).sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    });

    const days = dateRange && dateRange.from && dateRange.to ? Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1 : undefined;

    return (
      <div className="bg-white">
        <div className="p-6 border-b bg-gray-50/30">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-black text-gray-900">{days ? `${days} days range` : 'Custom range'}</h2>
              <p className="text-sm text-gray-500 font-medium">
                {dateRange && dateRange.from && dateRange.to 
                  ? `${dateRange.from.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} - ${dateRange.to.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` 
                  : 'Select a start and end date using the calendar picker'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-3 border rounded-xl bg-white shadow-sm min-w-[140px]">
                <div className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Start date</div>
                <div className="font-bold text-gray-700">{dateRange?.from ? dateRange.from.toLocaleDateString() : '—'}</div>
              </div>
              <div className="p-3 border rounded-xl bg-white shadow-sm min-w-[140px]">
                <div className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">End date</div>
                <div className="font-bold text-gray-700">{dateRange?.to ? dateRange.to.toLocaleDateString() : '—'}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              {isLoadingView ? (
                <div className="text-center p-20 bg-gray-50 rounded-2xl border-2 border-dashed">
                  <div className="animate-spin h-10 w-10 border-4 border-violet-600 border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">Fetching appointments...</p>
                </div>
              ) : list.length === 0 ? (
                <div className="text-center p-20 bg-gray-50 rounded-2xl border-2 border-dashed">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 font-medium text-lg">No appointments in this range</p>
                  <p className="text-gray-400 text-sm mt-1">Try adjusting your filters or date range</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {list.map((apt) => {
                    const patientAvatarSrc = apt.patientProfile || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(String(apt.patientName || apt.patientId || 'patient'))}`;
                    return (
                    <div 
                      key={apt.id} 
                      className="p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer group"
                      onClick={() => { /* Open edit modal if needed */ }}
                    > 
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10 border border-gray-100">
                            <AvatarImage src={patientAvatarSrc} alt={apt.patientName} />
                            <AvatarFallback>{String((apt.patientName || String(apt.patientId || '')).substring(0,2)).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-black text-gray-900 group-hover:text-violet-600 transition-colors">{apt.patientName}</div>
                            <div className="text-xs text-gray-500 font-medium flex items-center gap-1 mt-1">
                              <CalendarIcon className="h-3 w-3" />
                              {parseBackendDateToLocal(apt.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • {apt.time}
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-100 text-[10px] px-2 py-0">
                          {apt.status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                        <div className="text-xs font-bold text-gray-600 flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          Dr. {apt.doctor}
                        </div>
                        {apt.price != null && (
                          <div className="text-sm font-black text-violet-600">${apt.price.toFixed(2)}</div>
                        )}
                      </div>
                    </div>
                  )})}
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-white rounded-2xl border shadow-sm">
                <div className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                  <CalendarRange className="h-4 w-4" />
                  Quick Range selection
                </div>
                <div className="space-y-4">
                  <Calendar 
                    mode="range" 
                    selected={dateRange} 
                    onSelect={(r) => setDateRange(r as DateRange | undefined)} 
                    className="rounded-xl border shadow-sm bg-white" 
                    numberOfMonths={1}
                  />
                  <div className="flex items-center gap-2 pt-2">
                    <Button variant="ghost" onClick={() => setDateRange(undefined)} className="flex-1 font-bold text-gray-500">Clear</Button>
                    <Button onClick={() => setShowDatePicker(true)} className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95">
                      Open Picker
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Appointment Calendar (Admin)</h1>
          <p className="text-sm text-muted-foreground">Manage clinic schedules and patient bookings</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Search appointments..." value={searchTerm} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)} className="pl-9 w-64 h-10 shadow-sm" />
          </div>
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
          <Button variant="brand" className="h-10 px-4 flex items-center gap-2 font-bold shadow-md transition-all active:scale-95">
            <Plus className="h-4 w-4" />
            <span>New Appointment</span>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex items-center bg-gray-50 rounded-lg p-1 border ${viewMode === 'all' ? 'opacity-50 pointer-events-none' : ''}`}>
                <Button variant="ghost" size="sm" onClick={() => navigateDate('prev')} className="h-8 w-8 p-0" disabled={viewMode === 'all'}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => navigateDate('next')} className="h-8 w-8 p-0" disabled={viewMode === 'all'}><ChevronRight className="h-4 w-4" /></Button>
              </div>

              <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-10 gap-2 font-semibold shadow-sm px-4">
                    <CalendarRange className="h-4 w-4 text-violet-600" />
                    <span>{formatDateLabel(selectedDate)}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 shadow-2xl border-none rounded-2xl" align="start">
                  <CalendarPopover 
                    viewMode={viewMode} 
                    setViewMode={(mode: any) => {
                      setSearchTerm("");
                      setViewMode(mode);
                    }} 
                    selectedDate={selectedDate} 
                    setSelectedDate={(date) => {
                      setSearchTerm("");
                      setSelectedDate(date);
                    }} 
                    dateRange={dateRange} 
                    setDateRange={(range) => {
                      setSearchTerm("");
                      setDateRange(range);
                    }} 
                    includeCart={false} 
                    onClose={() => setShowDatePicker(false)} 
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 mr-2">
                {(["day", "week", "month", "custom", "all"] as const).map((mode) => (
                  <Button key={mode} variant={viewMode === mode ? "brand" : "ghost"} size="sm" className="h-9 px-3 capitalize font-medium text-xs" onClick={() => setViewMode(mode)}>{mode}</Button>
                ))}
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
            <CardTitle className="text-lg font-bold flex items-center gap-2">{viewMode === "custom" ? 'Custom Range' : (viewMode === 'month' ? 'Month View' : 'Appointment Overview')}</CardTitle>
            <div />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[700px] overflow-y-auto">
            {isLoadingView ? (<div className="p-12 text-center">Loading...</div>) : (
              <>{viewMode === 'custom' ? renderCustomAdminView() : (<div className="p-4"><AllAppointmentsView appointments={appointments} isLoading={isLoadingView} /></div>)}</>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
