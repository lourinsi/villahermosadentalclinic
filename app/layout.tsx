import { AppointmentModalProvider } from "@/hooks/useAppointmentModal";
import { PaymentModalProvider } from "@/hooks/usePaymentModal";
import { AuthProvider } from "@/hooks/useAuth.tsx";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { CreateAppointmentModal } from "@/components/CreateAppointmentModal";
import { ScheduleAppointmentModal } from "@/components/ScheduleAppointmentModal";
import { AddPatientModal } from "@/components/AddPatientModal";
import { EditAppointmentModal } from "@/components/EditAppointmentModal";
import { RecordPaymentModal } from "@/components/RecordPaymentModal";
import { PatientPaymentModal } from "@/components/PatientPaymentModal";
import { PatientBookingModal } from "@/components/PatientBookingModal";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Villahermosa Dental Clinic",
  description: "Professional dental clinic management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <AppointmentModalProvider>
            <PaymentModalProvider>
              {children}
              <Toaster />
              <CreateAppointmentModal />
              <ScheduleAppointmentModal />
              <AddPatientModal />
              <EditAppointmentModal />
              <RecordPaymentModal />
              <PatientPaymentModal />
              <PatientBookingModal />
            </PaymentModalProvider>
          </AppointmentModalProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
