import { Ticker } from "@/components/Ticker";
import {
  TokenCard,
  sampleTokens,
  type TokenData,
} from "@/components/TokenCard";
import { KingOfTheHill } from "@/components/KingOfTheHill";
import { Button } from "@/components/ui/button";
import { WalletConnect } from "@/components/WalletConnect";
import { ThemeToggle } from "@/components/ThemeToggle";
import { StatusBadge } from "@/components/StatusBadge";
import Link from "next/link";

export default function HomePage() {
  // Using the sample data - explicitly define the king token
  const kingToken: TokenData = {
    id: "5",
    symbol: "NVIDIA",
    name: "Nvidia Token",
    price: 0.0126,
    change24h: 24.1,
    volume24h: 567000,
    marketCap: 1230000,
    tweetId: "5467812390",
    tweetAuthor: "nvidia",
    launchedAt: new Date(Date.now() - 3600000 * 18), // 18 hours ago
  };

  const otherTokens = sampleTokens.filter((token) => token.id !== kingToken.id);
  const allTokens = [...otherTokens, kingToken];

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background">
        <div className="container flex items-center justify-between px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-secondary">Mintara</h1>
            <span className="text-sm text-muted-foreground">on Aptos</span>
            <StatusBadge online={true} className="ml-2" />
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <WalletConnect />
          </div>
        </div>
      </header>

      {/* Ticker */}
      <Ticker tokens={allTokens} speed="normal" />

      {/* Main Content */}
      <div className="container grid grid-cols-1 gap-8 px-4 py-8 md:px-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-4 text-xl font-bold">Recently Launched Tokens</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {otherTokens.map((token) => (
              <div key={token.id} className="w-full">
                <TokenCard token={token} />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="mb-4 text-xl font-bold">
              <span className="inline-flex items-center justify-center text-cyan-400">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="mr-2 h-5 w-5"
                >
                  <path
                    d="M5 20h14v-8h3L12 3 2 12h3v8z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                King of the Hill
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="ml-2 h-5 w-5"
                >
                  <path
                    d="M5 20h14v-8h3L12 3 2 12h3v8z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </h2>
            <Link href={`/token/${kingToken.id}`}>
              <KingOfTheHill token={kingToken} className="sticky top-24" />
            </Link>
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="mb-4 text-lg font-bold">How It Works</h3>
            <ol className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  1
                </span>
                <span>Tag the Mintara AI agent under any tweet</span>
              </li>
              <li className="flex gap-3">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  2
                </span>
                <span>AI analyzes the tweet and launches a relevant token</span>
              </li>
              <li className="flex gap-3">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  3
                </span>
                <span>Buy, sell, and trade tokens on Aptos blockchain</span>
              </li>
              <li className="flex gap-3">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  4
                </span>
                <span>Popular tokens rise to become King of the Hill</span>
              </li>
            </ol>
            <Link href={`https://x.com`} target="_blank">
              <Button className="mt-5 w-full">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-2"
                >
                  <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
                  <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
                  <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
                  <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
                </svg>
                Launch a Token Now
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="container text-center text-sm text-muted-foreground">
          <p>© 2025 Mintara. Built on Aptos blockchain.</p>
          <div className="mt-3 flex items-center justify-center space-x-6">
            <a href="#" className="hover:text-secondary">
              Terms
            </a>
            <a href="#" className="hover:text-secondary">
              Privacy
            </a>
            <a href="#" className="hover:text-secondary">
              Docs
            </a>
            <a href="#" className="hover:text-secondary">
              Github
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
