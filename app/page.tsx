import "./globals.css";
import { ContactForm } from "@/components/contact-form";
import { createSignedCsrfToken } from "@/lib/security";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const csrfToken = createSignedCsrfToken();

  return (
    <main>
      <h1>Secure Contact Form Demo</h1>
      <p>
        This example shows anti-CSRF checks, same-origin API access, honeypot bot filtering,
        and reCAPTCHA v3 SCORE server verification via decorated API handlers across multiple
        endpoints.
      </p>
      <div className="card">
        <ContactForm csrfToken={csrfToken} />
      </div>
    </main>
  );
}
