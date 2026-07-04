import type { Metadata } from 'next';
import { ClerkProvider, SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import './styles.css';

const dummyPublishableKey = 'pk_test_ZHVtbXkuY2xlcmsuYWNjb3VudHMuZGV2JA';
const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || dummyPublishableKey;
const hasRealClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY !== dummyPublishableKey);

export const metadata: Metadata = {
  title: 'MinionMint',
  description: 'Mint AI Minions with missions, approval rails, knowledge vaults, and planned workspaces.',
};

function Chrome({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link href="/" className="brand">MinionMint</Link>
          <nav>
            <Link href="/onboarding">Onboarding</Link>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/setup">Setup</Link>
            {hasRealClerk ? (
              <>
                <SignedOut><SignInButton mode="modal"><button className="button secondary">Sign in</button></SignInButton></SignedOut>
                <SignedIn><UserButton /></SignedIn>
              </>
            ) : <Link href="/onboarding" className="button secondary">Local demo</Link>}
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  if (!hasRealClerk) return <Chrome>{children}</Chrome>;
  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <Chrome>{children}</Chrome>
    </ClerkProvider>
  );
}
