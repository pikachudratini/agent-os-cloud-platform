import { NextResponse, type NextRequest } from 'next/server';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const dummyPublishableKey = 'pk_test_ZHVtbXkuY2xlcmsuYWNjb3VudHMuZGV2JA';
const dummySecretKey = 'minionmint-local-fallback-secret-marker';
const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/onboarding(.*)', '/api/onboarding(.*)']);

function hasRealClerkRuntime() {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    process.env.CLERK_SECRET_KEY &&
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY !== dummyPublishableKey &&
    process.env.CLERK_SECRET_KEY !== dummySecretKey,
  );
}

export default function middleware(req: NextRequest) {
  if (!hasRealClerkRuntime()) return NextResponse.next();
  const realClerkMiddleware = clerkMiddleware(async (auth, request) => {
    if (isProtectedRoute(request)) await auth.protect();
  });
  return realClerkMiddleware(req, {} as never);
}

export const config = {
  matcher: ['/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)', '/(api|trpc)(.*)'],
};
