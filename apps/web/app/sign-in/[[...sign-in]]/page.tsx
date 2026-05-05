import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { Badge } from "@ari/ui";

export default function SignInPage() {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) {
    return <AuthFallback mode="sign in" />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f7f8] p-4">
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
    </main>
  );
}

function AuthFallback({ mode }: { mode: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f7f8] p-4">
      <div className="w-full max-w-md rounded-md border border-zinc-200 bg-white p-6">
        <Badge tone="yellow">Clerk not configured</Badge>
        <h1 className="mt-4 text-xl font-semibold">Production {mode}</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY to enable hosted authentication.</p>
        <Link href="/dashboard" className="mt-5 inline-flex h-9 items-center rounded-md bg-zinc-950 px-3 text-sm font-medium text-white">
          Continue to demo workspace
        </Link>
      </div>
    </main>
  );
}
