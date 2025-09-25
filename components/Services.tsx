import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Shield, Sparkles, Heart, Zap, Smile, Users } from "lucide-react";

const services = [
  {
    icon: Shield,
    title: "Preventive Care",
    description: "Regular cleanings, exams, and X-rays to keep your teeth and gums healthy.",
    features: ["Dental Cleanings", "Oral Exams", "X-Rays", "Fluoride Treatments"]
  },
  {
    icon: Sparkles,
    title: "Cosmetic Dentistry",
    description: "Transform your smile with our advanced cosmetic dental treatments.",
    features: ["Teeth Whitening", "Veneers", "Bonding", "Smile Makeovers"]
  },
  {
    icon: Heart,
    title: "Restorative Care",
    description: "Repair and restore damaged teeth to their natural function and appearance.",
    features: ["Fillings", "Crowns", "Bridges", "Root Canals"]
  },
  {
    icon: Zap,
    title: "Emergency Care",
    description: "Immediate dental care when you need it most, including after-hours service.",
    features: ["Same-Day Appointments", "Pain Relief", "Trauma Care", "24/7 Support"]
  },
  {
    icon: Smile,
    title: "Orthodontics",
    description: "Straighten your teeth with traditional braces or modern clear aligners.",
    features: ["Traditional Braces", "Clear Aligners", "Retainers", "Bite Correction"]
  },
  {
    icon: Users,
    title: "Family Dentistry",
    description: "Comprehensive dental care for patients of all ages in a comfortable environment.",
    features: ["Pediatric Care", "Adult Dentistry", "Senior Care", "Special Needs"]
  }
];

export function Services() {
  return (
    <section id="services" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">
            Comprehensive Dental Services
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            From routine cleanings to complex procedures, we offer a full range of dental services 
            to keep your smile healthy and beautiful.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <Card key={index} className="h-full hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <service.icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">{service.title}</CardTitle>
                <CardDescription className="text-gray-600">
                  {service.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {service.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}