import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to public routes
        const publicPaths = ["/", "/login", "/register", "/api/auth", "/api/v1/purchase_intent", "/api/webhooks"];
        const isPublicPath = publicPaths.some(path => req.nextUrl.pathname.startsWith(path));
        
        if (isPublicPath) {
          return true;
        }
        
        // Require auth for dashboard and internal APIs
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/internal/:path*",
    "/api/stripe/:path*",
  ],
};

