import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    // Create a server-side Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Successful authentication, redirect to the main app
      return NextResponse.redirect(`${origin}${next}`);
    } else {
      console.error("Auth callback error:", error);
      return NextResponse.redirect(`${origin}/?error=auth_callback_error`);
    }
  }

  // No code parameter, redirect with error
  return NextResponse.redirect(`${origin}/?error=no_code_provided`);
}
