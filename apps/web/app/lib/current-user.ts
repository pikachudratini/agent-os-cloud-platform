import { auth } from '@clerk/nextjs/server';

export async function getCurrentUserId() {
  try {
    const session = await auth();
    if (session.userId) return session.userId;
  } catch {
    // Local QA without Clerk environment variables uses a deterministic demo user.
  }
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY || process.env.NODE_ENV !== 'production') return 'local-demo-user';
  throw new Error('Authentication required');
}
