export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: "var(--font-fraunces), serif", color: "#1a3a2a" }}>
          Authentication Error
        </h1>
        <p className="text-gray-500 mb-6">
          Something went wrong during sign in. Please try again.
        </p>
        <a
          href="/"
          className="text-brand hover:underline"
        >
          Back to home
        </a>
      </div>
    </div>
  );
}
