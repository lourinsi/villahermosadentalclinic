"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAppointments, Appointment } from "@/hooks/useAppointments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, Clock, User, Briefcase } from "lucide-react";
import { getAppointmentTypeName } from "@/lib/appointment-types";
import { formatTimeTo12h } from "@/lib/time-slots";
import { parseBackendDateToLocal } from "@/lib/utils";

const OrdersPage = () => {
    const { user, isLoading: authLoading } = useAuth();
    const { appointments, isLoading: appointmentsLoading } = useAppointments(undefined, { patientId: user?.patientId });
    const [sortedAppointments, setSortedAppointments] = useState<Appointment[]>([]);

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
        }
    }, [appointments]);

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
            <h1 className="text-2xl font-bold">My Bookings</h1>
            {sortedAppointments.length === 0 ? (
                <p>You have no booked appointments.</p>
            ) : (
                <div className="space-y-4">
                    {sortedAppointments.map(appointment => (
                        <Card key={appointment.id}>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle>{getAppointmentTypeName(appointment.type, appointment.customType)}</CardTitle>
                                        <p className="text-sm text-muted-foreground">with Dr. {appointment.doctor}</p>
                                    </div>
                                    <Badge variant={appointment.status === 'completed' ? 'default' : 'secondary'}>{appointment.status}</Badge>
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
                                {appointment.paymentStatus &&
                                    <div className="flex items-center gap-2">
                                        <Badge variant={appointment.paymentStatus === 'paid' ? 'success' : 'destructive'}>{appointment.paymentStatus}</Badge>
                                    </div>
                                }
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

export default OrdersPage;
