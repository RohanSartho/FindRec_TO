/**
 * Minimal site footer — brand + data credit.
 */
export function Footer() {
  return (
    <footer className="mt-16 border-t border-gray-200 py-6 px-4">
      <div className="max-w-6xl mx-auto flex items-center justify-center text-xs text-gray-400">
        <p>
          <span className="font-medium text-gray-500">FindRec TO</span>
          {" · "}
          Data:{" "}
          <a
            href="https://open.toronto.ca"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-brand underline underline-offset-2 transition-colors"
          >
            City of Toronto Open Data
          </a>
        </p>
      </div>
    </footer>
  );
}
