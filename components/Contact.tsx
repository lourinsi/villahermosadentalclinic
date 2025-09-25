import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { MapPin, Phone, Mail, Clock, Calendar } from "lucide-react";

const contactInfo = [
  {
    icon: MapPin,
    title: "Address",
    details: ["123 Main Street", "Downtown, CA 90210"]
  },
  {
    icon: Phone,
    title: "Phone",
    details: ["(555) 123-4567", "Emergency: (555) 123-4568"]
  },
  {
    icon: Mail,
    title: "Email",
    details: ["info@smilecaredental.com", "appointments@smilecaredental.com"]
  },
  {
    icon: Clock,
    title: "Hours",
    details: ["Mon-Fri: 8:00 AM - 6:00 PM", "Sat: 9:00 AM - 3:00 PM", "Sun: Closed"]
  }
];

export function Contact() {
  return (
    <section id="contact" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">
            Get In Touch
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Ready to schedule your appointment? Contact us today and take the first step 
            towards a healthier, more beautiful smile.
          </p>
        </div>
        
        <div className="grid lg:grid-cols-2 gap-12">
          <div className="space-y-8">
            <div className="grid sm:grid-cols-2 gap-6">
              {contactInfo.map((info, index) => (
                <Card key={index} className="h-full">
                  <CardHeader className="pb-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                      <info.icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{info.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-1">
                      {info.details.map((detail, detailIndex) => (
                        <p key={detailIndex} className="text-gray-600 text-sm">
                          {detail}
                        </p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <Card className="bg-primary text-white">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Calendar className="h-6 w-6" />
                  <h3 className="text-xl font-semibold">Book Online</h3>
                </div>
                <p className="mb-4 text-blue-100">
                  Schedule your appointment online 24/7 for your convenience.
                </p>
                <Button variant="secondary" className="w-full">
                  Online Booking
                </Button>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Send Us a Message</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">First Name</label>
                  <Input placeholder="John" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Last Name</label>
                  <Input placeholder="Doe" />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input type="email" placeholder="john.doe@example.com" />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone</label>
                <Input type="tel" placeholder="(555) 123-4567" />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Service Interested In</label>
                <Input placeholder="e.g., Teeth Cleaning, Cosmetic Dentistry" />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Message</label>
                <Textarea 
                  placeholder="Tell us about your dental needs or any questions you have..."
                  rows={4}
                />
              </div>
              
              <Button className="w-full bg-primary hover:bg-primary/90">
                Send Message
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}