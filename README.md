# Next.js 15.5.10 secure form + API example

This project demonstrates:
- Honeypot field bot trap (`website` input)
- Same-origin API-only policy (Origin + Sec-Fetch-Site checks)
- Server-rendered signed CSRF token validation via request body (`csrfToken`)
- Free silent captcha with Google reCAPTCHA v3 SCORE + server verification
- Decorator-based protection chain in `lib/api-decorators.ts`

## 1. Install

```bash
npm install
```

## 2. Configure env

Copy `.env.example` to `.env.local` and set real values:

- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`
- `RECAPTCHA_SECRET_KEY`
- `RECAPTCHA_MIN_SCORE` (optional, default `0.5`)
- `CSRF_SECRET`

## 3. Run

```bash
npm run dev
```

Open `http://localhost:3000`.

## Security flow summary

1. Client requests `/` and receives a server-rendered form.
2. The server renders the form with a signed CSRF token hidden input.
3. Submit to the selected endpoint (`/api/contact`, `/api/support`, or `/api/sales`) with body `csrfToken`.
4. API enforces same-origin request headers.
5. API validates signed CSRF token.
6. API validates payload + honeypot.
7. API verifies reCAPTCHA token with Google and enforces action + score threshold.
8. `POST` on all three endpoints uses the same decorator protection chain.

## Quick local API checks (Windows CMD)

Run these from project root while `npm run dev` is running:

```bat
scripts\api_get_same_origin_ok.cmd
scripts\api_post_no_origin_fail.cmd
scripts\api_post_with_csrf_but_no_captcha_fail.cmd
```

Expected:
- `api_get_same_origin_ok.cmd` -> `200 OK`
- `api_post_no_origin_fail.cmd` -> `403 Origin not allowed`
- `api_post_with_csrf_but_no_captcha_fail.cmd` -> `400 Missing captcha token`
