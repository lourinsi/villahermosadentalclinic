"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface PaymentModalContextType {
  isPaymentModalOpen: boolean;
  appointmentId: string | null;
  patientId: string | null;
  patientName: string | null;
  appointments: any[];
  openPaymentModal: (patientId: string, patientName: string, appointments: any[], appointmentId?: string | null) => void;
  closePaymentModal: () => void;
}

const PaymentModalContext = createContext<PaymentModalContextType | undefined>(undefined);

export const PaymentModalProvider = ({ children }: { children: ReactNode }) => {
  const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patientName, setPatientName] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);

  const openPaymentModal = (pId: string, pName: string, apts: any[], aptId: string | null = null) => {
    setPatientId(pId);
    setPatientName(pName);
    setAppointments(apts);
    setAppointmentId(aptId);
    setPaymentModalOpen(true);
  };

  const closePaymentModal = () => {
    setPaymentModalOpen(false);
    setAppointmentId(null);
    setPatientId(null);
    setPatientName(null);
    setAppointments([]);
  };
  
  const value = {
    isPaymentModalOpen,
    appointmentId,
    patientId,
    patientName,
    appointments,
    openPaymentModal,
    closePaymentModal,
  };

  return (
    <PaymentModalContext.Provider value={value}>
      {children}
    </PaymentModalContext.Provider>
  );
};

export const usePaymentModal = () => {
  const context = useContext(PaymentModalContext);
  if (context === undefined) {
    throw new Error("usePaymentModal must be used within a PaymentModalProvider");
  }
  return context;
};