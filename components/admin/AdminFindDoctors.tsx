"use client";

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAppointmentModal } from '@/hooks/useAppointmentModal';

export default function AdminFindDoctors() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const { openCreateModal } = useAppointmentModal() as any;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const dRes = await fetch('/api/doctors');
        const pRes = await fetch('/api/patients');

        const d = dRes.ok ? await dRes.json() : [];
        const p = pRes.ok ? await pRes.json() : [];

        if (!cancelled) {
          setDoctors(Array.isArray(d) ? d : []);
          setPatients(Array.isArray(p) ? p : []);
          if (Array.isArray(p) && p[0]) setSelectedPatientId(p[0].id);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('admin find doctors fetch error', e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Select patient</label>
        <select className="w-full rounded-md border p-2" value={selectedPatientId || ''} onChange={(e) => setSelectedPatientId(e.target.value)}>
          {patients.map(p => <option key={p.id} value={p.id}>{p.name || p.fullName || p.firstName}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {doctors.map(doc => (
          <div key={doc.id} className="border rounded-lg p-4 shadow-sm">
            <div className="font-semibold">{doc.name}</div>
            <div className="text-sm text-gray-500 mb-3">{doc.specialty || 'Dentist'}</div>
            <div className="flex justify-end">
              <Button onClick={() => {
                if (!selectedPatientId) return;
                // open create modal prefilled with doctor and patient
                openCreateModal({ doctorId: doc.id, patientId: selectedPatientId });
              }}>Book</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
