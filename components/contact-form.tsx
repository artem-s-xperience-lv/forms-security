"use client";

import { FormEvent, useEffect, useState } from "react";

declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

type ContactFormProps = {
  csrfToken: string;
};

export function ContactForm({ csrfToken }: ContactFormProps) {
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);
  const [captchaReady, setCaptchaReady] = useState(false);
  const [endpoint, setEndpoint] = useState<"/api/contact" | "/api/support" | "/api/sales">(
    "/api/contact"
  );

  useEffect(() => {
    if (!siteKey) {
      setStatus("Missing NEXT_PUBLIC_RECAPTCHA_SITE_KEY.");
      return;
    }

    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (!window.grecaptcha) {
        return;
      }
      setCaptchaReady(true);
    };

    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setStatus("");

    if (!csrfToken) {
      setStatus("CSRF token is not ready. Try again in a moment.");
      return;
    }

    if (!siteKey || !window.grecaptcha) {
      setStatus("Captcha is not ready yet.");
      return;
    }

    setPending(true);
    const captchaToken = await new Promise<string>((resolve, reject) => {
      window.grecaptcha?.ready(async () => {
        try {
          const token = await window.grecaptcha?.execute(siteKey, { action: "contact_submit" });
          if (!token) {
            reject(new Error("Missing reCAPTCHA token"));
            return;
          }
          resolve(token);
        } catch (error) {
          reject(error);
        }
      });
    }).catch(() => "");

    if (!captchaToken) {
      setPending(false);
      setStatus("Captcha verification did not start. Try again.");
      return;
    }

    const formData = new FormData(form);
    const payload = {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      message: String(formData.get("message") ?? ""),
      website: String(formData.get("website") ?? ""),
      csrfToken,
      captchaToken
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken
      },
      body: JSON.stringify(payload)
    });
    setPending(false);

    if (!res.ok) {
      const data = (await res.json().catch(() => ({ error: "Request failed" }))) as {
        error?: string;
      };
      setStatus(data.error ?? "Request failed");
      return;
    }

    form.reset();
    setStatus("Submitted successfully.");
  }

  return (
    <form onSubmit={onSubmit}>
      <input type="hidden" name="csrfToken" value={csrfToken} />
      <label>
        API Endpoint
        <select
          name="apiEndpoint"
          value={endpoint}
          onChange={(event) =>
            setEndpoint(
              event.currentTarget.value as "/api/contact" | "/api/support" | "/api/sales"
            )
          }
        >
          <option value="/api/contact">/api/contact</option>
          <option value="/api/support">/api/support</option>
          <option value="/api/sales">/api/sales</option>
        </select>
      </label>
      <label>
        Name
        <input name="name" required minLength={2} maxLength={80} />
      </label>

      <label>
        Email
        <input name="email" type="email" required maxLength={120} />
      </label>

      <label>
        Message
        <textarea name="message" rows={5} required minLength={10} maxLength={2000} />
      </label>

      <div className="honeypot" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <button type="submit" disabled={pending || !csrfToken || !captchaReady}>
        {pending ? "Submitting..." : "Send"}
      </button>
      <p className="note">Bot checks run silently using reCAPTCHA v3 SCORE.</p>
      {status ? <p className="status">{status}</p> : null}
    </form>
  );
}
