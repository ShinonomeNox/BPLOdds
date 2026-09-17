export interface RecaptchaVerificationResult {
  success: boolean;
  score?: number;
}

interface RecaptchaApiResponse {
  success: boolean;
  score?: number;
  "error-codes"?: string[];
}

export async function verifyRecaptchaToken(
  token: string,
  remoteIp?: string,
): Promise<RecaptchaVerificationResult> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    throw new Error("RECAPTCHA_SECRET_KEY環境変数が設定されていません");
  }

  const params = new URLSearchParams({ secret, response: token });
  if (remoteIp) {
    params.set("remoteip", remoteIp);
  }

  const response = await fetch(
    "https://www.google.com/recaptcha/api/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    },
  );

  if (!response.ok) {
    throw new Error(
      `reCAPTCHA検証APIの呼び出しに失敗しました: HTTP ${response.status}`,
    );
  }

  const data = (await response.json()) as RecaptchaApiResponse;
  return { success: data.success, score: data.score };
}
