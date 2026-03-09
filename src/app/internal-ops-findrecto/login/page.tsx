export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#f5f2ec" }}>
      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-8 w-full max-w-sm">
        {/* Brand row */}
        <div className="flex items-center gap-2 mb-6">
          <img src="/logo.png" alt="FindRec logo" width={32} height={32} />
          <span
            className="font-bold text-sm"
            style={{ fontFamily: "var(--font-fraunces), serif", color: "#1a3a2a" }}
          >
            FindRec Admin
          </span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 tracking-wider">
            INTERNAL
          </span>
        </div>

        <h1
          className="text-xl font-bold mb-1"
          style={{ fontFamily: "var(--font-fraunces), serif", color: "#1a3a2a" }}
        >
          Internal Access
        </h1>
        <p className="text-gray-500 text-sm mb-6">Enter the admin passphrase to continue.</p>

        <form action="/api/admin/auth" method="POST">
          <input
            name="secret"
            type="password"
            placeholder="Passphrase"
            required
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand mb-4"
            autoFocus
          />
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition hover:opacity-90"
            style={{ background: "#1a3a2a" }}
          >
            Enter Dashboard
          </button>
        </form>
      </div>
    </div>
  );
}
