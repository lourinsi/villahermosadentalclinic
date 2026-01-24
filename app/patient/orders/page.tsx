"use client";

import { useEffect, useState, Suspense } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAppointments, Appointment } from "@/hooks/useAppointments";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, Clock, User, Briefcase, CreditCard, CheckCircle2 } from "lucide-react";
import { getAppointmentTypeName } from "@/lib/appointment-types";
import { formatTimeTo12h } from "@/lib/time-slots";
import { parseBackendDateToLocal } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { usePaymentModal } from "@/hooks/usePaymentModal";

const OrdersContent = () => {
    const searchParams = useSearchParams();
    const appointmentIdParam = searchParams.get("appointmentId");
    
    const { user, isLoading: authLoading } = useAuth();
    const { appointments, isLoading: appointmentsLoading } = useAppointments(undefined, { patientId: user?.patientId });
    const { openPatientPaymentModal } = usePaymentModal();
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
