import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import {
  decorate,
  withCsrfFromBody,
  withHoneypot,
  withJsonBody,
  withRecaptcha,
  withSameOrigin
} from "@/lib/api-decorators";

const requestSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().max(120),
  message: z.string().trim().min(10).max(2000),
  website: z.string().max(0).optional().default(""),
  csrfToken: z.string().min(1),
  captchaToken: z.string().min(1)
});

type SupportPayload = z.infer<typeof requestSchema>;
type SupportCtx = { body: SupportPayload };

async function submitHandler(_req: NextRequest, _ctx: SupportCtx) {
  return NextResponse.json({ ok: true, endpoint: "/api/support", queue: "support" });
}

const protectedSubmit = decorate<Record<string, never>, SupportCtx>(
  submitHandler,
  withSameOrigin<Record<string, never>>(),
  withJsonBody<Record<string, never>, typeof requestSchema>(requestSchema),
  withCsrfFromBody<SupportPayload, SupportCtx>("csrfToken"),
  withHoneypot<SupportPayload, SupportCtx>("website"),
  withRecaptcha<SupportPayload, SupportCtx>("contact_submit", "captchaToken")
);

export async function POST(req: NextRequest) {
  return protectedSubmit(req, {});
}
