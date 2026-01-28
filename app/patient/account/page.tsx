"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Patient } from "@/lib/patient-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const AccountPage = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPatientData = async () => {
      if (user?.patientId) {
        try {
          setIsLoading(true);
          const response = await fetch(`http://localhost:3001/api/patients/${user.patientId}`);
          const result = await response.json();
          if (result.success) {
            setPatient(result.data);
          } else {
            setError(result.message || "Failed to fetch patient data.");
            toast.error(result.message || "Failed to fetch patient data.");
          }
        } catch {
          setError("An error occurred while fetching patient data.");
          toast.error("An error occurred while fetching patient data.");
        } finally {
          setIsLoading(false);
        }
      }
    };

    if (!authLoading && user) {
      fetchPatientData();
    }
  }, [user, authLoading]);

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!patient) return;

    // Create a new object for the update, excluding fields that should not be sent
    const { id: _id, password: _password, createdAt: _createdAt, updatedAt: _updatedAt, deleted: _deleted, deletedAt: _deletedAt, ...updateData } = patient;

    try {
        const response = await fetch(`http://localhost:3001/api/patients/${patient.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData),
        });
        const result = await response.json();
        if (result.success) {
            toast.success("Account details updated successfully!");
        } else {
            toast.error(result.message || "Failed to update account details.");
        }
    } catch {
        toast.error("An error occurred while updating account details.");
    }
  };
  
    const handlePasswordChange = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const currentPassword = formData.get('currentPassword') as string;
        const newPassword = formData.get('newPassword') as string;

        if (!patient) return;

        try {
            const response = await fetch(`http://localhost:3001/api/patients/${patient.id}/change-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword, newPassword }),
            });
            const result = await response.json();
            if (result.success) {
                toast.success("Password changed successfully!");
                e.currentTarget.reset();
            } else {
                toast.error(result.message || "Failed to change password.");
            }
        } catch {
            toast.error("An error occurred while changing password.");
        }
    };

  if (authLoading || isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!patient) {
    return <div>No patient data found.</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Account</h1>
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                        id="firstName"
                        value={patient.firstName || ''}
                        onChange={(e) => setPatient({ ...patient, firstName: e.target.value, name: `${e.target.value} ${patient.lastName || ''}` })}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                        id="lastName"
                        value={patient.lastName || ''}
                        onChange={(e) => setPatient({ ...patient, lastName: e.target.value, name: `${patient.firstName || ''} ${e.target.value}` })}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        value={patient.email || ''}
                        onChange={(e) => setPatient({ ...patient, email: e.target.value })}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                        id="phone"
                        value={patient.phone || ''}
                        onChange={(e) => setPatient({ ...patient, phone: e.target.value })}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input
                        id="dateOfBirth"
                        type="date"
                        value={patient.dateOfBirth?.split('T')[0] || ''}
                        onChange={(e) => setPatient({ ...patient, dateOfBirth: e.target.value })}
                    />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                        id="address"
                        value={patient.address || ''}
                        onChange={(e) => setPatient({ ...patient, address: e.target.value })}
                    />
                </div>
            </div>
            <Button type="submit">Save Changes</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
             <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input name="currentPassword" id="currentPassword" type="password" required />
            </div>
             <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input name="newPassword" id="newPassword" type="password" required />
            </div>
            <Button type="submit">Change Password</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountPage;
