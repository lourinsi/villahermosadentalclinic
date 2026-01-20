"use client";

import { useEffect, useState } from "react";
import { Staff } from "@/lib/staff-types";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Search } from "lucide-react";

const FindDoctorsPage = () => {
  const [doctors, setDoctors] = useState<Staff[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("http://localhost:3001/api/staff?role=Doctor,Dentist");
        const result = await response.json();
        if (result.success) {
          setDoctors(result.data);
          setFilteredDoctors(result.data);
        }
      } catch (error) {
        console.error("Failed to fetch doctors", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDoctors();
  }, []);

  useEffect(() => {
    const results = doctors.filter(doctor =>
      doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.specialization?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredDoctors(results);
  }, [searchTerm, doctors]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Find a Doctor</h1>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Search by name or specialization..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDoctors.map(doctor => (
          <Card key={doctor.id}>
            <CardHeader className="flex flex-row items-center gap-4">
                <Avatar className="h-16 w-16">
                    <AvatarImage src={doctor.photoUrl} alt={doctor.name} />
                    <AvatarFallback>{doctor.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                    <CardTitle>{doctor.name}</CardTitle>
                    <p className="text-muted-foreground">{doctor.specialization}</p>
                </div>
            </CardHeader>
            <CardContent>
              <p>{doctor.bio || "No biography available."}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default FindDoctorsPage;
