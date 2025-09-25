import { Card, CardContent } from "./ui/card";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { GraduationCap, Award, Calendar } from "lucide-react";

const teamMembers = [
  {
    name: "Dr. Sarah Johnson",
    role: "Lead Dentist & Practice Owner",
    education: "DDS, Harvard School of Dental Medicine",
    experience: "15+ years",
    specialties: ["Cosmetic Dentistry", "Implants", "Orthodontics"],
    image: "https://images.unsplash.com/photo-1565090567208-c8038cfcf6cd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBkZW50aXN0JTIwc21pbGluZ3xlbnwxfHx8fDE3NTg3MDMxNjd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  },
  {
    name: "Dr. Michael Chen",
    role: "Associate Dentist",
    education: "DDS, UCSF School of Dentistry",
    experience: "8+ years",
    specialties: ["Endodontics", "Oral Surgery", "Preventive Care"],
    image: "https://images.unsplash.com/photo-1565090567208-c8038cfcf6cd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBkZW50aXN0JTIwc21pbGluZ3xlbnwxfHx8fDE3NTg3MDMxNjd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  },
  {
    name: "Dr. Emily Rodriguez",
    role: "Pediatric Dentist",
    education: "DDS, Columbia University",
    experience: "6+ years",
    specialties: ["Pediatric Dentistry", "Special Needs", "Preventive Care"],
    image: "https://images.unsplash.com/photo-1565090567208-c8038cfcf6cd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBkZW50aXN0JTIwc21pbGluZ3xlbnwxfHx8fDE3NTg3MDMxNjd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  }
];

export function Team() {
  return (
    <section id="team" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">
            Meet Our Expert Team
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Our experienced team of dental professionals is dedicated to providing 
            you with the highest quality care in a comfortable, friendly environment.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {teamMembers.map((member, index) => (
            <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
              <div className="aspect-square overflow-hidden">
                <ImageWithFallback
                  src={member.image}
                  alt={member.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="p-6 space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{member.name}</h3>
                  <p className="text-primary font-medium">{member.role}</p>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <GraduationCap className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-600">{member.education}</span>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-gray-500 flex-shrink-0" />
                    <span className="text-sm text-gray-600">{member.experience}</span>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <Award className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-gray-600">
                      <div className="font-medium mb-1">Specialties:</div>
                      <div className="space-y-1">
                        {member.specialties.map((specialty, specialtyIndex) => (
                          <div key={specialtyIndex} className="flex items-center space-x-2">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                            <span>{specialty}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}