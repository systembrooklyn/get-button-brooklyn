import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function middleware(request) {
  // Create a response object we can attach cookies to
  let response = NextResponse.next();

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // ✅ PROTECT PRIVATE ROUTES ONLY
  if (!user && pathname.startsWith("/chatbot")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // ❌ DO NOT redirect authenticated users here
  // ❌ DO NOT protect login/signup/home in middleware

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png).*)",
  ],
};
