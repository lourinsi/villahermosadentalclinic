import { ImageWithFallback } from "./figma/ImageWithFallback";
import { CheckCircle, Users, Calendar, Award } from "lucide-react";

const stats = [
  {
    icon: Users,
    number: "5,000+",
    label: "Happy Patients"
  },
  {
    icon: Calendar,
    number: "15+",
    label: "Years Experience"
  },
  {
    icon: Award,
    number: "10+",
    label: "Awards Won"
  },
  {
    icon: CheckCircle,
    number: "99%",
    label: "Success Rate"
  }
];

const features = [
  "State-of-the-art dental technology",
  "Comfortable and relaxing environment",
  "Flexible payment options and insurance accepted",
  "Convenient scheduling and online booking",
  "Emergency dental care available",
  "Comprehensive treatment planning"
];

export function About() {
  return (
    <section id="about" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">
                About SmileCare Dental
              </h2>
              <p className="text-lg text-gray-600">
                For over 15 years, SmileCare Dental has been providing exceptional dental care 
                to families in our community. We combine advanced technology with a gentle, 
                personalized approach to ensure every patient receives the highest quality care.
              </p>
              <p className="text-gray-600">
                Our mission is to help you achieve and maintain optimal oral health while 
                creating beautiful, confident smiles that last a lifetime. We believe that 
                quality dental care should be accessible, comfortable, and stress-free.
              </p>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900">Why Choose Us?</h3>
              <div className="grid grid-cols-1 gap-3">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="space-y-8">
            <div className="rounded-2xl overflow-hidden shadow-xl">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1642844819197-5f5f21b89ff8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkZW50YWwlMjBlcXVpcG1lbnQlMjBtb2Rlcm58ZW58MXx8fHwxNzU4NjQ3NDAwfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="Modern dental equipment"
                className="w-full h-80 object-cover"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <stat.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{stat.number}</div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}