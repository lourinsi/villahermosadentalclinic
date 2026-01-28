"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDoctors } from "@/hooks/useDoctors";
import { useAppointmentModal } from "@/hooks/useAppointmentModal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DoctorCalendar } from "@/components/DoctorCalendar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Loader2, 
  Calendar as CalendarIcon, 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  Award, 
  Mail
} from "lucide-react";
import { TIME_SLOTS, formatTimeTo12h } from "@/lib/time-slots";
import { formatDateToYYYYMMDD } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Appointment } from "@/hooks/useAppointments";

type ViewMode = "day" | "week" | "month";

export default function DoctorAvailabilityPage() {
  const params = useParams();
  const router = useRouter();
  const doctorName = decodeURIComponent(params.name as string);
  
  const { doctors, isLoadingDoctors } = useDoctors();
  const { openPatientBookingModal } = useAppointmentModal();
  
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);

  const doctor = useMemo(() => {
    return doctors.find(d => d.name === doctorName);
  }, [doctors, doctorName]);

  const dateRange = useMemo(() => {
    const start = new Date(selectedDate);
    const end = new Date(selectedDate);

    if (viewMode === "day") {
      return { start: formatDateToYYYYMMDD(start), end: formatDateToYYYYMMDD(end) };
    } else if (viewMode === "week") {
      const day = start.getDay();
      start.setDate(start.getDate() - day);
      end.setDate(end.getDate() + (6 - day));
      return { start: formatDateToYYYYMMDD(start), end: formatDateToYYYYMMDD(end) };
    } else {
      start.setDate(1);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
      return { start: formatDateToYYYYMMDD(start), end: formatDateToYYYYMMDD(end) };
    }
  }, [selectedDate, viewMode]);

  useEffect(() => {
    if (doctorName) {
      const fetchAppointments = async () => {
        try {
          setIsLoadingAvailability(true);
          const response = await fetch(`http://localhost:3001/api/appointments?doctor=${encodeURIComponent(doctorName)}&startDate=${dateRange.start}&endDate=${dateRange.end}`);
          const result = await response.json();
          if (result.success) {
            setAppointments(result.data);
          }
        } catch (error) {
          console.error("Failed to fetch doctor appointments", error);
        } finally {
          setIsLoadingAvailability(false);
        }
      };
      fetchAppointments();
    }
  }, [dateRange, doctorName]);

  const getDaySlots = useCallback((date: Date) => {
    const dateStr = formatDateToYYYYMMDD(date);
    const dayAppointments = appointments.filter(apt => 
      apt.date === dateStr && 
      apt.status !== 'cancelled' && 
      apt.paymentStatus !== 'unpaid'
    );
    const bookedTimes = dayAppointments.map(apt => apt.time);
    
    const now = new Date();
    const todayStr = formatDateToYYYYMMDD(now);
    const isToday = dateStr === todayStr;
    const isPastDate = !isToday && date < new Date(now.setHours(0, 0, 0, 0));
    
    const currentHour = new Date().getHours();
    const currentMinute = new Date().getMinutes();
    
    return TIME_SLOTS.map(slot => {
      const [hour, minute] = slot.split(':').map(Number);
      const isPastTime = isToday && (hour < currentHour || (hour === currentHour && minute <= currentMinute));
      const isBooked = bookedTimes.includes(slot);
      const isPast = isPastTime || isPastDate;
      
      return {
        time: slot,
        isAvailable: !isBooked && !isPast,
        isBooked,
        isPast
      };
    });
  }, [appointments]);

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'day') {
      newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'week') {
      newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setMonth(selectedDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setSelectedDate(newDate);
  };

  const renderDayView = () => {
    const slots = getDaySlots(selectedDate);
    const isPastDate = selectedDate < new Date(new Date().setHours(0, 0, 0, 0));
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 bg-white rounded-xl overflow-hidden shadow-sm">
        <div className="p-6 border-r border-gray-50">
          <DoctorCalendar
            selectedDate={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
          />
        </div>
        
        <div className="p-6 flex flex-col bg-gray-50/30 relative">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto max-h-[450px] pr-2 custom-scrollbar">
            {isPastDate ? (
              <div className="h-full flex flex-col items-center justify-center py-20 text-center opacity-40">
                <CalendarIcon className="h-12 w-12 text-gray-300 mb-4" />
                <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Past Date</p>
                <p className="text-xs text-gray-400 mt-1">Schedule is not available for past dates</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {slots.map((slot) => (
                  <div 
                    key={slot.time}
                    className={`
                      group flex items-center justify-between p-3 rounded-xl border transition-all duration-200
                      ${slot.isAvailable 
                        ? "bg-white border-gray-100 hover:border-green-400 hover:shadow-md cursor-pointer" 
                        : "bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed"}
                    `}
                    onClick={() => {
                      if (slot.isAvailable) {
                        openPatientBookingModal(selectedDate, slot.time, doctorName);
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <p className={`font-bold text-sm ${slot.isAvailable ? "text-gray-900" : "text-gray-400"}`}>
                          {formatTimeTo12h(slot.time)}
                        </p>
                      </div>
                    </div>
                    
                    <Badge 
                      className={`
                        font-bold px-2.5 py-0.5 text-[10px] uppercase
                        ${slot.isAvailable 
                          ? "bg-green-600 text-white border-green-700" 
                          : slot.isBooked 
                            ? "bg-orange-500 text-white border-orange-600"
                            : "bg-gray-400 text-white border-gray-500"}
                      `}
                    >
                      {slot.isAvailable ? "Open" : (slot.isBooked ? "Booked" : "Passed")}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = new Date(selectedDate);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      return day;
    });

    return (
      <div className="grid grid-cols-7 gap-2 min-h-[500px]">
        {weekDays.map((day) => {
          const isPast = day < new Date(new Date().setHours(0,0,0,0));
          const slots = getDaySlots(day);
          const displaySlots = slots.filter(s => s.isAvailable || s.isBooked);

          return (
            <div key={day.toISOString()} className={`flex flex-col bg-white rounded-xl border ${day.toDateString() === new Date().toDateString() ? 'border-blue-200 ring-1 ring-blue-100' : 'border-gray-100'} overflow-hidden`}>
              <div className={`p-3 text-center border-b ${day.toDateString() === new Date().toDateString() ? 'bg-blue-50' : 'bg-gray-50'}`}>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">{day.toLocaleDateString('en-US', { weekday: 'short' })}</p>
                <p className={`text-lg font-black ${day.toDateString() === new Date().toDateString() ? 'text-blue-600' : 'text-gray-900'}`}>{day.getDate()}</p>
              </div>
              <div className="p-1 space-y-1 flex-1 overflow-y-auto max-h-[600px] custom-scrollbar bg-gray-50/20">
                {isPast ? (
                   <div className="h-full flex items-center justify-center opacity-20 grayscale py-8">
                     <p className="text-[10px] font-bold uppercase rotate-90 text-gray-400">Past</p>
                   </div>
                ) : displaySlots.length > 0 ? (
                  displaySlots.map(slot => (
                    <button
                      key={slot.time}
                      disabled={!slot.isAvailable}
                      onClick={() => slot.isAvailable && openPatientBookingModal(day, slot.time, doctorName)}
                      className={`w-full group ${!slot.isAvailable ? 'cursor-not-allowed opacity-70' : ''}`}
                    >
                      <div className={`
                        flex flex-col items-center justify-center p-1 rounded-md border text-center transition-all ${slot.isAvailable ? 'hover:scale-[1.02]' : ''}
                        ${slot.isAvailable ? 'bg-green-600 border-green-700' : 'bg-orange-500 border-orange-600'}
                      `}>
                        <span className="text-[8px] font-bold text-white/90 leading-none">{formatTimeTo12h(slot.time)}</span>
                        <p className="text-[8px] font-black text-white uppercase mt-0.5 leading-none">
                          {slot.isAvailable ? 'OPEN' : 'BOOKED'}
                        </p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="h-full flex items-center justify-center py-8">
                    <p className="text-[10px] font-bold text-gray-300 uppercase rotate-90">Fully Booked</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMonthView = () => {
    const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
    const startDate = new Date(monthStart);
    startDate.setDate(monthStart.getDate() - monthStart.getDay());
    const endDate = new Date(monthEnd);
    endDate.setDate(monthEnd.getDate() + (6 - monthEnd.getDay()));

    const calendarDays = [];
    const curr = new Date(startDate);
    while (curr <= endDate) {
      calendarDays.push(new Date(curr));
      curr.setDate(curr.getDate() + 1);
    }

    return (
      <div className="grid grid-cols-7 border-t border-l border-gray-100 rounded-xl overflow-hidden shadow-sm">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="bg-gray-50 p-2 text-center text-[10px] font-bold text-gray-400 uppercase border-r border-b border-gray-100">
            {d}
          </div>
        ))}
        {calendarDays.map((day) => {
          const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
          const isToday = day.toDateString() === new Date().toDateString();
          const isPast = day < new Date(new Date().setHours(0,0,0,0));
          const slots = getDaySlots(day);
          const displaySlots = slots.filter(s => s.isAvailable || s.isBooked);

          return (
            <div 
              key={day.toISOString()} 
              className={`
                min-h-[120px] p-1 border-r border-b border-gray-100 relative
                ${!isCurrentMonth ? 'bg-gray-50/50' : 'bg-white'}
                ${isToday ? 'ring-1 ring-blue-400 ring-inset bg-blue-50/10' : ''}
              `}
            >
              <div className="flex justify-between items-start mb-1 px-1">
                <span className={`text-xs font-bold ${!isCurrentMonth ? 'text-gray-300' : isToday ? 'text-blue-600' : 'text-gray-400'}`}>
                  {day.getDate()}
                </span>
              </div>
              
              <div className="space-y-0.5 max-h-[90px] overflow-y-auto custom-scrollbar-thin">
                {!isPast && displaySlots.slice(0, 5).map(slot => (
                  <button
                    key={slot.time}
                    disabled={!slot.isAvailable}
                    onClick={() => slot.isAvailable && openPatientBookingModal(day, slot.time, doctorName)}
                    className={`w-full text-left ${!slot.isAvailable ? 'cursor-not-allowed opacity-70' : ''}`}
                  >
                    <div className={`
                      px-1 py-0.5 rounded text-[7px] font-black text-white flex items-center justify-between transition-transform ${slot.isAvailable ? 'hover:scale-[1.03]' : ''}
                      ${slot.isAvailable ? 'bg-green-600' : 'bg-orange-500'}
                    `}>
                      <span className="leading-tight">{formatTimeTo12h(slot.time)}</span>
                      <span className="leading-tight">{slot.isAvailable ? 'OPEN' : 'BOOKED'}</span>
                    </div>
                  </button>
                ))}
                {!isPast && displaySlots.length > 5 && (
                  <button 
                    onClick={() => {
                      setSelectedDate(day);
                      setViewMode("day");
                    }}
                    className="w-full text-center text-[8px] font-bold text-blue-600 hover:underline py-1"
                  >
                    + {displaySlots.length - 5} more
                  </button>
                )}
                {isPast && isCurrentMonth && (
                   <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <div className="w-[120%] h-[1px] bg-gray-100 -rotate-45" />
                   </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (isLoadingDoctors) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!doctor && !isLoadingDoctors) {
    return (
      <div className="p-8 text-center bg-gray-50 min-h-screen flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold text-gray-900">Doctor not found</h2>
        <Button onClick={() => router.push('/patient/doctors')} className="mt-4 bg-blue-600">
          Back to Doctors
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20">
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => router.push('/patient/doctors')}
              className="rounded-xl border-gray-200 shadow-sm bg-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-black text-gray-900 leading-none">Book with Dr. {doctorName}</h1>
              <p className="text-sm text-gray-500 mt-1 font-medium">{doctor?.specialization} Specialist</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex bg-gray-100/80 rounded-xl p-1">
              {(['day', 'week', 'month'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`
                    px-5 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all
                    ${viewMode === mode 
                      ? "bg-white text-blue-600 shadow-sm scale-[1.02]" 
                      : "text-gray-500 hover:text-gray-700"}
                  `}
                >
                  {mode}
                </button>
              ))}
            </div>
            
            <div className="h-8 w-[1px] bg-gray-200 mx-1" />
            
            <div className="flex items-center gap-1">
               <Button variant="ghost" size="icon" onClick={() => navigateDate('prev')} className="h-9 w-9 rounded-xl hover:bg-gray-100">
                 <ChevronLeft className="h-4 w-4" />
               </Button>
               <Button 
                  variant="ghost" 
                  className="px-3 h-9 text-xs font-black uppercase tracking-tighter hover:bg-gray-100"
                  onClick={() => setSelectedDate(new Date())}
                >
                 Today
               </Button>
               <Button variant="ghost" size="icon" onClick={() => navigateDate('next')} className="h-9 w-9 rounded-xl hover:bg-gray-100">
                 <ChevronRight className="h-4 w-4" />
               </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Doctor Card */}
          <div className="lg:col-span-3">
             <Card className="border-none shadow-2xl shadow-blue-900/5 overflow-hidden rounded-[2rem] bg-white sticky top-8">
                <div className="relative">
                  <div className="aspect-[4/5] overflow-hidden">
                    <Avatar className="h-full w-full rounded-none">
                      <AvatarImage src={doctor?.profilePicture} alt={doctorName} className="object-cover" />
                      <AvatarFallback className="text-5xl bg-blue-600 text-white font-black">
                        {doctorName.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-6 left-6 right-6 text-white">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70 mb-1">Lead Specialist</p>
                    <h2 className="text-2xl font-black leading-tight">Dr. {doctorName}</h2>
                  </div>
                </div>
                <CardContent className="p-6 space-y-6">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Patients</p>
                      <p className="text-lg font-black text-gray-900">1.2k+</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Rating</p>
                      <p className="text-lg font-black text-gray-900">4.9</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                       <div className="h-10 w-10 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
                          <Award className="h-5 w-5 text-blue-600" />
                       </div>
                       <div>
                          <p className="text-xs font-black text-gray-900 uppercase">Specialization</p>
                          <p className="text-xs text-gray-500 font-medium">{doctor?.specialization}</p>
                       </div>
                    </div>
                    {doctor?.email && (
                      <div className="flex items-start gap-4">
                         <div className="h-10 w-10 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0">
                            <Mail className="h-5 w-5 text-indigo-600" />
                         </div>
                         <div>
                            <p className="text-xs font-black text-gray-900 uppercase">Contact</p>
                            <p className="text-xs text-gray-500 font-medium truncate w-[140px]">{doctor.email}</p>
                         </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-6 border-t border-gray-100">
                    <p className="text-xs text-gray-400 leading-relaxed font-medium italic">
                       &quot;{doctor?.bio || "Providing personalized dental care with excellence and compassion."}&quot;
                    </p>
                  </div>
                </CardContent>
             </Card>
          </div>

          {/* Main View Area */}
          <div className="lg:col-span-9 space-y-6">
             <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                  {viewMode === 'day' ? selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 
                   viewMode === 'week' ? `Week of ${selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}` :
                   selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h2>
             </div>

             {isLoadingAvailability ? (
               <div className="min-h-[500px] flex flex-col items-center justify-center bg-white rounded-[2.5rem] shadow-xl shadow-blue-900/5">
                 <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
                 <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Updating Schedules...</p>
               </div>
             ) : (
               <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                 {viewMode === 'day' && renderDayView()}
                 {viewMode === 'week' && renderWeekView()}
                 {viewMode === 'month' && renderMonthView()}
               </div>
             )}

             {/* Legend */}
             <div className="flex items-center gap-6 mt-8 px-6 py-4 bg-white rounded-3xl shadow-sm border border-gray-100 w-fit">
                <div className="flex items-center gap-2">
                   <div className="h-3 w-3 rounded-full bg-green-600" />
                   <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Open Slot</span>
                </div>
                <div className="flex items-center gap-2">
                   <div className="h-3 w-3 rounded-full bg-orange-500" />
                   <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Booked Slot</span>
                </div>
                <div className="flex items-center gap-2">
                   <div className="h-3 w-3 rounded-full bg-gray-400" />
                   <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Passed Slot</span>
                </div>
             </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar-thin::-webkit-scrollbar {
          width: 2px;
        }
        .custom-scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar-thin::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
