import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin, verifySignedCsrfToken } from "@/lib/security";
import { verifyRecaptchaToken } from "@/lib/recaptcha";

type CtxBase = Record<string, unknown>;
type ApiHandler<TCtx extends CtxBase> = (req: NextRequest, ctx: TCtx) => Promise<NextResponse>;
type Decorator<TIn extends CtxBase, TOut extends CtxBase> = (
  handler: ApiHandler<TOut>
) => ApiHandler<TIn>;

export function decorate<TInitial extends CtxBase, TFinal extends CtxBase>(
  handler: ApiHandler<TFinal>,
  ...decorators: Array<Decorator<any, any>>
) {
  return decorators.reduceRight((current, decorator) => decorator(current), handler) as unknown as ApiHandler<TInitial>;
}

export function withSameOrigin<TCtx extends CtxBase>(): Decorator<TCtx, TCtx> {
  return (handler) => async (req, ctx) => {
    const sameOrigin = await assertSameOrigin(req);
    if (!sameOrigin) {
      return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
    }
    return handler(req, ctx);
  };
}

export function withCsrfFromBody<
  TBody extends Record<string, unknown>,
  TCtx extends CtxBase & WithBody<TBody>
>(tokenField: keyof TBody): Decorator<TCtx, TCtx> {
  return (handler) => async (req, ctx) => {
    if (!ctx.body || typeof ctx.body !== "object") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const token = String(ctx.body[tokenField] ?? "");
    if (!token || !verifySignedCsrfToken(token)) {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
    }
    return handler(req, ctx);
  };
}

type WithBody<TBody> = { body: TBody };

export function withJsonBody<TCtx extends CtxBase, TSchema extends z.ZodTypeAny>(
  schema: TSchema
): Decorator<TCtx, TCtx & WithBody<z.infer<TSchema>>> {
  return (handler) => async (req, ctx) => {
    const json = await req.json().catch(() => null);
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const nextCtx = { ...ctx, body: parsed.data };
    return handler(req, nextCtx);
  };
}

export function withHoneypot<TBody extends Record<string, unknown>, TCtx extends CtxBase & WithBody<TBody>>(
  field: keyof TBody
): Decorator<TCtx, TCtx> {
  return (handler) => async (req, ctx) => {
    if (!ctx.body || typeof ctx.body !== "object") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const value = String(ctx.body[field] ?? "");
    if (value.trim().length > 0) {
      return NextResponse.json({ error: "Spam detected" }, { status: 400 });
    }
    return handler(req, ctx);
  };
}

export function withRecaptcha<
  TBody extends Record<string, unknown>,
  TCtx extends CtxBase & WithBody<TBody>
>(
  action: string,
  tokenField: keyof TBody
): Decorator<TCtx, TCtx> {
  return (handler) => async (req, ctx) => {
    if (!ctx.body || typeof ctx.body !== "object") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const token = String(ctx.body[tokenField] ?? "");
    if (!token) {
      return NextResponse.json({ error: "Missing captcha token" }, { status: 400 });
    }

    const remoteIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const recaptchaResult = await verifyRecaptchaToken(token, action, remoteIp);
    if (!recaptchaResult.success) {
      return NextResponse.json({ error: "Captcha verification failed" }, { status: 403 });
    }

    return handler(req, ctx);
  };
}
