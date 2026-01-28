"use client";

import React, { useMemo, useEffect } from "react";
import { ShoppingCart } from "lucide-react";
import { Appointment } from "@/hooks/useAppointments";
import { useAuth } from "@/hooks/useAuth";
import { AllAppointmentsView } from "@/components/AllAppointmentsView";
import { useAppointmentModal } from "@/hooks/useAppointmentModal";
import { usePaymentModal } from "@/hooks/usePaymentModal";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const CartPage = () => {
    const { user } = useAuth();
    const parentId = user?.patientId;

    const { appointments, isLoading, refreshAppointments, deleteAppointment } = useAppointmentModal();
    const { openPatientPaymentModal } = usePaymentModal();

    // Use filters to fetch all appointments for this patient/family, including unpaid
    const filters = useMemo(() => ({
        parentId,
        includeUnpaid: true
    }), [parentId]);

    // Force refresh when filters change
    useEffect(() => {
        if (parentId) {
            refreshAppointments(filters);
        }
    }, [filters, refreshAppointments, parentId]);

    const cartAppointments = useMemo(() => {
        return appointments.filter(apt => apt.status === "pending" || apt.status === "tentative");
    }, [appointments]);

    const handlePay = (appointment: Appointment) => {
        openPatientPaymentModal(appointments, appointment.id);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to remove this appointment from your cart?")) return;
        
        try {
            await deleteAppointment(id);
            toast.success("Appointment removed from cart");
            refreshAppointments(filters);
        } catch {
            toast.error("Failed to remove appointment");
        }
    };

    return (
        <div className="space-y-6">
            <Card className="shadow-lg border-none">
                <CardHeader className="bg-white border-b pb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 rounded-lg">
                            <ShoppingCart className="w-6 h-6 text-orange-600" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl font-bold">My Appointment Cart</CardTitle>
                            <CardDescription>
                                Confirm and pay for your pending appointments to secure your schedule.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex justify-center items-center min-h-[400px]">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
                        </div>
                    ) : cartAppointments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
                            <ShoppingCart className="w-16 h-16 mb-4 text-gray-200" />
                            <h3 className="text-xl font-semibold text-gray-900">Your Cart is Empty</h3>
                            <p className="text-muted-foreground mt-2 max-w-sm">
                                You don&apos;t have any pending appointments. Head over to &quot;Find Doctors&quot; or &quot;My Appointments&quot; to book a new one!
                            </p>
                        </div>
                    ) : (
                        <div className="p-6">
                            <AllAppointmentsView 
                                appointments={cartAppointments} 
                                isLoading={isLoading}
                                onPay={handlePay}
                                onDelete={handleDelete}
                                isCart={true}
                            />
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default CartPage;
