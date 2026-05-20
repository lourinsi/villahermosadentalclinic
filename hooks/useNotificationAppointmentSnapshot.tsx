"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Notification } from "@/lib/notification-types";
import { apiUrl } from "@/lib/api";
import { getAuthHeaders } from "@/lib/auth-headers";
import { fetchSnapshotFromLogs } from "@/lib/appointmentSnapshots";

type AppointmentSnapshotCandidate = {
  id?: string;
  appointmentId?: string;
  _id?: string;
  createdAt?: string;
  updatedAt?: string;
  changedAt?: string;
  [key: string]: any;
};

const getAppointmentIdFromSnapshot = (snapshot?: AppointmentSnapshotCandidate | null) =>
  String(snapshot?.id || snapshot?.appointmentId || snapshot?._id || "");

const getNotificationSnapshotDate = (notification: Notification) => {
  const metadata = notification.metadata as any;

  return (
    metadata?.logDate ||
    metadata?.appointmentSnapshot?.changedAt ||
    metadata?.changedFields?.changedAt ||
    metadata?.changedFields?.updatedAt ||
    metadata?.paymentDate ||
    notification.updatedAt ||
    notification.createdAt ||
    ""
  );
};

const fetchAppointmentSnapshot = async (appointmentId: string) => {
  const response = await fetch(apiUrl(`/api/appointments/${encodeURIComponent(appointmentId)}`), {
    credentials: "include",
    headers: getAuthHeaders(),
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || !payload?.data) {
    throw new Error(payload?.message || "Appointment not found");
  }

  return payload.data;
};

export function useNotificationAppointmentSnapshot(appointments: AppointmentSnapshotCandidate[] = []) {
  const [isAppointmentHistoryOpen, setIsAppointmentHistoryOpen] = useState(false);
  const [appointmentSnapshot, setAppointmentSnapshot] = useState<any | null>(null);
  const [appointmentSnapshotLogDate, setAppointmentSnapshotLogDate] = useState("");
  const [appointmentSnapshotIsHistorical, setAppointmentSnapshotIsHistorical] = useState(false);

  const findLocalAppointment = (appointmentId: string) =>
    appointments.find((appointment) => String(appointment.id) === String(appointmentId));

  const resetAppointmentSnapshot = () => {
    setAppointmentSnapshot(null);
    setAppointmentSnapshotLogDate("");
    setAppointmentSnapshotIsHistorical(false);
  };

  const handleViewCurrentSnapshot = async (appointmentId: string) => {
    if (!appointmentId) return;

    try {
      const snapshot = findLocalAppointment(appointmentId) || await fetchAppointmentSnapshot(appointmentId);

      setAppointmentSnapshot(snapshot);
      setAppointmentSnapshotLogDate(snapshot?.updatedAt || snapshot?.createdAt || new Date().toISOString());
      setAppointmentSnapshotIsHistorical(false);
      setIsAppointmentHistoryOpen(true);
    } catch (error) {
      console.error("[Notifications] Failed to load current appointment snapshot:", error);
      toast.error(error instanceof Error ? error.message : "Failed to load appointment snapshot");
    }
  };

  const handleViewAppointment = (appointment: AppointmentSnapshotCandidate) => {
    if (!appointment) return;

    setAppointmentSnapshot(appointment);
    setAppointmentSnapshotLogDate(appointment.updatedAt || appointment.createdAt || new Date().toISOString());
    setAppointmentSnapshotIsHistorical(false);
    setIsAppointmentHistoryOpen(true);
  };

  const handleViewAppointmentSnapshot = async (appointmentId: string, notification: Notification) => {
    if (!appointmentId) {
      toast.error("No appointment is linked to this notification");
      return;
    }

    const metadata = notification.metadata as any;
    const logDate = getNotificationSnapshotDate(notification);
    let snapshot = metadata?.appointmentSnapshot || null;
    let snapshotLogDate = logDate;
    let isHistorical = Boolean(notification.isLog || metadata?.appointmentSnapshot?._isHistorical);

    try {
      if (!snapshot && logDate) {
        try {
          const fromLogs = await fetchSnapshotFromLogs(appointmentId, logDate);
          if (fromLogs) {
            snapshot = fromLogs;
            snapshotLogDate = fromLogs.changedAt || logDate;
            isHistorical = Boolean(notification.isLog || (fromLogs as any)._isHistorical);
          }
        } catch (logError) {
          console.warn("[Notifications] Failed to build notification snapshot from logs:", logError);
        }
      }

      if (!snapshot) {
        snapshot = findLocalAppointment(appointmentId) || await fetchAppointmentSnapshot(appointmentId);
        snapshotLogDate = snapshot?.updatedAt || snapshot?.createdAt || new Date().toISOString();
        isHistorical = false;
      }

      if (!snapshot) {
        throw new Error("No appointment snapshot is available for this notification");
      }

      if (!getAppointmentIdFromSnapshot(snapshot)) {
        snapshot = { ...snapshot, id: appointmentId };
      }

      setAppointmentSnapshot(snapshot);
      setAppointmentSnapshotLogDate(snapshotLogDate || snapshot?.changedAt || snapshot?.updatedAt || snapshot?.createdAt || new Date().toISOString());
      setAppointmentSnapshotIsHistorical(isHistorical);
      setIsAppointmentHistoryOpen(true);
    } catch (error) {
      console.error("[Notifications] Error loading appointment snapshot:", error);
      toast.error(error instanceof Error ? error.message : "Failed to load appointment snapshot");
    }
  };

  return {
    isAppointmentHistoryOpen,
    setIsAppointmentHistoryOpen,
    appointmentSnapshot,
    appointmentSnapshotId: getAppointmentIdFromSnapshot(appointmentSnapshot),
    appointmentSnapshotLogDate,
    appointmentSnapshotIsHistorical,
    handleViewCurrentSnapshot,
    handleViewAppointmentSnapshot,
    handleViewAppointment,
    resetAppointmentSnapshot,
  };
}
