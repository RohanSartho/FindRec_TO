// Friendly auth error page — reads ?reason= param set by /auth/callback
// to show context-aware guidance for common errors like duplicate accounts.

interface Props {
  searchParams: Promise<{ reason?: string }>;
}

// Map Supabase error codes / messages to human-readable guidance
function getErrorDetails(reason: string | undefined): { title: string; body: string } {
  const r = (reason ?? "").toLowerCase();

  if (
    r.includes("identity_already_exists") ||
    r.includes("identity_not_found") ||
    r.includes("user_already_exists") ||
    r.includes("already registered") ||
    r.includes("already been registered")
  ) {
    return {
      title: "Account already exists",
      body: "This email is already registered with a different sign-in method (Google, Facebook, or email/password). Please sign in using the method you originally used.",
    };
  }

  if (r.includes("email_not_confirmed") || r.includes("email_address_not_authorized")) {
    return {
      title: "Email not verified",
      body: "Please check your inbox for a verification email and confirm your address before signing in.",
    };
  }

  if (r.includes("oauth_provider_not_supported") || r.includes("provider_disabled")) {
    return {
      title: "Sign-in method unavailable",
      body: "This sign-in method is temporarily unavailable. Please try a different option.",
    };
  }

  return {
    title: "Sign-in failed",
    body: "Something went wrong during sign in. Please try again.",
  };
}

export default async function AuthErrorPage({ searchParams }: Props) {
  const { reason } = await searchParams;
  const { title, body } = getErrorDetails(reason);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <h1
          className="text-2xl font-bold mb-2"
          style={{ fontFamily: "var(--font-fraunces), serif", color: "#1a3a2a" }}
        >
          {title}
        </h1>
        <p className="text-gray-500 mb-6 text-sm leading-relaxed">{body}</p>
        <a href="/" className="text-brand hover:underline text-sm">
          Back to home
        </a>
      </div>
    </div>
  );
}
