import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function signOut(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const url = new URL("/login", request.url);
  const reason = request.nextUrl.searchParams.get("reason");
  if (reason === "inactive") url.searchParams.set("error", "inactive");
  return NextResponse.redirect(url, { status: 303 });
}

export const POST = signOut;
// GET utilisé uniquement par la garde serveur lorsqu'un compte est suspendu.
export const GET = signOut;
