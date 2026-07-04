import type { Metadata } from 'next';
import { ClerkProvider, SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import './styles.css';

const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || 'pk_test_ZHVtbXkuY2xlcmsuYWNjb3VudHMuZGV2JA';

export const metadata: Metadata = {
  title: 'MinionMint',
  description: 'Mint a custom AI helper for your business in minutes.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <html lang="en">
        <body>
          <header className="site-header">
            <Link href="/" className="brand">MinionMint</Link>
            <nav>
              <Link href="/onboarding">Onboarding</Link>
              <Link href="/dashboard">Dashboard</Link>
              <SignedOut><SignInButton mode="modal"><button className="button secondary">Sign in</button></SignInButton></SignedOut>
              <SignedIn><UserButton /></SignedIn>
            </nav>
          </header>
          <main>{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
