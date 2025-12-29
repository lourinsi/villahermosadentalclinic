import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Clock, User, Stethoscope } from "lucide-react";
import { useAppointmentModal } from "./AdminLayout";
import { toast } from "sonner";
import { Appointment } from "../hooks/useAppointments";
import { useDoctors } from "../hooks/useDoctors";

interface EditAppointmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: Appointment | null;
}

export function EditAppointmentModal({ open, onOpenChange, appointment }: EditAppointmentModalProps) {
  const { updateAppointment, deleteAppointment } = useAppointmentModal();
  const [form, setForm] = useState<Partial<Appointment>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { doctors, isLoadingDoctors, reloadDoctors } = useDoctors();

  useEffect(() => {
    if (appointment) {
      setForm({ ...appointment });
    }
  }, [appointment]);

  useEffect(() => {
    if (open) {
      reloadDoctors();
    }
  }, [open, reloadDoctors]);

  if (!appointment) return null;

  const handleSave = async () => {
    if (!form.patientName || !form.date || !form.time || !form.type || !form.doctor || !appointment.id) {
      toast.error("Please fill required fields");
      return;
    }

    setIsLoading(true);
    try {
      console.log("=== UPDATING APPOINTMENT ===", appointment.id);
      updateAppointment(appointment.id, form as Partial<Appointment>);
      toast.success("Appointment updated");
      onOpenChange(false);
    } catch (err) {
      console.error("Error updating appointment:", err);
      toast.error("Failed to update appointment");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!appointment.id) return;
    setIsLoading(true);
    try {
      console.log("=== DELETING APPOINTMENT ===", appointment.id);
      deleteAppointment(appointment.id);
      toast.success("Appointment deleted");
      setIsDeleteDialogOpen(false);
      onOpenChange(false);
    } catch (err) {
      console.error("Error deleting appointment:", err);
      toast.error("Failed to delete appointment");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Appointment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Patient</Label>
            <Input 
              value={form.patientName || ''} 
              readOnly 
              className="bg-muted"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={form.date || ''} onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Time</Label>
              <Input value={form.time || ''} onChange={(e) => setForm(prev => ({ ...prev, time: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={String(form.type || '')} onValueChange={(v) => setForm(prev => ({ ...prev, type: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cleaning">Routine Cleaning</SelectItem>
                  <SelectItem value="checkup">Checkup</SelectItem>
                  <SelectItem value="filling">Filling</SelectItem>
                  <SelectItem value="crown">Crown</SelectItem>
                  <SelectItem value="root-canal">Root Canal</SelectItem>
                  <SelectItem value="extraction">Extraction</SelectItem>
                  <SelectItem value="consultation">Consultation</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="whitening">Teeth Whitening</SelectItem>
                  <SelectItem value="implant">Implant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Doctor</Label>
              <Select
                value={String(form.doctor || '')}
                onValueChange={(v) => setForm(prev => ({ ...prev, doctor: v }))}
                disabled={isLoadingDoctors}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingDoctors ? "Loading doctors..." : doctors.length === 0 ? "No doctors available" : "Doctor"} />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingDoctors ? (
                    <div className="p-2 text-sm text-gray-500">Loading doctors...</div>
                  ) : doctors.length > 0 ? (
                    doctors.map((doctor) => (
                      <SelectItem key={doctor.id} value={doctor.name}>
                        {doctor.name}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-gray-500">No doctors available</div>
                  )}
                  {!isLoadingDoctors && form.doctor && !doctors.some((doctor) => doctor.name === form.doctor) ? (
                    <SelectItem value={String(form.doctor)}>{form.doctor}</SelectItem>
                  ) : null}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={String(form.status || 'scheduled')} onValueChange={(v) => setForm(prev => ({ ...prev, status: v as any }))}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="tentative">Tentative</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={form.notes || ''} onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))} />
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel</Button>
            <Button variant="secondary" onClick={handleDelete} disabled={isLoading}>
              {isLoading ? "Deleting..." : "Delete"}
            </Button>
            <Button variant="brand" onClick={handleSave} disabled={isLoading}>
              {isLoading ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Appointment</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this appointment? This action cannot be undone.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirmDelete} disabled={isLoading}>
            {isLoading ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
