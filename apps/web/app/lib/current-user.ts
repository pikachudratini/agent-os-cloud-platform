import { auth, currentUser } from '@clerk/nextjs/server';

export type CurrentUserIdentity = {
  userId: string;
  email: string;
  name: string;
  isLocalFallback: boolean;
};

function hasClerkRuntime() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
}

export async function getCurrentUserIdentity(): Promise<CurrentUserIdentity> {
  try {
    const session = await auth();
    if (session.userId) {
      const user = await currentUser();
      return {
        userId: session.userId,
        email: user?.primaryEmailAddress?.emailAddress || `${session.userId}@clerk.local`,
        name: user?.fullName || user?.firstName || 'MinionMint owner',
        isLocalFallback: false,
      };
    }
  } catch {
    // Local QA without Clerk environment variables uses a deterministic demo user.
  }

  if (!hasClerkRuntime() || process.env.NODE_ENV !== 'production') {
    return {
      userId: 'local-demo-user',
      email: 'local-demo-user@minionmint.test',
      name: 'Local demo owner',
      isLocalFallback: true,
    };
  }

  throw new Error('Authentication required');
}

export async function getCurrentUserId() {
  const identity = await getCurrentUserIdentity();
  return identity.userId;
}
