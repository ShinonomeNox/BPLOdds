"use client";

import { useCallback } from "react";

export function useRecaptcha() {
  const execute = useCallback(async (action: string): Promise<string> => {
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    if (!siteKey) {
      throw new Error("NEXT_PUBLIC_RECAPTCHA_SITE_KEYが設定されていません");
    }
    const grecaptcha = window.grecaptcha;
    if (!grecaptcha) {
      throw new Error("reCAPTCHAスクリプトが読み込まれていません");
    }
    return new Promise((resolve, reject) => {
      grecaptcha.ready(() => {
        grecaptcha.execute(siteKey, { action }).then(resolve).catch(reject);
      });
    });
  }, []);

  return { execute };
}
