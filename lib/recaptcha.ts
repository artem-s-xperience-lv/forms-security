export type RecaptchaVerifyResult = {
  success: boolean;
  score?: number;
  action?: string;
  "error-codes"?: string[];
};

export async function verifyRecaptchaToken(
  token: string,
  expectedAction: string,
  remoteIp?: string | null
) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    throw new Error("Missing RECAPTCHA_SECRET_KEY");
  }

  const body = new URLSearchParams({
    secret,
    response: token
  });

  if (remoteIp) {
    body.set("remoteip", remoteIp);
  }

  const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!res.ok) {
    return { success: false, "error-codes": ["recaptcha-unreachable"] } as RecaptchaVerifyResult;
  }

  const result = (await res.json()) as RecaptchaVerifyResult;
  const minScore = Number(process.env.RECAPTCHA_MIN_SCORE ?? "0.5");
  const actionMatches = result.action === expectedAction;
  const scorePasses = typeof result.score === "number" && result.score >= minScore;

  return {
    ...result,
    success: Boolean(result.success && actionMatches && scorePasses)
  } as RecaptchaVerifyResult;
}
