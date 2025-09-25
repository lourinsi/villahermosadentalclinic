import { Card, CardContent } from "./ui/card";
import { Star, Quote } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

const testimonials = [
  {
    name: "Jennifer Martinez",
    role: "Mother of Two",
    content: "Dr. Johnson and her team are absolutely amazing! They made my children feel comfortable during their first visit, and now they actually look forward to going to the dentist. The office is modern and clean, and the staff is incredibly friendly.",
    rating: 5,
    image: "https://images.unsplash.com/photo-1684607631635-44399dee5ac9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYXBweSUyMHBhdGllbnQlMjBkZW50YWwlMjB2aXNpdHxlbnwxfHx8fDE3NTg3MjExNTV8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  },
  {
    name: "Robert Thompson",
    role: "Business Owner",
    content: "I was terrified of dental procedures, but Dr. Chen's gentle approach and clear explanations put me at ease. The root canal I thought would be painful was completely comfortable. I can't recommend this practice enough!",
    rating: 5,
    image: "https://images.unsplash.com/photo-1684607631635-44399dee5ac9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYXBweSUyMHBhdGllbnQlMjBkZW50YWwlMjB2aXNpdHxlbnwxfHx8fDE3NTg3MjExNTV8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  },
  {
    name: "Maria Garcia",
    role: "Teacher",
    content: "The smile makeover I received has completely changed my confidence. Dr. Johnson listened to exactly what I wanted and delivered beyond my expectations. The entire process was smooth and professional.",
    rating: 5,
    image: "https://images.unsplash.com/photo-1684607631635-44399dee5ac9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYXBweSUyMHBhdGllbnQlMjBkZW50YWwlMjB2aXNpdHxlbnwxfHx8fDE3NTg3MjExNTV8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  }
];

export function Testimonials() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">
            What Our Patients Say
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Don't just take our word for it. Here's what our patients have to say 
            about their experience with SmileCare Dental.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="h-full hover:shadow-lg transition-shadow duration-300">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <Quote className="h-8 w-8 text-gray-300" />
                </div>
                
                <p className="text-gray-700 leading-relaxed">
                  "{testimonial.content}"
                </p>
                
                <div className="flex items-center space-x-3 pt-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden">
                    <ImageWithFallback
                      src={testimonial.image}
                      alt={testimonial.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-600">{testimonial.role}</div>
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