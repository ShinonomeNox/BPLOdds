import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isRegistrationRateLimited } from "@/lib/auth/rate-limit";
import { getClientIp } from "@/lib/http/client-ip";

export async function proxy(request: NextRequest) {
  const ip = getClientIp(request);
  const supabase = createServiceClient();

  if (await isRegistrationRateLimited(supabase, ip)) {
    return NextResponse.json(
      {
        error: "登録リクエストが多すぎます。しばらくしてから再度お試しください",
      },
      { status: 429 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/auth/register",
};
