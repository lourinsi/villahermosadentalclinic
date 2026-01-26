"use client";

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Loader2, Calendar as CalendarIcon, Clock } from "lucide-react";
import { TIME_SLOTS, formatTimeTo12h } from "@/lib/time-slots";
import { formatDateToYYYYMMDD } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useAppointmentModal } from "@/hooks/useAppointmentModal";

interface DoctorAvailabilityDialogProps {
  doctorName: string;
}

export function DoctorAvailabilityDialog({ doctorName }: DoctorAvailabilityDialogProps) {
  const { openPatientBookingModal } = useAppointmentModal();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen && selectedDate) {
      const fetchAppointments = async () => {
        try {
          setIsLoading(true);
          const dateStr = formatDateToYYYYMMDD(selectedDate);
          const response = await fetch(`http://localhost:3001/api/appointments?doctor=${encodeURIComponent(doctorName)}&startDate=${dateStr}&endDate=${dateStr}`);
          const result = await response.json();
          if (result.success) {
            setAppointments(result.data);
          }
        } catch (error) {
          console.error("Failed to fetch doctor appointments", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchAppointments();
    }
  }, [isOpen, selectedDate, doctorName]);

  const availableSlots = useMemo(() => {
    const bookedTimes = appointments.map(apt => apt.time);
    const now = new Date();
    const isToday = selectedDate && formatDateToYYYYMMDD(selectedDate) === formatDateToYYYYMMDD(now);
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    return TIME_SLOTS.filter(slot => {
      const isBooked = bookedTimes.includes(slot);
      const [hour, minute] = slot.split(':').map(Number);
      const isPastTime = isToday && (hour < currentHour || (hour === currentHour && minute <= currentMinute));
      return !isBooked && !isPastTime;
    });
  }, [appointments, selectedDate]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full gap-2">
          <Clock className="h-4 w-4" />
          View Availability
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl p-6">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-2xl font-bold">Availability for {doctorName}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-5">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-xl border shadow-md w-full"
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
            />
          </div>
          <div className="md:col-span-7 flex flex-col">
            <h3 className="font-bold text-xl flex items-center gap-2 mb-6 text-gray-800">
              <CalendarIcon className="h-5 w-5 text-blue-600" />
              {selectedDate ? selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Select a date'}
            </h3>
            
            <div className="flex-1">
              {isLoading ? (
                <div className="flex justify-center items-center h-48">
                  <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                </div>
              ) : availableSlots.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {availableSlots.map(slot => (
                    <Button
                      key={slot}
                      variant="outline"
                      className="h-11 border-gray-200 hover:border-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-all font-medium rounded-lg shadow-sm"
                      onClick={() => {
                        setIsOpen(false);
                        openPatientBookingModal(selectedDate, slot, doctorName);
                      }}
                    >
                      {formatTimeTo12h(slot)}
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-gray-500 bg-gray-50 rounded-xl border-2 border-dashed">
                  <Clock className="h-10 w-10 mb-2 opacity-20" />
                  <p className="font-medium">No available slots for this date.</p>
                </div>
              )}
            </div>

            <div className="mt-8 pt-6 border-t">
              <Button 
                className="w-full h-12 text-lg font-semibold bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all rounded-xl"
                onClick={() => {
                  setIsOpen(false);
                  openPatientBookingModal(selectedDate, undefined, doctorName);
                }}
              >
                Book Full Appointment
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
