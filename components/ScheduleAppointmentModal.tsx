import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useAppointmentModal } from "./AdminLayout";
import { toast } from "sonner";

interface ScheduleAppointmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientName?: string;
  patientId?: number;
}

export function ScheduleAppointmentModal({ 
  open, 
  onOpenChange, 
  patientName,
  patientId 
}: ScheduleAppointmentModalProps) {
  const [formData, setFormData] = useState({
    date: "",
    time: "",
    type: "",
    doctor: "",
    notes: "",
    patientName: patientName || "",
    patientId: patientId || ""
  });

  const { addAppointment } = useAppointmentModal();
  const [patients, setPatients] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await fetch("http://localhost:3001/api/patients");
        const json = await res.json();
        if (json?.success && Array.isArray(json.data)) {
          const list = json.data.map((p: any) => ({ id: String(p.id), name: `${p.firstName} ${p.lastName}` }));
          setPatients(list);
        }
      } catch (err) {
        console.error("Failed to load patients:", err);
      }
    };

    fetchPatients();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("=== SCHEDULE APPOINTMENT SUBMIT ===");

    if (!formData.patientName || !formData.date || !formData.time || !formData.type || !formData.doctor) {
      toast.error("Please complete all required fields");
      return;
    }

    setIsLoading(true);

    try {
      console.log("Creating appointment:", formData);
      addAppointment({
        patientName: String(formData.patientName),
        patientId: String(formData.patientId),
        date: formData.date,
        time: formData.time,
        type: formData.type,
        doctor: formData.doctor,
        notes: formData.notes,
        status: "scheduled"
      });

      console.log("Appointment scheduled successfully");
      toast.success("Appointment scheduled");
      onOpenChange(false);
      setFormData({
        date: "",
        time: "",
        type: "",
        doctor: "",
        notes: "",
        patientName: patientName || "",
        patientId: patientId || ""
      });
    } catch (err) {
      console.error("Error scheduling appointment:", err);
      toast.error("Failed to schedule appointment");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {patientName ? `Schedule Appointment - ${patientName}` : "Schedule New Appointment"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Patient Selection (only show if no patient is pre-selected) */}
          {!patientName && (
            <div className="space-y-2">
              <Label>Patient</Label>
              <Select
                value={String(formData.patientId) || ""}
                onValueChange={(value) => {
                  const found = patients.find(p => p.id === value);
                  if (found) {
                    setFormData(prev => ({ ...prev, patientId: found.id, patientName: found.name }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.length > 0 ? (
                    patients.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-gray-500">No patients available</div>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Time</Label>
              <Select
                value={formData.time}
                onValueChange={(value) => setFormData(prev => ({ ...prev, time: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="09:00">9:00 AM</SelectItem>
                  <SelectItem value="10:00">10:00 AM</SelectItem>
                  <SelectItem value="11:00">11:00 AM</SelectItem>
                  <SelectItem value="14:00">2:00 PM</SelectItem>
                  <SelectItem value="15:00">3:00 PM</SelectItem>
                  <SelectItem value="16:00">4:00 PM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Appointment Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cleaning">Routine Cleaning</SelectItem>
                <SelectItem value="checkup">Checkup</SelectItem>
                <SelectItem value="filling">Filling</SelectItem>
                <SelectItem value="crown">Crown</SelectItem>
                <SelectItem value="consultation">Consultation</SelectItem>
                <SelectItem value="emergency">Emergency</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Doctor</Label>
            <Select
              value={formData.doctor}
              onValueChange={(value) => setFormData(prev => ({ ...prev, doctor: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select doctor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dr-johnson">Dr. Sarah Johnson</SelectItem>
                <SelectItem value="dr-chen">Dr. Michael Chen</SelectItem>
                <SelectItem value="dr-rodriguez">Dr. Emily Rodriguez</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="Additional notes for the appointment..."
              value={formData.notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="cancel" type="button" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button variant="brand" type="submit" disabled={isLoading}>
              {isLoading ? "Scheduling..." : "Schedule Appointment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}