"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Patient, ApiResponse } from "@/lib/patient-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Plus, User as UserIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const FamilyPage = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [familyMembers, setFamilyMembers] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newMember, setNewMember] = useState({
    firstName: "",
    lastName: "",
    relationship: "Family Member",
    dateOfBirth: "",
  });

  const fetchFamilyMembers = async () => {
    if (user?.patientId) {
      try {
        setIsLoading(true);
        const response = await fetch(`http://localhost:3001/api/patients?parentId=${user.patientId}`);
        const result = await response.json();
        if (result.success) {
          // Filter out the primary user if they are returned in the list (though parentId filter should handle it)
          setFamilyMembers(result.data.filter((p: Patient) => p.id !== user.patientId));
        } else {
          toast.error(result.message || "Failed to fetch family members.");
        }
      } catch (err) {
        toast.error("An error occurred while fetching family members.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchFamilyMembers();
    }
  }, [user, authLoading]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.patientId) return;

    try {
      setIsAdding(true);
      const response = await fetch("http://localhost:3001/api/patients/dependent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newMember,
          parentId: user.patientId,
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Family member added successfully!");
        setNewMember({
          firstName: "",
          lastName: "",
          relationship: "Family Member",
          dateOfBirth: "",
        });
        fetchFamilyMembers();
      } else {
        toast.error(result.message || "Failed to add family member.");
      }
    } catch (error) {
      toast.error("An error occurred while adding family member.");
    } finally {
      setIsAdding(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Family Members</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Family Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Family Member</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddMember} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    required
                    value={newMember.firstName}
                    onChange={(e) => setNewMember({ ...newMember, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    required
                    value={newMember.lastName}
                    onChange={(e) => setNewMember({ ...newMember, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="relationship">Relationship</Label>
                <Input
                  id="relationship"
                  placeholder="e.g. Spouse, Child, Parent"
                  value={newMember.relationship}
                  onChange={(e) => setNewMember({ ...newMember, relationship: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input
                  id="dob"
                  type="date"
                  value={newMember.dateOfBirth}
                  onChange={(e) => setNewMember({ ...newMember, dateOfBirth: e.target.value })}
                />
              </div>
              <p className="text-sm text-gray-500">
                Contact information (email and phone) will be inherited from your account.
              </p>
              <Button type="submit" className="w-full" disabled={isAdding}>
                {isAdding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Add Member
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {familyMembers.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-200">
            <p className="text-gray-500">No family members added yet.</p>
          </div>
        ) : (
          familyMembers.map((member) => (
            <Card key={member.id}>
              <CardHeader className="flex flex-row items-center space-x-4 pb-2">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <UserIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">{member.name}</CardTitle>
                  <p className="text-sm text-gray-500">{member.relationship}</p>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-1">
                  <p><span className="font-medium">DOB:</span> {member.dateOfBirth || "Not specified"}</p>
                  <p><span className="font-medium">Email:</span> {member.email}</p>
                  <p><span className="font-medium">Phone:</span> {member.phone}</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default FamilyPage;
