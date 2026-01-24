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
    return TIME_SLOTS.filter(slot => !bookedTimes.includes(slot.value));
  }, [appointments]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full gap-2">
          <Clock className="h-4 w-4" />
          View Availability
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Availability for {doctorName}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <div>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border shadow"
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
            />
          </div>
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-primary" />
              {selectedDate ? selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Select a date'}
            </h3>
            
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : availableSlots.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {availableSlots.map(slot => (
                  <Button
                    key={slot.value}
                    variant="ghost"
                    size="sm"
                    className="border hover:bg-primary hover:text-white"
                    onClick={() => {
                      setIsOpen(false);
                      openPatientBookingModal(selectedDate, slot.value, doctorName);
                    }}
                  >
                    {formatTimeTo12h(slot.value)}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground py-8 text-center">No available slots for this date.</p>
            )}

            <div className="pt-4">
              <Button 
                className="w-full"
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
