"use client";

import { useEffect, useState, Suspense } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAppointments, Appointment } from "@/hooks/useAppointments";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, Clock, Briefcase, CreditCard, CheckCircle2, Search, X } from "lucide-react";
import { getAppointmentTypeName } from "@/lib/appointment-types";
import { formatTimeTo12h } from "@/lib/time-slots";
import { parseBackendDateToLocal } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { usePaymentModal } from "@/hooks/usePaymentModal";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

const OrdersContent = () => {
    const searchParams = useSearchParams();
    const appointmentIdParam = searchParams.get("appointmentId");
    
    const { user, isLoading: authLoading } = useAuth();
    const { appointments, isLoading: appointmentsLoading } = useAppointments(undefined, { patientId: user?.patientId });
    const { openPatientPaymentModal } = usePaymentModal();
    const [sortedAppointments, setSortedAppointments] = useState<Appointment[]>([]);
    
    // Filter states
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all");
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

    useEffect(() => {
        if (appointments) {
            const sorted = [...appointments].sort((a, b) => {
                const dateA = parseBackendDateToLocal(a.date).getTime();
                const dateB = parseBackendDateToLocal(b.date).getTime();
                if (dateB !== dateA) {
                    return dateB - dateA; // Sort by date descending
                }
                return a.time.localeCompare(b.time); // Then by time ascending
            });
            setSortedAppointments(sorted);

            // If appointmentId is in URL, open payment dialog
            if (appointmentIdParam) {
                const apt = sorted.find(a => a.id === appointmentIdParam);
                if (apt && apt.paymentStatus !== 'paid') {
                    openPatientPaymentModal(appointments, apt.id);
                }
            }
        }
    }, [appointments, appointmentIdParam, openPatientPaymentModal]);

    const handleOpenPayment = (apt: Appointment) => {
        openPatientPaymentModal(appointments, apt.id);
    };

    const resetFilters = () => {
        setSearchQuery("");
        setStatusFilter("all");
        setPaymentStatusFilter("all");
        setDateRange(undefined);
    };

    const filteredAppointments = sortedAppointments.filter(apt => {
        // Search query filter
        const appointmentType = getAppointmentTypeName(apt.type, apt.customType).toLowerCase();
        const doctorName = apt.doctor.toLowerCase();
        const matchesSearch = appointmentType.includes(searchQuery.toLowerCase()) || 
                             doctorName.includes(searchQuery.toLowerCase());

        // Status filter
        const matchesStatus = statusFilter === "all" || apt.status === statusFilter;

        // Payment status filter
        const matchesPaymentStatus = paymentStatusFilter === "all" || apt.paymentStatus === paymentStatusFilter;

        // Date range filter
        let matchesDate = true;
        if (dateRange?.from) {
            const aptDate = parseBackendDateToLocal(apt.date);
            // Set time to 0 to compare only dates
            const fromDate = new Date(dateRange.from);
            fromDate.setHours(0, 0, 0, 0);
            
            if (aptDate < fromDate) {
                matchesDate = false;
            }

            if (dateRange.to) {
                const toDate = new Date(dateRange.to);
                toDate.setHours(23, 59, 59, 999);
                if (aptDate > toDate) {
                    matchesDate = false;
                }
            }
        }

        return matchesSearch && matchesStatus && matchesPaymentStatus && matchesDate;
    });

    const isLoading = authLoading || appointmentsLoading;

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold">My Bookings</h1>
                {(searchQuery || statusFilter !== "all" || paymentStatusFilter !== "all" || dateRange) && (
                    <Button variant="ghost" size="sm" onClick={resetFilters} className="text-muted-foreground">
                        <X className="h-4 w-4 mr-2" />
                        Clear Filters
                    </Button>
                )}
            </div>

            {/* Filters Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search type or doctor..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                        <SelectValue placeholder="Appointment Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="tentative">Tentative</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                    <SelectTrigger>
                        <SelectValue placeholder="Payment Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Payment Status</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="unpaid">Unpaid</SelectItem>
                        <SelectItem value="half-paid">Half Paid</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                </Select>

                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            className={cn(
                                "w-full justify-start text-left font-normal",
                                !dateRange && "text-muted-foreground"
                            )}
                        >
                            <Calendar className="mr-2 h-4 w-4" />
                            {dateRange?.from ? (
                                dateRange.to ? (
                                    <>
                                        {dateRange.from.toLocaleDateString()} - {dateRange.to.toLocaleDateString()}
                                    </>
                                ) : (
                                    dateRange.from.toLocaleDateString()
                                )
                            ) : (
                                <span>Filter by date</span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                        <CalendarComponent
                            initialFocus
                            mode="range"
                            defaultMonth={dateRange?.from}
                            selected={dateRange}
                            onSelect={setDateRange}
                            numberOfMonths={1}
                        />
                    </PopoverContent>
                </Popover>
            </div>

            {filteredAppointments.length === 0 ? (
                <div className="text-center py-10 border rounded-lg bg-muted/20">
                    <p className="text-muted-foreground">
                        {sortedAppointments.length === 0 
                            ? "You have no booked appointments." 
                            : "No appointments match your filters."}
                    </p>
                    {sortedAppointments.length > 0 && (
                        <Button variant="link" onClick={resetFilters} className="mt-2">
                            Clear all filters
                        </Button>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredAppointments.map(appointment => (
                        <Card key={appointment.id} className={appointmentIdParam === appointment.id ? "border-blue-500 ring-1 ring-blue-500" : ""}>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle>{getAppointmentTypeName(appointment.type, appointment.customType)}</CardTitle>
                                        <p className="text-sm text-muted-foreground">with Dr. {appointment.doctor}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <Badge variant={appointment.status === 'completed' ? 'default' : 'secondary'}>{appointment.status}</Badge>
                                        {appointment.paymentStatus &&
                                            <Badge variant={appointment.paymentStatus === 'paid' ? 'success' : 'destructive'} className={appointment.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : ''}>
                                                {appointment.paymentStatus.toUpperCase()}
                                            </Badge>
                                        }
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="grid gap-4 md:grid-cols-2">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                    <span>{parseBackendDateToLocal(appointment.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-muted-foreground" />
                                    <span>{formatTimeTo12h(appointment.time)}</span>
                                </div>
                                 <div className="flex items-center gap-2">
                                    <Briefcase className="w-4 h-4 text-muted-foreground" />
                                    <span>{appointment.duration || 30} minutes</span>
                                </div>
                                <div className="flex items-center gap-2 font-semibold">
                                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                                    <span>Price: ₱{appointment.price || 0}</span>
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-end pt-2 border-t">
                                {appointment.paymentStatus !== 'paid' && appointment.status !== 'cancelled' ? (
                                    <Button onClick={() => handleOpenPayment(appointment)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                                        <CreditCard className="h-4 w-4" />
                                        Pay Now
                                    </Button>
                                ) : (
                                    <div className="flex items-center text-green-600 text-sm font-medium gap-1">
                                        <CheckCircle2 className="h-4 w-4" />
                                        {appointment.paymentStatus === 'paid' ? 'Paid' : 'Payment not required'}
                                    </div>
                                )}
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}

        </div>
    );
};

const OrdersPage = () => {
    return (
        <Suspense fallback={
            <div className="flex justify-center items-center h-full">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        }>
            <OrdersContent />
        </Suspense>
    );
};

export default OrdersPage;
