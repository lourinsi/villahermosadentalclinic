import React, { useState, useMemo } from "react";
import { Appointment, useAppointments } from "../hooks/useAppointments";
import { APPOINTMENT_TYPES, getAppointmentTypeName } from "../lib/appointment-types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Button } from "./ui/button";
import { ArrowUp, ArrowDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"; // Import Select components

type SortKey = "date" | "patientName" | "doctor" | "status";

const ALL_APPOINTMENT_STATUSES = ["scheduled", "confirmed", "pending", "tentative", "completed", "cancelled"];

export const AllAppointmentsView: React.FC = () => {
  const { appointments, isLoading } = useAppointments();
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [filterType, setFilterType] = useState<string>("all"); // New state for type filter
  const [filterStatus, setFilterStatus] = useState<string>("all"); // New state for status filter

  const sortedAppointments = useMemo(() => {
    if (!appointments) return [];

    let filtered = [...appointments];

    // Apply type filter
    if (filterType !== "all") {
      filtered = filtered.filter(apt => {
        const typeName = getAppointmentTypeName(apt.type, apt.customType);
        return typeName === filterType;
      });
    }

    // Apply status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter(apt => apt.status === filterStatus);
    }

    return filtered.sort((a, b) => {
      let compareA: string | number;
      let compareB: string | number;

      switch (sortKey) {
        case "date":
          compareA = new Date(`${a.date}T${a.time}`).getTime();
          compareB = new Date(`${b.date}T${b.time}`).getTime();
          break;
        case "patientName":
          compareA = a.patientName.toLowerCase();
          compareB = b.patientName.toLowerCase();
          break;
        case "doctor":
          compareA = a.doctor.toLowerCase();
          compareB = b.doctor.toLowerCase();
          break;
        case "status":
          compareA = a.status.toLowerCase();
          compareB = b.status.toLowerCase();
          break;
        default:
          compareA = new Date(`${a.date}T${a.time}`).getTime();
          compareB = new Date(`${b.date}T${b.time}`).getTime();
      }

      if (compareA < compareB) {
        return sortOrder === "asc" ? -1 : 1;
      }
      if (compareA > compareB) {
        return sortOrder === "asc" ? 1 : -1;
      }
      return 0;
    });
  }, [appointments, sortOrder, sortKey, filterType, filterStatus]);

  const toggleSortOrder = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const getSortIcon = (key: SortKey) => {
    if (sortKey === key) {
      return sortOrder === "asc" ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />;
    }
    return null;
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading appointments...</div>;
  }

  return (
    <>
      <h1 className="text-3xl font-bold mb-6">All Appointments</h1>

      <div className="flex space-x-4 mb-4">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {APPOINTMENT_TYPES.map((type) => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {ALL_APPOINTMENT_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button variant="ghost" onClick={() => toggleSortOrder("patientName")}>
                  Patient Name {getSortIcon("patientName")}
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => toggleSortOrder("date")}>
                  Date & Time {getSortIcon("date")}
                </Button>
              </TableHead>
              <TableHead>Type</TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => toggleSortOrder("doctor")}>
                  Doctor {getSortIcon("doctor")}
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => toggleSortOrder("status")}>
                  Status {getSortIcon("status")}
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedAppointments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No appointments found.
                </TableCell>
              </TableRow>
            ) : (
              sortedAppointments.map((appointment) => (
                <TableRow key={appointment.id}>
                  <TableCell className="font-medium">{appointment.patientName}</TableCell>
                  <TableCell>{`${appointment.date} ${appointment.time}`}</TableCell>
                  <TableCell>{getAppointmentTypeName(appointment.type, appointment.customType)}</TableCell>
                  <TableCell>{appointment.doctor}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        appointment.status === "scheduled" ? "bg-blue-100 text-blue-800" :
                        appointment.status === "confirmed" ? "bg-green-100 text-green-800" :
                        appointment.status === "completed" ? "bg-purple-100 text-purple-800" :
                        appointment.status === "cancelled" ? "bg-red-100 text-red-800" :
                        "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
};

export default AllAppointmentsView;
