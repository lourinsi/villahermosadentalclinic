"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Users,
  Stethoscope,
  Settings,
  ArrowRight,
  Heart,
  Clock,
  Shield,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-20 px-4 md:px-8">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Welcome to Villahermosa Dental Clinic
          </h1>
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            Your trusted partner in dental health and wellness. We provide
            comprehensive dental care with the latest technology and highly
            skilled professionals.
          </p>
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <Button
              onClick={() => router.push("/login")}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg"
            >
              Patient Login <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button
              onClick={() => router.push("/admin/login")}
              variant="outline"
              size="lg"
              className="border-2 px-8 py-6 text-lg"
            >
              Admin Login <Settings className="ml-2 w-5 h-5" />
            </Button>
            <Button
              onClick={() => router.push("/doctor/login")}
              variant="outline"
              size="lg"
              className="border-2 px-8 py-6 text-lg"
            >
              Doctor Login <Stethoscope className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 md:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-900">
            Why Choose Us
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border border-gray-200 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="text-center">
                <Heart className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <CardTitle>Patient Care</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-center">
                  We prioritize your comfort and health with personalized
                  treatment plans tailored to your specific needs.
                </p>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="text-center">
                <Clock className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                <CardTitle>Easy Scheduling</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-center">
                  Schedule appointments online with our convenient booking
                  system. Flexible hours to fit your lifestyle.
                </p>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="text-center">
                <Shield className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <CardTitle>Advanced Technology</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-center">
                  We use state-of-the-art dental equipment and techniques to
                  provide the highest quality care.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 px-4 md:px-8 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-900">
            Our Services
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              "General Dentistry",
              "Cosmetic Dentistry",
              "Orthodontics",
              "Implants",
              "Root Canal Therapy",
              "Teeth Whitening",
              "Periodontal Care",
              "Emergency Care",
            ].map((service, index) => (
              <div
                key={index}
                className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200"
              >
                <h3 className="font-semibold text-gray-900 mb-2">{service}</h3>
                <p className="text-gray-600 text-sm">
                  Professional care for your dental health
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 md:px-8 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Smile Again?</h2>
          <p className="text-lg mb-8 opacity-90">
            Schedule your appointment today and experience excellent dental care
          </p>
          <Button
            onClick={() => router.push("/login")}
            size="lg"
            className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-6 text-lg font-semibold"
          >
            Book an Appointment <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
 