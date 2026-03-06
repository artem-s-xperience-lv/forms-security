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

type ContactPayload = z.infer<typeof requestSchema>;
type ContactCtx = { body: ContactPayload };

async function submitHandler(_req: NextRequest, _ctx: ContactCtx) {
  return NextResponse.json({ ok: true });
}

const protectedSubmit = decorate<Record<string, never>, ContactCtx>(
  submitHandler,
  withSameOrigin<Record<string, never>>(),
  withJsonBody<Record<string, never>, typeof requestSchema>(requestSchema),
  withCsrfFromBody<ContactPayload, ContactCtx>("csrfToken"),
  withHoneypot<ContactPayload, ContactCtx>("website"),
  withRecaptcha<ContactPayload, ContactCtx>("contact_submit", "captchaToken")
);

export async function POST(req: NextRequest) {
  return protectedSubmit(req, {});
}
