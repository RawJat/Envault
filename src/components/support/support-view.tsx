"use client";

import { Link } from "next-view-transitions";
import {
  Book,
  MessageCircle,
  Activity,
  Mail,
  Github,
  Twitter,
  ExternalLink,
  HelpCircle,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

const faqs = [
  {
    question: "What is Envault?",
    answer:
      "Envault is a secure, zero-knowledge environment variable management platform designed for modern development teams. It allows you to safely store, share, and sync your secrets across your team and infrastructure.",
  },
  {
    question: "How secure is my data?",
    answer:
      "Extremely secure. Envault employs end-to-end encryption using AES-256-GCM. Your secrets are encrypted client-side before ever reaching our servers, meaning even we cannot read your environment variables.",
  },
  {
    question: "Can I self-host Envault?",
    answer:
      "Yes, Envault is completely open-source. You can clone the repository from GitHub and deploy it to your own infrastructure (like Vercel, Supabase, or custom servers) for complete control over your data.",
  },
  {
    question: "How does team collaboration work?",
    answer:
      "You can invite team members to your projects and assign them roles (Owner, Editor, Viewer). Access to specific environment variables is strictly controlled through our role-based access control system.",
  },
  {
    question: "What integrations are supported?",
    answer:
      "Envault provides a powerful CLI for your local development workflow. We also provide seamless integration with major CI/CD providers through our native plugins and API.",
  },
];

interface SupportViewProps {
  inDashboard?: boolean;
}

export function SupportView({ inDashboard = false }: SupportViewProps) {
  return (
    <div className="max-w-4xl mx-auto w-full space-y-12">
      {!inDashboard && (
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight font-serif bg-clip-text text-transparent bg-gradient-to-r from-foreground to-muted-foreground">
            How can we help?
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to manage your secrets securely, resolve issues,
            and get the most out of Envault.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Documentation Card */}
        <Link href="/docs" className="group block h-full">
          <div className="h-full border bg-card text-card-foreground rounded-xl p-6 transition-all hover:shadow-md hover:border-primary/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0">
              <ExternalLink className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Book className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
              Documentation
            </h3>
            <p className="text-muted-foreground">
              Learn how to integrate Envault into your workflow, install the
              CLI, and manage team permissions.
            </p>
          </div>
        </Link>

        {/* Community Card */}
        <div className="border bg-card text-card-foreground rounded-xl p-6 h-full transition-all hover:shadow-md hover:border-sidebar-primary/50">
          <div className="w-12 h-12 rounded-lg bg-sidebar-primary/10 flex items-center justify-center mb-4">
            <MessageCircle className="w-6 h-6 text-sidebar-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Community</h3>
          <p className="text-muted-foreground mb-4">
            Join our open-source community to discuss features, report bugs, and
            contribute to Envault.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" asChild className="gap-2">
              <Link
                href="https://github.com/dinanathdash/envault"
                target="_blank"
              >
                <Github className="w-4 h-4" /> GitHub
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild className="gap-2">
              <Link href="https://twitter.com/dinanathdash" target="_blank">
                <Twitter className="w-4 h-4" /> Twitter
              </Link>
            </Button>
          </div>
        </div>

        {/* Status Card */}
        <Link href="/status" className="group block h-full">
          <div className="h-full border bg-card text-card-foreground rounded-xl p-6 transition-all hover:shadow-md hover:border-green-500/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0">
              <ExternalLink className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center mb-4">
              <Activity className="w-6 h-6 text-green-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
              System Status
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
            </h3>
            <p className="text-muted-foreground">
              Check the real-time status of Envault&apos;s API, dashboard, and
              CLI services.
            </p>
          </div>
        </Link>

        {/* Contact Card */}
        <a
          href="mailto:dashdinanath056@gmail.com"
          className="group block h-full"
        >
          <div className="h-full border bg-card text-card-foreground rounded-xl p-6 transition-all hover:shadow-md hover:border-blue-500/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0">
              <ExternalLink className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
              <Mail className="w-6 h-6 text-blue-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Contact Support</h3>
            <p className="text-muted-foreground">
              Need direct assistance? Email our team and we&apos;ll get back to
              you as soon as possible.
            </p>
          </div>
        </a>
      </div>

      {/* FAQs Section */}
      <div className="pt-8 border-t">
        <div className="flex items-center gap-2 mb-6">
          <HelpCircle className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
        </div>
        <div className="border bg-card rounded-xl p-1">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="px-5 border-b-0"
              >
                <AccordionTrigger className="text-left font-medium hover:no-underline py-4">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed pb-4">
                  {faq.answer}
                </AccordionContent>
                {index !== faqs.length - 1 && (
                  <div className="h-px bg-border w-full" />
                )}
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </div>
  );
}
