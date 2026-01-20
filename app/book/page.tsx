"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Calendar, Clock, User, Phone, Mail, ChevronRight, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { APPOINTMENT_TYPES } from "@/lib/appointment-types";
import { TIME_SLOTS, formatTimeTo12h } from "@/lib/time-slots";
import { formatDateToYYYYMMDD } from "@/lib/utils";
import { useDoctors } from "@/hooks/useDoctors";

export default function PublicBookingPage() {
  const router = useRouter();
  const { doctors, isLoadingDoctors } = useDoctors();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dateError, setDateError] = useState("");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    date: "",
    time: "",
    type: -1,
    customType: "",
    doctor: "",
    notes: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const nextStep = () => {
    if (step === 1) {
      if (!formData.firstName || !formData.lastName || !formData.phone) {
        toast.error("Please fill in all required contact information");
        return;
      }
    }
    setStep(step + 1);
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.type === -1 || !formData.date || !formData.time || !formData.doctor) {
      toast.error("Please complete all appointment details");
      return;
    }

    if (dateError) {
      toast.error(dateError);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("http://localhost:3001/api/appointments/public-book", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        setStep(3); // Success step
        toast.success("Appointment request sent successfully!");
      } else {
        toast.error(result.message || "Failed to book appointment");
      }
    } catch (error) {
      console.error("Booking error:", error);
      toast.error("An error occurred. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-grow py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-blue-600 mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Home
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Book an Appointment</h1>
            <p className="text-gray-600 mt-2">Complete the form below to request a dental appointment.</p>
          </div>

          {/* Stepper */}
          <div className="flex items-center justify-between mb-8 px-4">
            <div className={`flex flex-col items-center ${step >= 1 ? "text-blue-600" : "text-gray-400"}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${step >= 1 ? "border-blue-600 bg-blue-50" : "border-gray-300 bg-white"}`}>
                <User className="w-5 h-5" />
              </div>
              <span className="text-xs mt-2 font-medium">Personal Info</span>
            </div>
            <div className={`flex-grow h-0.5 mx-4 ${step >= 2 ? "bg-blue-600" : "bg-gray-300"}`}></div>
            <div className={`flex flex-col items-center ${step >= 2 ? "text-blue-600" : "text-gray-400"}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${step >= 2 ? "border-blue-600 bg-blue-50" : "border-gray-300 bg-white"}`}>
                <Calendar className="w-5 h-5" />
              </div>
              <span className="text-xs mt-2 font-medium">Details</span>
            </div>
            <div className={`flex-grow h-0.5 mx-4 ${step >= 3 ? "bg-blue-600" : "bg-gray-300"}`}></div>
            <div className={`flex flex-col items-center ${step >= 3 ? "text-blue-600" : "text-gray-400"}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${step >= 3 ? "border-blue-600 bg-blue-50" : "border-gray-300 bg-white"}`}>
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <span className="text-xs mt-2 font-medium">Confirmation</span>
            </div>
          </div>

          <Card className="shadow-xl border-0 overflow-hidden">
            <CardContent className="p-0">
              {step === 1 && (
                <div className="p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="firstName"
                          name="firstName"
                          placeholder="John"
                          className="pl-10"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="lastName"
                          name="lastName"
                          placeholder="Doe"
                          className="pl-10"
                          value={formData.lastName}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="phone"
                          name="phone"
                          type="tel"
                          placeholder="(555) 000-0000"
                          className="pl-10"
                          value={formData.phone}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address (Optional)</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="john.doe@example.com"
                          className="pl-10"
                          value={formData.email}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t flex justify-end">
                    <Button onClick={nextStep} className="bg-blue-600 hover:bg-blue-700">
                      Next Details <ChevronRight className="ml-2 w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="date">Preferred Date *</Label>
                      <Input
                        id="date"
                        name="date"
                        type="date"
                        value={formData.date}
                        min={formatDateToYYYYMMDD(new Date())}
                        onChange={(e) => {
                          const selectedDate = new Date(`${e.target.value}T00:00:00`);
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          
                          if (selectedDate < today) {
                            setDateError("Cannot select a past date");
                          } else {
                            setDateError("");
                          }
                          
                          setFormData(prev => ({ ...prev, date: e.target.value }));
                        }}
                        required
                      />
                      {dateError && <p className="text-red-500 text-xs">{dateError}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="time">Preferred Time *</Label>
                      <Select
                        value={formData.time ? TIME_SLOTS.indexOf(formData.time).toString() : ""}
                        onValueChange={(value) => {
                          const index = parseInt(value);
                          if (index >= 0) {
                            setFormData(prev => ({ ...prev, time: TIME_SLOTS[index] }));
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a time" />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_SLOTS.map((slot, index) => (
                            <SelectItem key={slot} value={index.toString()}>
                              {formatTimeTo12h(slot)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Appointment Type *</Label>
                      <Select
                        value={formData.type === -1 ? "" : formData.type.toString()}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, type: parseInt(value), customType: "" }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select reason for visit" />
                        </SelectTrigger>
                        <SelectContent>
                          {APPOINTMENT_TYPES.map((type, index) => (
                            <SelectItem key={index} value={index.toString()}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Preferred Doctor *</Label>
                      <Select
                        value={formData.doctor}
                        onValueChange={(value) => handleSelectChange("doctor", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingDoctors ? "Loading doctors..." : "Choose a doctor"} />
                        </SelectTrigger>
                        <SelectContent>
                          {doctors.map((doctor) => (
                            <SelectItem key={doctor.id} value={doctor.name}>
                              {doctor.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {formData.type === APPOINTMENT_TYPES.length - 1 && (
                    <div className="space-y-2">
                      <Label htmlFor="customType">Please Specify Type *</Label>
                      <Input
                        id="customType"
                        name="customType"
                        placeholder="Enter custom appointment type"
                        value={formData.customType}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      placeholder="Tell us about any specific concerns or symptoms..."
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows={4}
                    />
                  </div>

                  <div className="pt-6 border-t flex justify-between">
                    <Button variant="outline" onClick={prevStep} disabled={isSubmitting}>
                      Back
                    </Button>
                    <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Request Appointment"
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="p-12 text-center space-y-6">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
                    <CheckCircle2 className="w-10 h-10 text-green-600" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900">Request Received!</h2>
                  <p className="text-lg text-gray-600 max-w-md mx-auto">
                    Thank you, <span className="font-semibold">{formData.firstName}</span>. Your appointment request for{" "}
                    <span className="font-semibold">{formData.date}</span> at <span className="font-semibold">{formatTimeTo12h(formData.time)}</span> has been sent.
                  </p>
                  <p className="text-gray-500">
                    Our staff will review your request and contact you at <span className="font-semibold">{formData.phone}</span> shortly to confirm your booking.
                  </p>
                  <div className="pt-8">
                    <Button onClick={() => router.push("/")} className="bg-blue-600 hover:bg-blue-700 px-8 py-6 text-lg">
                      Return to Home
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="mt-8 text-center text-sm text-gray-500">
            <p>Need help? Call us at (555) 123-4567</p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
