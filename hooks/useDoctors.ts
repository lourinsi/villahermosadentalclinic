"use client";
import { useCallback, useEffect, useState } from "react";
import { Staff } from "../lib/staff-types";

export interface DoctorOption {
  id: string;
  name: string;
  role: string;
  specialization?: string;
  email?: string;
  profilePicture?: string;
  bio?: string;
}

const STAFF_API = "http://localhost:3001/api/staff?limit=100";
const PUBLIC_DOCTORS_API = "http://localhost:3001/api/staff/public-doctors";

export function useDoctors(refreshKey?: number, options?: { publicBooking?: boolean }) {
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(true);
  const publicBooking = Boolean(options?.publicBooking);

  const loadDoctors = useCallback(async () => {
    try {
      setIsLoadingDoctors(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem("authToken") : null;
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(publicBooking ? PUBLIC_DOCTORS_API : STAFF_API, { headers, credentials: "include" });
      
      if (!response.ok) {
        // If the user is not authenticated, the API may return 401/403.
        // That's an expected case for public/landing pages — avoid noisy
        // console.error with full stack traces in that situation.
        if (response.status === 401 || response.status === 403) {
          // Use debug-level logging so it can be inspected when needed
          // but won't create an error stack in normal unauthenticated usage.
          console.debug('[useDoctors] Unauthenticated - backend returned', response.status, response.statusText);
          if (!publicBooking) {
            const publicResponse = await fetch(PUBLIC_DOCTORS_API);
            if (publicResponse.ok) {
              const publicResult = await publicResponse.json();
              if (publicResult?.success && Array.isArray(publicResult.data)) {
                setDoctors(mapDoctorOptions(publicResult.data));
              }
            } else {
              setDoctors([]);
            }
            setIsLoadingDoctors(false);
            return;
          }

          setDoctors([]);
          setIsLoadingDoctors(false);
          return;
        }

        console.error('[useDoctors] Fetch failed with status:', response.status, response.statusText);
        setDoctors([]);
        setIsLoadingDoctors(false);
        return;
      }
      
      const result = await response.json();
      
      if (result?.success && Array.isArray(result.data)) {
        setDoctors(mapDoctorOptions(result.data));
      } else {
        setDoctors([]);
      }
    } catch (error) {
      console.error('[useDoctors] Failed to load doctors:', error);
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.error('[useDoctors] Network error - backend server may not be running at', STAFF_API);
      }
      setDoctors([]);
    } finally {
      setIsLoadingDoctors(false);
    }
  }, [publicBooking]);

  useEffect(() => {
    loadDoctors();
  }, [loadDoctors, refreshKey]);

  return { doctors, isLoadingDoctors, reloadDoctors: loadDoctors };
}

function isDoctorStaff(staff: Partial<Staff>) {
  const role = String(staff.role || "").toLowerCase();
  const specialization = String(staff.specialization || "").toLowerCase();
  return role.includes("doctor") || role.includes("dentist") || specialization.includes("doctor") || specialization.includes("dentist");
}

function getStaffProfilePicture(staff: Partial<Staff>) {
  return typeof staff.profilePicture === "string" ? staff.profilePicture.trim() || undefined : undefined;
}

function mapDoctorOptions(staffMembers: Partial<Staff>[]): DoctorOption[] {
  return staffMembers
    .filter(isDoctorStaff)
    .map((staff) => ({
      id: String(staff.id ?? staff.email ?? staff.name),
      name: staff.name || "Doctor",
      role: staff.role || "Dentist",
      specialization: staff.specialization,
      email: staff.email,
      profilePicture: getStaffProfilePicture(staff),
      bio: staff.bio,
    }));
}
