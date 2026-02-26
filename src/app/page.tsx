import Link from "next/link";

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-16 text-center">
      <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
        Toronto Parks &amp; Recreation
      </h1>
      <p className="text-lg text-gray-500 mb-10 max-w-xl mx-auto">
        Your one-stop destination for activities, rinks, programs and facilities across Toronto.
      </p>
      <div className="flex flex-wrap gap-4 justify-center">
        <Link
          href="/skating"
          className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition text-sm"
        >
          Find Skating Rinks
        </Link>
      </div>
    </div>
  );
}
