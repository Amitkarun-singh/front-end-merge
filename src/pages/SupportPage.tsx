import { useState } from "react";
import {
  Mail,
  Phone,
  MapPin,
  Send,
  MessageSquare,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const faqs = [
  {
    question: "How do I get started with Schools2AI?",
    answer:
      "Simply sign up for a free account and start exploring our AI-powered study tools. You can access AI Gini for homework help, generate notes, take practice tests, and more!",
  },
  {
    question: "Is Schools2AI free to use?",
    answer:
      "We offer a free tier with basic features. For unlimited access to all AI tools and premium features, check out our subscription plans.",
  },
  {
    question: "Which subjects are supported?",
    answer:
      "Currently, we support Mathematics, Science, English, and Social Studies for classes 9-12 following CBSE, ICSE, and major state board curricula.",
  },
  {
    question: "How accurate is the AI?",
    answer:
      "Our AI models are trained on verified educational content and regularly updated. While highly accurate, we recommend using it as a learning aid alongside your regular studies.",
  },
];

export default function SupportPage() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Hero Section */}
      <section className="py-12 px-6 gradient-hero text-center">
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-card text-sm text-primary mb-4">
          <MessageSquare className="w-4 h-4" />
          Get in Touch
        </span>
        <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
          Let's <span className="text-gradient">Connect</span>
        </h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Have questions? Want a demo? We'd love to hear from you.
        </p>
      </section>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div className="edtech-card">
            <h2 className="font-display text-xl font-semibold text-foreground mb-6">
              Send us a Message
            </h2>
            <form className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Your Name
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="john@example.com"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Subject
                </label>
                <Input
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData({ ...formData, subject: e.target.value })
                  }
                  placeholder="How can we help?"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Your Message
                </label>
                <Textarea
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  placeholder="Tell us more about your inquiry..."
                  className="min-h-[150px]"
                />
              </div>
              <Button className="w-full gradient-button">
                <Send className="w-4 h-4 mr-2" />
                Send Message
              </Button>
            </form>
          </div>

          {/* Contact Info */}
          <div className="space-y-6">
            <div className="edtech-card">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Email Us</h3>
                  <p className="text-muted-foreground">
                    support@schools2ai.com
                  </p>
                </div>
              </div>
            </div>

            <div className="edtech-card">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Call Us</h3>
                  <p className="text-muted-foreground">+91 9762158738</p>
                </div>
              </div>
            </div>

            <div className="edtech-card">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-chart-4/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-6 h-6 text-chart-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Visit Us</h3>
                  <p className="text-muted-foreground">Bangalore, India</p>
                </div>
              </div>
            </div>

            {/* FAQs */}
            <div className="edtech-card">
              <div className="flex items-center gap-3 mb-4">
                <HelpCircle className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">
                  Frequently Asked Questions
                </h3>
              </div>
              <div className="space-y-3">
                {faqs.map((faq, index) => (
                  <div
                    key={index}
                    className="border border-border rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() =>
                        setExpandedFaq(expandedFaq === index ? null : index)
                      }
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
                    >
                      <span className="font-medium text-foreground text-sm">
                        {faq.question}
                      </span>
                      {expandedFaq === index ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                    {expandedFaq === index && (
                      <div className="px-4 pb-4 text-sm text-muted-foreground animate-fade-in">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
