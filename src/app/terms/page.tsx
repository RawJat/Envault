import { LegalLayout } from "@/components/legal/LegalLayout"

const sections = [
    { id: "agreement", title: "Agreement to Terms" },
    { id: "accounts", title: "Accounts" },
    { id: "intellectual-property", title: "Intellectual Property" },
    { id: "user-responsibilities", title: "User Responsibilities & Encryption" },
    { id: "cli-usage", title: "CLI Usage Terms" },
    { id: "team-collaboration", title: "Team Collaboration" },
    { id: "key-management", title: "Key Management & Security" },
    { id: "notifications", title: "Notifications & Communications" },
    { id: "third-party-links", title: "Links To Other Web Sites" },
    { id: "termination", title: "Termination" },
    { id: "liability", title: "Limitation of Liability" },
    { id: "disclaimer", title: "Disclaimer" },
    { id: "governing-law", title: "Governing Law" },
    { id: "changes", title: "Changes" },
    { id: "contact", title: "Contact Us" },
]

export default function TermsPage() {
    return (
        <LegalLayout
            title="Terms of Service"
            lastUpdated="07 February 2026"
            sections={sections}
        >
            <section id="agreement" className="scroll-mt-28 mb-12 pb-8 border-b border-border/30">
                <h2 className="text-2xl font-semibold mb-4 font-serif">1. Agreement to Terms</h2>
                <p className="text-muted-foreground leading-relaxed">
                    By accessing or using Envault (&quot;Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;).
                    If you disagree with any part of the terms, then you may not access the Service. These Terms apply to all visitors, users, and others who access or use the Service.
                </p>
            </section>

            <section id="accounts" className="scroll-mt-28 mb-12 pb-8 border-b border-border/30">
                <h2 className="text-2xl font-semibold mb-4 font-serif">2. Accounts</h2>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                    When you create an account with us, you must provide us information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                    You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password, whether your password is with our Service or a third-party service.
                    You agree not to disclose your password to any third party. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.
                </p>
            </section>

            <section id="intellectual-property" className="scroll-mt-28 mb-12 pb-8 border-b border-border/30">
                <h2 className="text-2xl font-semibold mb-4 font-serif">3. Intellectual Property</h2>
                <p className="text-muted-foreground leading-relaxed">
                    The Service and its original content (excluding Content provided by users), features and functionality are and will remain the exclusive property of Envault and its licensors.
                    The Service is protected by copyright, trademark, and other laws of both the United States and foreign countries.
                    Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of Envault.
                </p>
            </section>

            <section id="user-responsibilities" className="scroll-mt-28 mb-12 pb-8 border-b border-border/30">
                <h2 className="text-2xl font-semibold mb-4 font-serif">4. User Responsibilities & Encryption</h2>
                <div className="bg-accent/30 border border-border/50 rounded-lg p-6 mb-4">
                    <p className="text-muted-foreground leading-relaxed mb-4">
                        Envault provides tools for encrypting and managing environment variables. However, security is a shared responsibility.
                    </p>
                    <ul className="list-disc pl-6 space-y-3 text-muted-foreground">
                        <li className="leading-relaxed">You are responsible for managing your encryption keys and recovery phrases.</li>
                        <li className="leading-relaxed">
                            If you lose your encryption key, we <strong className="text-foreground font-mono text-sm">cannot</strong> recover your data, as we do not store your private keys in plain text.
                        </li>
                        <li className="leading-relaxed">You agree not to use the Service to store illegal or malicious content.</li>
                        <li className="leading-relaxed">You are responsible for maintaining the confidentiality of your account credentials and API keys.</li>
                        <li className="leading-relaxed">You must promptly notify us of any unauthorized access to your account or suspected security breaches.</li>
                    </ul>
                </div>
            </section>

            <section id="cli-usage" className="scroll-mt-28 mb-12 pb-8 border-b border-border/30">
                <h2 className="text-2xl font-semibold mb-4 font-serif">5. CLI Usage Terms</h2>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                    Envault provides a Command Line Interface (CLI) tool for managing secrets directly from your terminal. By using the CLI, you agree to the following terms:
                </p>
                <ul className="list-disc pl-6 space-y-3 text-muted-foreground">
                    <li className="leading-relaxed">The CLI may collect anonymous usage statistics to improve the service, which can be disabled in your account settings.</li>
                    <li className="leading-relaxed">You are responsible for securing your local environment when using the CLI, including protecting your authentication tokens.</li>
                    <li className="leading-relaxed">CLI operations that modify secrets require appropriate project permissions (Owner, Editor roles).</li>
                    <li className="leading-relaxed">Bulk operations via CLI should be used responsibly to avoid overwhelming the service.</li>
                    <li className="leading-relaxed">You agree not to use the CLI for automated scraping or unauthorized data extraction.</li>
                </ul>
            </section>

            <section id="team-collaboration" className="scroll-mt-28 mb-12 pb-8 border-b border-border/30">
                <h2 className="text-2xl font-semibold mb-4 font-serif">6. Team Collaboration</h2>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                    Envault enables secure team collaboration through project sharing and role-based access control. When participating in team features:
                </p>
                <ul className="list-disc pl-6 space-y-3 text-muted-foreground">
                    <li className="leading-relaxed">Project owners have ultimate control over project membership and can revoke access at any time.</li>
                    <li className="leading-relaxed">You are responsible for the actions of team members you invite to projects you own.</li>
                    <li className="leading-relaxed">Role assignments (Owner, Editor, Viewer) determine what actions team members can perform.</li>
                    <li className="leading-relaxed">You agree to use team features only for legitimate collaboration purposes.</li>
                    <li className="leading-relaxed">Disputes over project ownership or access should be resolved through direct communication with project owners.</li>
                </ul>
            </section>

            <section id="key-management" className="scroll-mt-28 mb-12 pb-8 border-b border-border/30">
                <h2 className="text-2xl font-semibold mb-4 font-serif">7. Key Management & Security</h2>
                <div className="bg-accent/30 border border-border/50 rounded-lg p-6 mb-4">
                    <p className="text-muted-foreground leading-relaxed mb-4">
                        Envault uses a hierarchical encryption system with master keys and data keys. Your responsibilities include:
                    </p>
                    <ul className="list-disc pl-6 space-y-3 text-muted-foreground">
                        <li className="leading-relaxed">Master keys are used only for encrypting/decrypting data keys and must be stored securely.</li>
                        <li className="leading-relaxed">Data keys are rotated periodically for enhanced security; this process is automated but may require your attention.</li>
                        <li className="leading-relaxed">If you suspect key compromise, you must immediately rotate keys and update all affected secrets.</li>
                        <li className="leading-relaxed">Key rotation operations may temporarily impact service availability.</li>
                        <li className="leading-relaxed">You acknowledge that improper key management could result in permanent data loss.</li>
                    </ul>
                </div>
            </section>

            <section id="notifications" className="scroll-mt-28 mb-12 pb-8 border-b border-border/30">
                <h2 className="text-2xl font-semibold mb-4 font-serif">8. Notifications & Communications</h2>
                <p className="text-muted-foreground leading-relaxed">
                    Envault provides notification features for team collaboration, security alerts, and service updates. By using these features:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                    <li>You consent to receiving notifications about project activities, access requests, and security events.</li>
                    <li>You can manage notification preferences in your account settings.</li>
                    <li>Security-related notifications cannot be disabled and are essential for account protection.</li>
                    <li>You agree that we may send service announcements and updates via email or in-app notifications.</li>
                    <li>Notification data is processed in accordance with our Privacy Policy.</li>
                </ul>
            </section>

            <section id="third-party-links" className="scroll-mt-28 mb-12 pb-8 border-b border-border/30">
                <h2 className="text-2xl font-semibold mb-4 font-serif">9. Links To Other Web Sites</h2>
                <p className="text-muted-foreground leading-relaxed">
                    Our Service may contain links to third-party web sites or services that are not owned or controlled by Envault.
                    Envault has no control over, and assumes no responsibility for, the content, privacy policies, or practices of any third party web sites or services.
                    You further acknowledge and agree that Envault shall not be responsible or liable, directly or indirectly, for any damage or loss caused or alleged to be caused by or in connection with use of or reliance on any such content, goods or services available on or through any such web sites or services.
                </p>
            </section>

            <section id="termination" className="scroll-mt-28 mb-12 pb-8 border-b border-border/30">
                <h2 className="text-2xl font-semibold mb-4 font-serif">10. Termination</h2>
                <p className="text-muted-foreground leading-relaxed">
                    We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
                    Upon termination, your right to use the Service will immediately cease. If you wish to terminate your account, you may simply discontinue using the Service.
                </p>
            </section>

            <section id="liability" className="scroll-mt-28 mb-12 pb-8 border-b border-border/30">
                <h2 className="text-2xl font-semibold mb-4 font-serif">11. Limitation of Liability</h2>
                <p className="text-muted-foreground leading-relaxed">
                    In no event shall Envault, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from (i) your access to or use of or inability to access or use the Service; (ii) any conduct or content of any third party on the Service; (iii) any content obtained from the Service; and (iv) unauthorized access, use or alteration of your transmissions or content, whether based on warranty, contract, tort (including negligence) or any other legal theory, whether or not we have been informed of the possibility of such damage, and even if a remedy set forth herein is found to have failed of its essential purpose.
                </p>
            </section>

            <section id="disclaimer" className="scroll-mt-28 mb-12 pb-8 border-b border-border/30">
                <h2 className="text-2xl font-semibold mb-4 font-serif">12. Disclaimer</h2>
                <p className="text-muted-foreground leading-relaxed">
                    Your use of the Service is at your sole risk. The Service is provided on an <code className="font-mono text-sm bg-accent/50 px-2 py-0.5 rounded">&quot;AS IS&quot;</code> and <code className="font-mono text-sm bg-accent/50 px-2 py-0.5 rounded">&quot;AS AVAILABLE&quot;</code> basis. The Service is provided without warranties of any kind, whether express or implied, including, but not limited to, implied warranties of merchantability, fitness for a particular purpose, non-infringement or course of performance.
                </p>
            </section>

            <section id="governing-law" className="scroll-mt-28 mb-12 pb-8 border-b border-border/30">
                <h2 className="text-2xl font-semibold mb-4 font-serif">13. Governing Law</h2>
                <p className="text-muted-foreground leading-relaxed">
                    These Terms shall be governed and construed in accordance with the laws of India, without regard to its conflict of law provisions.
                    Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights. If any provision of these Terms is held to be invalid or unenforceable by a court, the remaining provisions of these Terms will remain in effect.
                </p>
            </section>

            <section id="changes" className="scroll-mt-28 mb-12 pb-8 border-b border-border/30">
                <h2 className="text-2xl font-semibold mb-4 font-serif">14. Changes</h2>
                <p className="text-muted-foreground leading-relaxed">
                    We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material we will try to provide at least 30 days notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
                    By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms. If you do not agree to the new terms, please stop using the Service.
                </p>
            </section>

            <section id="contact" className="scroll-mt-28 mb-12">
                <h2 className="text-2xl font-semibold mb-4 font-serif">15. Contact Us</h2>
                <p className="text-muted-foreground leading-relaxed">
                    If you have any questions about these Terms, please contact us at{" "}
                    <a href="mailto:dashdinanath056@gmail.com" className="font-mono text-sm text-foreground hover:text-primary transition-colors underline underline-offset-4">
                        dashdinanath056@gmail.com
                    </a>.
                </p>
            </section>
        </LegalLayout>
    )
}
