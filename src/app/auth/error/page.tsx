export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Authentication Error
        </h1>
        <p className="text-gray-500 mb-6">
          Something went wrong during sign in. Please try again.
        </p>
        <a
          href="/"
          className="text-blue-600 hover:underline"
        >
          Back to home
        </a>
      </div>
    </div>
  );
}
