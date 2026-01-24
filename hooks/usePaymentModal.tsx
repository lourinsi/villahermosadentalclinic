"use client";

import { createContext, useContext, useState, ReactNode, useCallback, useMemo } from "react";

interface PaymentModalContextType {
  isPaymentModalOpen: boolean;
  isPatientPaymentModalOpen: boolean;
  appointmentId: string | null;
  patientId: string | null;
  patientName: string | null;
  appointments: any[];
  paymentId: string | null;
  paymentData: any | null;
  openPaymentModal: (patientId: string, patientName: string, appointments: any[], appointmentId?: string | null) => void;
  openPatientPaymentModal: (appointments: any[], appointmentId: string) => void;
  openEditPaymentModal: (paymentId: string, paymentData: any, patientId?: string | null, appointments?: any[]) => void;
  closePaymentModal: () => void;
}

const PaymentModalContext = createContext<PaymentModalContextType | undefined>(undefined);

export const PaymentModalProvider = ({ children }: { children: ReactNode }) => {
  const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
  const [isPatientPaymentModalOpen, setPatientPaymentModalOpen] = useState(false);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patientName, setPatientName] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<any | null>(null);

  const openPaymentModal = useCallback((pId: string, pName: string, apts: any[], aptId: string | null = null) => {
    setPatientId(pId);
    setPatientName(pName);
    setAppointments(apts);
    setAppointmentId(aptId);
    setPaymentId(null);
    setPaymentData(null);
    setPaymentModalOpen(true);
  }, []);

  const openPatientPaymentModal = useCallback((apts: any[], aptId: string) => {
    setAppointments(apts);
    setAppointmentId(aptId);
    setPatientPaymentModalOpen(true);
  }, []);

  const openEditPaymentModal = useCallback((pId: string, pData: any, pIdParam?: string | null, apts?: any[]) => {
    setPaymentId(pId);
    setPaymentData(pData);
    setAppointmentId(pData.appointmentId || null);
    setPatientId(pIdParam || pData.patientId || null);
    setPatientName(null);
    setAppointments(apts || []);
    setPaymentModalOpen(true);
  }, []);

  const closePaymentModal = useCallback(() => {
    setPaymentModalOpen(false);
    setPatientPaymentModalOpen(false);
    setAppointmentId(null);
    setPatientId(null);
    setPatientName(null);
    setAppointments([]);
    setPaymentId(null);
    setPaymentData(null);
  }, []);

  const value = useMemo(() => ({
    isPaymentModalOpen,
    isPatientPaymentModalOpen,
    appointmentId,
    patientId,
    patientName,
    appointments,
    paymentId,
    paymentData,
    openPaymentModal,
    openPatientPaymentModal,
    openEditPaymentModal,
    closePaymentModal,
  }), [
    isPaymentModalOpen,
    isPatientPaymentModalOpen,
    appointmentId,
    patientId,
    patientName,
    appointments,
    paymentId,
    paymentData,
    openPaymentModal,
    openPatientPaymentModal,
    openEditPaymentModal,
    closePaymentModal,
  ]);

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