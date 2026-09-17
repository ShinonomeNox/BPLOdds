import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE_NAME = "session";
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7日

export interface SessionPayload {
  userId: string;
  loginId: string;
}

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET環境変数が設定されていません");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(
  payload: SessionPayload,
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (
      typeof payload.userId !== "string" ||
      typeof payload.loginId !== "string"
    ) {
      return null;
    }
    return { userId: payload.userId, loginId: payload.loginId };
  } catch {
    return null;
  }
}
