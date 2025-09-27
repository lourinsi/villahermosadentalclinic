import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Scheduling appointment:", formData);
    // Here you would typically make an API call
    onOpenChange(false);
    // Reset form
    setFormData({
      date: "",
      time: "",
      type: "",
      doctor: "",
      notes: "",
      patientName: patientName || "",
      patientId: patientId || ""
    });
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
                value={formData.patientName}
                onValueChange={(value) => setFormData(prev => ({ ...prev, patientName: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="john-smith">John Smith</SelectItem>
                  <SelectItem value="sarah-davis">Sarah Davis</SelectItem>
                  <SelectItem value="mike-johnson">Mike Johnson</SelectItem>
                  <SelectItem value="emily-brown">Emily Brown</SelectItem>
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
            <Button variant="cancel" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button variant="brand" type="submit">
              Schedule Appointment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}