import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useAppointmentModal } from "@/hooks/useAppointmentModal";
import { Calendar as CalendarIcon, Clock, Award, Loader2 } from "lucide-react";
import { formatDateToYYYYMMDD } from "@/lib/utils";
import { formatTimeTo12h } from "@/lib/time-slots";
import { APPOINTMENT_PRICES } from "@/lib/appointment-types";

interface BookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: Date;
  defaultTime?: string;
  doctorName?: string; // doctor's display name
  onBooked?: (apt?: any) => void;
}

export default function BookingModal({ open, onOpenChange, defaultDate, defaultTime, doctorName, onBooked }: BookingModalProps) {
  const { user } = useAuth();
  const { addAppointment } = useAppointmentModal();

  const [patients, setPatients] = useState<any[]>([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [appointmentType, setAppointmentType] = useState<string>("");
  const [duration, setDuration] = useState<string>("30");
  const [discount, setDiscount] = useState<string>("0");
  const [notes, setNotes] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>(defaultDate ?? new Date());
  const [selectedTime, setSelectedTime] = useState<string>(defaultTime ?? "");
  const [isBooking, setIsBooking] = useState(false);

  // Map appointment types to default durations (in minutes)
  const appointmentTypeDurations: Record<string, number> = {
    "Routine Cleaning": 30,
    "Checkup": 30,
    "Filling": 60,
    "Root Canal": 90,
    "Extraction": 45,
    "Whitening": 45,
    "Other": 30,
  };

  // Update duration when appointment type changes
  useEffect(() => {
    const defaultDur = appointmentTypeDurations[appointmentType] || 30;
    setDuration(String(defaultDur));
  }, [appointmentType]);

  useEffect(() => {
    setSelectedDate(defaultDate ?? new Date());
  }, [defaultDate]);

  useEffect(() => {
    setSelectedTime(defaultTime ?? "");
  }, [defaultTime]);

  // Log appointment type changes with price
  useEffect(() => {
    if (appointmentType) {
      const basePrice = APPOINTMENT_PRICES[appointmentType] || 0;
      console.log(`[BookingModal] Appointment Type Changed:`, {
        event: 'appointmentTypeChanged',
        type: appointmentType,
        basePrice,
        duration: duration,
        userRole: user?.role,
        timestamp: new Date().toISOString()
      });
    }
  }, [appointmentType, user?.role, duration]);

  useEffect(() => {
    if (!open) return;
    // fetch patients based on role - rely on server-side filtering for patient role
    const fetchPatients = async () => {
      setIsLoadingPatients(true);
      try {
        const fetchOpts: RequestInit = { credentials: 'include' };
        
        // Always fetch from /api/patients - server will filter based on requester role
        const res = await fetch(`http://localhost:3001/api/patients?limit=1000`, fetchOpts);
        
        if (!res.ok) {
          console.error('BookingModal: fetch failed', { status: res.status, statusText: res.statusText });
          setIsLoadingPatients(false);
          return;
        }
        
        const json = await res.json();
        console.log('BookingModal: fetch response', { success: json?.success, dataCount: json?.data?.length, user: { username: user?.username, role: user?.role } });
        
        if (json?.success && Array.isArray(json.data)) {
          const list = json.data.map((p: any) => ({ id: String(p.id), name: `${p.firstName} ${p.lastName}` }));
          console.log('BookingModal: patients loaded', { count: list.length, patients: list, source: user?.role === 'patient' ? 'server-filtered' : 'admin-fetch' });
          try { window.dispatchEvent(new CustomEvent('bookingmodal:patients', { detail: { source: user?.role === 'patient' ? 'server-filtered' : 'admin-fetch', count: list.length, patients: list } })); } catch (e) {}
          setPatients(list);
          // preselect first patient if available
          if (list.length > 0) {
            setSelectedPatient(list[0].id);
          }
        } else {
          console.warn('BookingModal: empty or failed response', json);
          setPatients([]);
        }
      } catch (err) {
        console.error('Failed to fetch patients for booking modal', err);
        setPatients([]);
      } finally {
        setIsLoadingPatients(false);
      }
    };

    fetchPatients();
  }, [open, user]);

  const handleConfirmBooking = async () => {
    if (!selectedPatient || !appointmentType) return;
    setIsBooking(true);
    try {
      const dateStr = formatDateToYYYYMMDD(selectedDate);
      const newApt = await addAppointment({
        patientId: selectedPatient,
        patientName: patients.find(p => p.id === selectedPatient)?.name || selectedPatient,
        doctor: doctorName || '',
        date: dateStr,
        time: selectedTime,
        type: 0,
        customType: appointmentType,
        duration: Number(duration) || 30,
        price: 0,
        notes,
        status: 'scheduled',
      });

      // emit global update event
      try { window.dispatchEvent(new CustomEvent('appointments:updated', { detail: { appointment: newApt } })); } catch (e) {}

      if (onBooked) onBooked(newApt);
      onOpenChange(false);
    } catch (err) {
      console.error('Booking error:', err);
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <CalendarIcon className="h-6 w-6 text-blue-600" />
            Appointment Details
          </DialogTitle>
          <DialogDescription>Complete the following information to book your appointment</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-gray-700">Who is this appointment for?</Label>
                <Select value={selectedPatient} onValueChange={setSelectedPatient} disabled={isLoadingPatients}>
                  <SelectTrigger className="h-11 rounded-lg border-gray-200">
                    <SelectValue placeholder={isLoadingPatients ? 'Loading...' : 'Select patient'} />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold text-gray-700">Appointment Type</Label>
                <Select value={appointmentType} onValueChange={setAppointmentType}>
                  <SelectTrigger className="h-11 rounded-lg border-gray-200">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Routine Cleaning">Routine Cleaning</SelectItem>
                    <SelectItem value="Checkup">Checkup</SelectItem>
                    <SelectItem value="Filling">Filling</SelectItem>
                    <SelectItem value="Root Canal">Root Canal</SelectItem>
                    <SelectItem value="Extraction">Extraction</SelectItem>
                    <SelectItem value="Whitening">Whitening</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-700">Duration (mins)</Label>
                  <Input type="number" value={duration} onChange={(e: any) => setDuration(e.target.value)} placeholder="30" className="h-11 rounded-lg border-gray-200" disabled={user?.role === 'patient'} />
                  {user?.role === 'patient' && <p className="text-xs text-gray-500">Set based on appointment type</p>}
                </div>
                {user?.role !== 'patient' && (
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-gray-700">Discount</Label>
                    <Input type="number" value={discount} onChange={(e: any) => setDiscount(e.target.value)} placeholder="0" className="h-11 rounded-lg border-gray-200" />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold text-gray-700">Total Price</Label>
                {user?.role === 'patient' ? (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="text-lg font-bold text-blue-700">₱{(APPOINTMENT_PRICES[appointmentType] || 0).toLocaleString()}</div>
                    <p className="text-xs text-gray-500 mt-1">Base price for {appointmentType || 'selected type'}</p>
                  </div>
                ) : (
                  <>
                    <Input
                      type="text"
                      value={`₱${Math.max(0, (APPOINTMENT_PRICES[appointmentType] || 0) - (Number(discount) || 0)).toLocaleString()}`}
                      readOnly
                      className="h-11 rounded-lg border-gray-200 bg-gray-50 font-bold text-blue-700"
                    />
                    <p className="text-[10px] text-gray-400">Base price: ₱{(APPOINTMENT_PRICES[appointmentType] || 0).toLocaleString()}</p>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-bold text-gray-700">Selected Schedule</Label>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 space-y-2">
                <div className="flex items-center gap-2 text-blue-700 text-sm font-medium">
                  <CalendarIcon className="h-4 w-4" />
                  {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
                <div className="flex items-center gap-2 text-blue-700 text-sm font-medium">
                  <Clock className="h-4 w-4" />
                  {selectedTime ? formatTimeTo12h(selectedTime) : '—'}
                </div>
                <div className="flex items-center gap-2 text-blue-700 text-sm font-medium">
                  <Award className="h-4 w-4" />
                  Dr. {doctorName || '—'}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-bold text-gray-700">Notes (Optional)</Label>
            <Textarea placeholder="Any details you'd like to add..." value={notes} onChange={(e: any) => setNotes(e.target.value)} className="resize-none rounded-lg border-gray-200" rows={3} />
          </div>
        </div>

        <DialogFooter className="flex gap-3 pt-6 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isBooking} className="h-11 px-6 rounded-lg">Cancel</Button>
          <Button onClick={handleConfirmBooking} disabled={isBooking || !appointmentType || !selectedPatient} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-11 px-8 rounded-lg shadow-lg shadow-blue-100">
            {isBooking ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Booking'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
