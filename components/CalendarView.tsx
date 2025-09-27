import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useAppointmentModal } from "./AdminLayout";

const mockAppointments = [
  { id: 1, patientName: "John Smith", time: "09:00", type: "Cleaning", doctor: "Dr. Johnson" },
  { id: 2, patientName: "Sarah Davis", time: "10:30", type: "Checkup", doctor: "Dr. Chen" },
  { id: 3, patientName: "Mike Johnson", time: "14:00", type: "Filling", doctor: "Dr. Rodriguez" },
  { id: 4, patientName: "Emily Brown", time: "15:30", type: "Consultation", doctor: "Dr. Johnson" },
];

type ViewMode = "month" | "week" | "day";

export function CalendarView() {
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedDoctor, setSelectedDoctor] = useState("all");
  const { openScheduleModal } = useAppointmentModal();

  const formatDate = (date: Date): string => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
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

  const getViewTitle = (): string => {
    if (viewMode === 'day') {
      return formatDate(selectedDate);
    } else if (viewMode === 'week') {
      const weekStart = new Date(selectedDate);
      weekStart.setDate(selectedDate.getDate() - selectedDate.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      return `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`;
    } else {
      return selectedDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    }
  };

  const filteredAppointments = mockAppointments.filter(appointment => {
    const matchesDoctor = selectedDoctor === "all" || appointment.doctor === selectedDoctor;
    return matchesDoctor;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Calendar</h1>
          <p className="text-muted-foreground">Manage appointments and schedules</p>
        </div>
        <Button variant="brand" onClick={() => openScheduleModal()}>
          <Plus className="h-4 w-4 mr-2" />
          New Appointment
        </Button>
      </div>

      {/* Calendar Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateDate('prev')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-lg font-semibold min-w-[200px] text-center">{getViewTitle()}</h2>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateDate('next')}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by doctor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Doctors</SelectItem>
                  <SelectItem value="Dr. Johnson">Dr. Johnson</SelectItem>
                  <SelectItem value="Dr. Chen">Dr. Chen</SelectItem>
                  <SelectItem value="Dr. Rodriguez">Dr. Rodriguez</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* View Toggle Buttons */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              {(["day", "week", "month"] as const).map((mode) => (
                <Button
                  key={mode}
                  size="sm"
                  variant="ghost"
                  className={`
                    px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 
                    ${viewMode === mode 
                      ? "bg-black text-white shadow-sm hover:bg-gray-800" 
                      : "bg-transparent text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                    }
                  `}
                  onClick={() => setViewMode(mode)}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Calendar Grid - simplified for demo */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                {day}
              </div>
            ))}
            {Array.from({ length: 35 }, (_, i) => {
              const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i - 6);
              const isCurrentMonth = date.getMonth() === selectedDate.getMonth();
              const isToday = date.toDateString() === new Date().toDateString();
              const isSelected = date.toDateString() === selectedDate.toDateString();
              
              return (
                <div
                  key={i}
                  className={`
                    p-2 text-center text-sm cursor-pointer rounded-md transition-colors duration-200
                    ${!isCurrentMonth ? 'text-gray-400' : 'text-gray-900'}
                    ${isToday ? 'bg-violet-100 text-violet-900 font-semibold' : ''}
                    ${isSelected ? 'bg-violet-600 text-white' : ''}
                    ${isCurrentMonth && !isSelected && !isToday ? 'hover:bg-gray-100' : ''}
                  `}
                  onClick={() => setSelectedDate(date)}
                >
                  {date.getDate()}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Today's Appointments */}
      <Card>
        <CardHeader>
          <CardTitle>
            {viewMode === 'day' ? 'Appointments for Today' : 'Upcoming Appointments'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredAppointments.length > 0 ? (
              filteredAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                >
                  <div className="flex items-center space-x-4">
                    <div className="text-sm font-medium text-violet-600">
                      {appointment.time}
                    </div>
                    <div>
                      <div className="font-medium">{appointment.patientName}</div>
                      <div className="text-sm text-gray-500">
                        {appointment.type} • {appointment.doctor}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                    <Button variant="secondary" size="sm">
                      Complete
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                No appointments found for the selected criteria.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}