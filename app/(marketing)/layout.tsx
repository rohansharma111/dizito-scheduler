export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Dizito</h1>

          <nav className="flex gap-6">
            <a href="#features">Features</a>

            <a href="/pricing">Pricing</a>

            <a href="/login">Login</a>
          </nav>
        </div>
      </header>

      {children}
    </div>
  );
}
