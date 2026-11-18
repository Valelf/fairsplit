import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Public routes that don't require auth
  const publicRoutes = ["/", "/login", "/signup", "/auth/confirm", "/api/auth/callback", "/claim"];
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  // If user is not authenticated and trying to access protected route
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // If user is authenticated and on login page, redirect to dashboard
  if (user && pathname === "/login") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    // If no profile found, don't redirect (avoid loop)
    if (!profile) {
      return supabaseResponse;
    }

    const role = profile.role;
    const url = request.nextUrl.clone();
    url.pathname = `/dashboard/${role}/dashboard`;
    return NextResponse.redirect(url);
  }

  // Role-based route protection
  if (user && pathname.startsWith("/dashboard/")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    // If no profile found, redirect to login instead of guessing role
    if (!profile) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    const role = profile.role;
    const routeSegments = pathname.split("/");
    const routeRole = routeSegments[2]; // /dashboard/{role}/...

    // If accessing a different role's routes, redirect to own dashboard
    if (routeRole && routeRole !== role && role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = `/dashboard/${role}/dashboard`;
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
