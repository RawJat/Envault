import { LegalLayout } from "@/components/legal/LegalLayout";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Licensing",
  description:
    "Learn about Envault's Functional Source License (FSL) and what it means for you.",
  openGraph: {
    siteName: "Envault",
    images: ["/open-graph/Licensing.png"],
  },
};

const sections = [
  { id: "overview", title: "Overview" },
  { id: "fsl-what", title: "What is FSL?" },
  { id: "what-you-can-do", title: "What You Can Do" },
  { id: "what-you-cannot-do", title: "What You Cannot Do" },
  { id: "mit-conversion", title: "MIT License Conversion" },
  { id: "self-hosting", title: "Self-Hosting & Internal Use" },
  { id: "faq", title: "Frequently Asked Questions" },
];

export default async function LicensingPage() {
  return (
    <LegalLayout
      title="Licensing"
      lastUpdated="9 March 2026"
      sections={sections}
    >
      <section
        id="overview"
        className="scroll-mt-28 mb-12 pb-8 border-b border-border/30"
      >
        <h2 className="text-2xl font-semibold mb-4 font-serif">Overview</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Envault is licensed under the{" "}
          <strong>Functional Source License (FSL), Version 1.1-MIT</strong>.
          This source-available license allows you to read, audit, and self-host
          the code while protecting our ability to offer competing commercial
          services.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          After <strong>24 months</strong> from each release date, the code
          automatically converts to the permissive <strong>MIT License</strong>,
          giving you complete freedom.
        </p>
      </section>

      <section
        id="fsl-what"
        className="scroll-mt-28 mb-12 pb-8 border-b border-border/30"
      >
        <h2 className="text-2xl font-semibold mb-4 font-serif">What is FSL?</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          The Functional Source License (FSL) is a source-available license that
          bridges open source and proprietary software. It allows anyone to:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6 leading-relaxed">
          <li>Read and review the source code for security auditing</li>
          <li>Deploy and self-host for internal, non-commercial use</li>
          <li>Modify the code for your own internal purposes</li>
          <li>Learn from and contribute to the codebase</li>
        </ul>
        <p className="text-muted-foreground leading-relaxed">
          Unlike traditional open-source licenses, FSL restricts commercial
          competitors from offering Envault as a service without permission.
        </p>
      </section>

      <section
        id="what-you-can-do"
        className="scroll-mt-28 mb-12 pb-8 border-b border-border/30"
      >
        <h2 className="text-2xl font-semibold mb-4 font-serif">
          What You Can Do
        </h2>
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-6 space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <h3 className="font-semibold text-foreground">Self-Host</h3>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Deploy Envault on your own infrastructure for your team&apos;s
              use.
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <h3 className="font-semibold text-foreground">
                Audit for Security
              </h3>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Review the source code, conduct security audits, and verify
              encryption implementations.
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <h3 className="font-semibold text-foreground">Internal Use</h3>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Use Envault for your organization&apos;s internal secret
              management needs.
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <h3 className="font-semibold text-foreground">
                Modify for Your Needs
              </h3>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Customize the code to integrate with your specific systems and
              workflows.
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <h3 className="font-semibold text-foreground">Use the CLI</h3>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Freely use and distribute the Envault CLI with your applications.
            </p>
          </div>
        </div>
      </section>

      <section
        id="what-you-cannot-do"
        className="scroll-mt-28 mb-12 pb-8 border-b border-border/30"
      >
        <h2 className="text-2xl font-semibold mb-4 font-serif">
          What You Cannot Do
        </h2>
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-6 space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
              <h3 className="font-semibold text-foreground">
                Offer as a Competing Commercial Service
              </h3>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              You cannot use Envault&apos;s code to offer a competing SaaS,
              managed service, or commercial product that competes directly with
              Envault.
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
              <h3 className="font-semibold text-foreground">
                Remove License Headers
              </h3>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              You cannot remove or alter copyright notices, license text, or
              proprietary markings.
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
              <h3 className="font-semibold text-foreground">
                Sublicense or Redistribute
              </h3>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              You cannot sublicense, transfer, or commercialize the Licensed
              Work to third parties.
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
              <h3 className="font-semibold text-foreground">
                Use Commercially (Pre-Conversion)
              </h3>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Before the 24-month conversion date, you cannot use Envault&apos;s
              code for any commercial competing service.
            </p>
          </div>
        </div>
      </section>

      <section
        id="mit-conversion"
        className="scroll-mt-28 mb-12 pb-8 border-b border-border/30"
      >
        <h2 className="text-2xl font-semibold mb-4 font-serif">
          MIT License Conversion (24-Month Window)
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Envault&apos;s source code is not permanently proprietary. Each
          version automatically converts to the fully permissive{" "}
          <strong>MIT License</strong> after <strong>24 months</strong> from its
          release date.
        </p>
        <div className="bg-accent/30 border border-border/50 rounded-lg p-6 mb-4">
          <h3 className="font-semibold text-foreground mb-3">
            Timeline Example
          </h3>
          <ul className="space-y-2 text-muted-foreground text-sm">
            <li>
              <strong>March 9, 2026</strong>: Version 1.0 released under FSL
            </li>
            <li>
              <strong>March 9, 2028</strong>: Version 1.0 converts to MIT
              automatically
            </li>
            <li className="text-emerald-600 dark:text-emerald-400">
              After conversion: You can use it for any purpose, including
              commercial competing services
            </li>
          </ul>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          This conversion is automatic-you don&apos;t need to do anything. We
          believe in the long-term openness of Envault while protecting it
          during its initial growth phase.
        </p>
      </section>

      <section
        id="self-hosting"
        className="scroll-mt-28 mb-12 pb-8 border-b border-border/30"
      >
        <h2 className="text-2xl font-semibold mb-4 font-serif">
          Self-Hosting & Internal Use
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          You are explicitly welcome and encouraged to self-host Envault for
          your organization. Self-hosting is one of the core use cases FSL
          enables.
        </p>
        <div className="bg-accent/30 border border-border/50 rounded-lg p-6 space-y-3">
          <h3 className="font-semibold text-foreground">
            Permitted Self-Hosting Scenarios
          </h3>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-relaxed">
            <li>
              <strong>Internal company use:</strong> Deploy Envault to manage
              secrets across teams
            </li>
            <li>
              <strong>Client services (non-competing):</strong> Use Envault as
              part of your consulting or implementation services to end clients
            </li>
            <li>
              <strong>Internal business tools:</strong> Integrate Envault into
              your infrastructure
            </li>
            <li>
              <strong>Custom deployments:</strong> Deploy for specific
              organizational needs
            </li>
          </ul>
        </div>
      </section>

      <section
        id="faq"
        className="scroll-mt-28 mb-12 pb-8 border-b border-border/30"
      >
        <h2 className="text-2xl font-semibold mb-4 font-serif">
          Frequently Asked Questions
        </h2>

        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-foreground mb-2">
              Can I use Envault for my SaaS product?
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              If your product directly competes with Envault&apos;s secret
              management service, you cannot use Envault&apos;s code under FSL.
              If your SaaS uses Envault internally or as a component of a
              non-competing service, you may need a commercial license. Contact
              us at{" "}
              <a
                href="mailto:dashdinanath056@gmail.com"
                className="font-mono text-sm text-foreground hover:text-primary transition-colors underline underline-offset-4"
              >
                dashdinanath056@gmail.com
              </a>{" "}
              to discuss licensing options.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-2">
              When does my version convert to MIT?
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Each released version converts to MIT automatically 24 months
              after its release date. The conversion happens retroactively, so
              you can use older versions under MIT terms after the conversion
              date passes.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-2">
              Can I modify Envault for my internal use?
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Yes, absolutely. You can fork, modify, and customize Envault for
              your internal needs. You cannot redistribute your modified version
              as a commercial service, but using it internally is fully allowed.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-2">
              What if I want to offer Envault as a service?
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              We offer commercial licenses for partners who want to embed or
              offer Envault. Please contact us at{" "}
              <a
                href="mailto:dashdinanath056@gmail.com"
                className="font-mono text-sm text-foreground hover:text-primary transition-colors underline underline-offset-4"
              >
                dashdinanath056@gmail.com
              </a>{" "}
              to discuss partnership and commercial licensing opportunities.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-2">
              Can I audit the code for security?
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Yes, security auditing is explicitly encouraged. We believe in the
              security-through-publicity model, and you&apos;re welcome to
              review the code, run security scans, and report vulnerabilities.
              Please responsibly disclose any security issues to our team.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-2">
              Is FSL &quot;open source&quot;?
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              FSL is <strong>source-available</strong>, not &quot;open
              source&quot; as defined by the Open Source Initiative. The source
              is public and you have significant rights, but commercial
              restrictions apply. After the 24-month conversion, it becomes
              fully open source (MIT).
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-2">
              Can I contribute to Envault?
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              We welcome community contributions, suggestions, and feedback.
              Please reach out to us for collaboration opportunities. Note that
              contributions will be licensed under the FSL.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-2">
              Where can I find the full license?
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              The complete FSL text is available in the{" "}
              <Link
                href="/LICENSE"
                className="font-mono text-sm text-foreground hover:text-primary transition-colors underline underline-offset-4"
              >
                LICENSE
              </Link>{" "}
              file in the project root and on{" "}
              <a
                href="https://github.com/DinanathDash/Envault/blob/main/LICENSE"
                className="font-mono text-sm text-foreground hover:text-primary transition-colors underline underline-offset-4"
              >
                GitHub
              </a>
              .
            </p>
          </div>
        </div>
      </section>

      <section id="contact" className="scroll-mt-28 mb-12">
        <h2 className="text-2xl font-semibold mb-4 font-serif">
          Questions About Licensing?
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          If you have specific questions about licensing, commercial
          arrangements, or need clarification on what you can use Envault for,
          please don&apos;t hesitate to reach out.
        </p>
        <a
          href="mailto:dashdinanath056@gmail.com"
          className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-none hover:bg-primary/90 transition-colors font-medium"
        >
          Contact Us
        </a>
      </section>
    </LegalLayout>
  );
}
