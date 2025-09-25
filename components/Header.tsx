import { Button } from "./ui/button";
import { Phone, MapPin } from "lucide-react";

export function Header() {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-primary">
              SmileCare Dental
            </h1>
          </div>
          
          <nav className="hidden md:flex space-x-8">
            <a href="#home" className="text-gray-900 hover:text-primary transition-colors">
              Home
            </a>
            <a href="#services" className="text-gray-900 hover:text-primary transition-colors">
              Services
            </a>
            <a href="#about" className="text-gray-900 hover:text-primary transition-colors">
              About
            </a>
            <a href="#team" className="text-gray-900 hover:text-primary transition-colors">
              Team
            </a>
            <a href="#contact" className="text-gray-900 hover:text-primary transition-colors">
              Contact
            </a>
          </nav>
          
          <div className="flex items-center space-x-4">
            <div className="hidden lg:flex items-center space-x-2 text-sm text-gray-600">
              <Phone className="h-4 w-4" />
              <span>(555) 123-4567</span>
            </div>
            <Button className="bg-primary hover:bg-primary/90">
              Book Appointment
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}