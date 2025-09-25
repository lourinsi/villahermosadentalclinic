import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar as CalendarIcon,
  Clock,
  User,
  Edit,
  Trash2,
  Filter
} from "lucide-react";

const mockAppointments = [
  {
    id: 1,
    time: "09:00 AM",
    patient: "John Smith",
    type: "Cleaning",
    doctor: "Dr. Johnson",
    duration: 60,
    status: "confirmed",
    date: "2024-01-24"
  },
  {
    id: 2,
    time: "10:30 AM",
    patient: "Sarah Davis",
    type: "Checkup",
    doctor: "Dr. Chen",
    duration: 30,
    status: "in-progress",
    date: "2024-01-24"
  },
  {
    id: 3,
    time: "11:45 AM",
    patient: "Mike Johnson",
    type: "Filling",
    doctor: "Dr. Johnson",
    duration: 90,
    status: "waiting",
    date: "2024-01-24"
  },
  {
    id: 4,
    time: "02:00 PM",
    patient: "Emily Brown",
    type: "Consultation",
    doctor: "Dr. Rodriguez",
    duration: 45,
    status: "confirmed",
    date: "2024-01-24"
  },
  {
    id: 5,
    time: "03:30 PM",
    patient: "David Wilson",
    type: "Cleaning",
    doctor: "Dr. Johnson",
    duration: 60,
    status: "confirmed",
    date: "2024-01-24"
  },
  {
    id: 6,
    time: "09:00 AM",
    patient: "Lisa Garcia",
    type: "Crown Fitting",
    doctor: "Dr. Chen",
    duration: 120,
    status: "confirmed",
    date: "2024-01-25"
  },
  {
    id: 7,
    time: "11:00 AM",
    patient: "Robert Taylor",
    type: "Root Canal",
    doctor: "Dr. Johnson",
    duration: 90,
    status: "confirmed",
    date: "2024-01-25"
  }
];

const timeSlots = [
  "08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM",
  "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM",
  "05:00 PM", "05:30 PM"
];

const doctors = ["Dr. Sarah Johnson", "Dr. Michael Chen", "Dr. Emily Rodriguez"];

export function CalendarView() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedDoctor, setSelectedDoctor] = useState("all");
  const [viewMode, setViewMode] = useState("day"); // day, week, month
  const [showNewAppointment, setShowNewAppointment] = useState(false);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "in-progress":
        return "bg-blue-100 text-blue-800";
      case "waiting":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "cleaning":
        return "bg-blue-500";
      case "checkup":
        return "bg-green-500";
      case "filling":
        return "bg-orange-500";
      case "consultation":
        return "bg-purple-500";
      case "crown fitting":
        return "bg-red-500";
      case "root canal":
        return "bg-pink-500";
      default:
        return "bg-gray-500";
    }
  };

  const filteredAppointments = mockAppointments.filter(appointment => {
    const appointmentDate = new Date(appointment.date);
    const isSameDate = appointmentDate.toDateString() === selectedDate.toDateString();
    const matchesDoctor = selectedDoctor === "all" || appointment.doctor === selectedDoctor;
    return isSameDate && matchesDoctor;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Calendar</h1>
          <p className="text-muted-foreground">Manage appointments and schedules</p>
        </div>
        <Dialog open={showNewAppointment} onOpenChange={setShowNewAppointment}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              New Appointment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule New Appointment</DialogTitle>
            </DialogHeader>
            <NewAppointmentForm onClose={() => setShowNewAppointment(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Calendar Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => navigateDate('prev')}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigateDate('next')}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div>
                <h2 className="text-lg font-semibold">{formatDate(selectedDate)}</h2>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Filter by doctor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Doctors</SelectItem>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor} value={doctor}>{doctor}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="flex border rounded-lg">
                {['day', 'week', 'month'].map((mode) => (
                  <Button
                    key={mode}
                    variant={viewMode === mode ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode(mode)}
                    className="capitalize rounded-none first:rounded-l-lg last:rounded-r-lg"
                  >
                    {mode}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Grid */}
      <div className="grid lg:grid-cols-4 gap-6">
        {/* Time Slots and Appointments */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>
              Schedule - {filteredAppointments.length} appointments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {timeSlots.map((timeSlot) => {
                const appointment = filteredAppointments.find(apt => apt.time === timeSlot);
                
                return (
                  <div key={timeSlot} className="flex items-center min-h-[60px] border-b border-gray-100">
                    <div className="w-20 text-sm text-muted-foreground font-medium">
                      {timeSlot}
                    </div>
                    <div className="flex-1 ml-4">
                      {appointment ? (
                        <div className="bg-white border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div 
                                className={`w-3 h-3 rounded-full ${getTypeColor(appointment.type)}`}
                              />
                              <div>
                                <div className="font-medium text-sm">{appointment.patient}</div>
                                <div className="text-xs text-muted-foreground">
                                  {appointment.type} • {appointment.doctor} • {appointment.duration}min
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className={getStatusColor(appointment.status)}>
                                {appointment.status}
                              </Badge>
                              <div className="flex space-x-1">
                                <Button variant="ghost" size="sm">
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="h-12 flex items-center text-muted-foreground text-sm">
                          Available
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Daily Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{filteredAppointments.length}</div>
                <div className="text-xs text-blue-600">Total</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {filteredAppointments.filter(apt => apt.status === 'confirmed').length}
                </div>
                <div className="text-xs text-green-600">Confirmed</div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Appointment Types</h4>
              {Array.from(new Set(filteredAppointments.map(apt => apt.type))).map((type) => {
                const count = filteredAppointments.filter(apt => apt.type === type).length;
                return (
                  <div key={type} className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${getTypeColor(type)}`} />
                      <span>{type}</span>
                    </div>
                    <span className="font-medium">{count}</span>
                  </div>
                );
              })}
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-sm">Doctors Schedule</h4>
              {doctors.map((doctor) => {
                const doctorAppts = filteredAppointments.filter(apt => apt.doctor === doctor);
                return (
                  <div key={doctor} className="flex items-center justify-between text-sm">
                    <span>{doctor.replace('Dr. ', '')}</span>
                    <Badge variant="outline">{doctorAppts.length} appointments</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function NewAppointmentForm({ onClose }: { onClose: () => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Patient</Label>
          <Select>
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
        <div>
          <Label>Doctor</Label>
          <Select>
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
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Date</Label>
          <Input type="date" />
        </div>
        <div>
          <Label>Time</Label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select time" />
            </SelectTrigger>
            <SelectContent>
              {timeSlots.map((time) => (
                <SelectItem key={time} value={time}>{time}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Appointment Type</Label>
          <Select>
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
        <div>
          <Label>Duration (minutes)</Label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Duration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 minutes</SelectItem>
              <SelectItem value="45">45 minutes</SelectItem>
              <SelectItem value="60">60 minutes</SelectItem>
              <SelectItem value="90">90 minutes</SelectItem>
              <SelectItem value="120">120 minutes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div>
        <Label>Notes</Label>
        <Textarea placeholder="Additional notes for the appointment..." />
      </div>
      
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={onClose} className="bg-primary hover:bg-primary/90">Schedule Appointment</Button>
      </div>
    </div>
  );
}