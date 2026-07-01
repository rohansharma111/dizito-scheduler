import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t bg-white">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row justify-between gap-8">
          <div>
            <h3 className="text-xl font-bold">Dizito</h3>

            <p className="text-gray-600 mt-2">
              Create once. Publish everywhere.
            </p>
          </div>

          <div className="flex gap-10">
            <div>
              <h4 className="font-semibold mb-3">Product</h4>

              <div className="space-y-2">
                <Link href="/pricing">Pricing</Link>
                <br />
                <Link href="/how-it-works">How it Works</Link>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Legal</h4>

              <div className="space-y-2">
                <Link href="/privacy">Privacy</Link>
                <br />
                <Link href="/terms">Terms</Link>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Contact</h4>

              <div>dizito2@gmail.com</div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
