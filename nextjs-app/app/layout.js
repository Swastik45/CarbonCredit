import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'CarbonCredit - Carbon Credit Marketplace',
  description: 'Trade carbon credits with verified plantations',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
        {/* Navigation */}
        <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
          <nav className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
            <Link 
              href="/" 
              className="flex items-center gap-2 text-xl font-bold tracking-tight text-emerald-700 transition-hover hover:opacity-80"
            >
              <span className="text-2xl">🌱</span>
              <span>CarbonCredit</span>
            </Link>

            <div className="flex items-center gap-6 sm:gap-8">
              <Link href="/map" className="text-sm font-medium text-slate-600 hover:text-emerald-600 transition-colors">
                Map
              </Link>
              <Link href="/ndvi-guide" className="text-sm font-medium text-slate-600 hover:text-emerald-600 transition-colors">
                NDVI Guide
              </Link>
              <Link 
                href="/login" 
                className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 transition-all active:scale-95"
              >
                Login
              </Link>
            </div>
          </nav>
        </header>

        {/* Main Content */}
        <main className="flex-grow">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t bg-white py-8">
          <div className="container mx-auto px-4 text-center">
            <p className="text-sm text-slate-500">
              © {new Date().getFullYear()} CarbonCredit. <span className="hidden sm:inline">Building a sustainable future together.</span>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}