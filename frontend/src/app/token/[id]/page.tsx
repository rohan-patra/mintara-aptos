"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { sampleTokens } from "@/components/TokenCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WalletConnect } from "@/components/WalletConnect";
import { Ticker } from "@/components/Ticker";
import { ArrowLeft, ExternalLink, TrendingUp, BarChart3 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

export default function TokenPage() {
  const params = useParams();
  const id = params.id as string;

  // Declare state hooks at the top level
  const [buyAmount, setBuyAmount] = useState("");
  const [sellAmount, setSellAmount] = useState("");

  // For this demo, we're using sample data
  // In a real app, we would fetch the token data from an API
  const token = sampleTokens.find((t) => t.id === id) ?? sampleTokens[0];

  // Add a guard to ensure token exists (to fix linter errors)
  if (!token) {
    return <div>Token not found</div>;
  }

  const priceChangeColor =
    token.change24h >= 0 ? "text-green-500" : "text-red-500";
  const priceChangeIcon = token.change24h >= 0 ? "↑" : "↓";

  // Bonding curve progress (simulated)
  const bondingCurveProgress = 42;

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background">
        <div className="container flex items-center justify-between px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-secondary">Mentara</h1>
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
      <Ticker tokens={sampleTokens} speed="normal" />

      {/* Back Navigation */}
      <div className="container px-4 py-4 md:px-6">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Home
        </Link>
      </div>

      {/* Token Header */}
      <div className="container px-4 py-2 md:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <span className="text-xl font-bold">
                {token.symbol.charAt(0)}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">{token.name}</h1>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  ${token.symbol}
                </span>
                <span
                  className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${priceChangeColor}`}
                >
                  {priceChangeIcon}
                  {token.change24h.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <div className="rounded-lg border border-border bg-card px-3 py-2">
              <div className="text-xs text-muted-foreground">Price</div>
              <div className="font-medium">${token.price.toFixed(4)}</div>
            </div>
            <div className="rounded-lg border border-border bg-card px-3 py-2">
              <div className="text-xs text-muted-foreground">Market Cap</div>
              <div className="font-medium">
                ${token.marketCap.toLocaleString()}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card px-3 py-2">
              <div className="text-xs text-muted-foreground">24h Volume</div>
              <div className="font-medium">
                ${token.volume24h.toLocaleString()}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card px-3 py-2">
              <div className="text-xs text-muted-foreground">Launched</div>
              <div className="font-medium">
                {token.launchedAt.toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container grid grid-cols-1 gap-6 px-4 pb-8 md:px-6 lg:grid-cols-3">
        {/* Chart and Market Data */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="overflow-hidden p-4">
            <Tabs defaultValue="chart">
              <div className="mb-4 flex items-center justify-between">
                <TabsList>
                  <TabsTrigger value="chart" className="flex items-center">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Price Chart
                  </TabsTrigger>
                  <TabsTrigger value="stats" className="flex items-center">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Market Stats
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="chart" className="mt-0">
                <div className="relative h-96 w-full overflow-hidden rounded-lg">
                  <iframe
                    src="https://www.gmgn.cc/kline/eth/0x8390a1da07e376ef7add4be859ba74fb83aa02d5"
                    className="h-full w-full border-none"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                  <div className="absolute bottom-0 h-10 w-full bg-background" />
                </div>
              </TabsContent>

              <TabsContent value="stats" className="mt-0">
                <div className="h-96 p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">
                          Bonding Curve Progress
                        </h3>
                        <div className="mt-2">
                          <div className="mb-1 flex items-center justify-between text-sm">
                            <span>Progress: {bondingCurveProgress}%</span>
                            <span>Target: 100%</span>
                          </div>
                          <Progress
                            value={bondingCurveProgress}
                            className="h-2"
                          />
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          As more tokens are purchased, the price increases
                          along the bonding curve.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">
                          Token Distribution
                        </h3>
                        <div className="mt-2 rounded-lg border border-border p-3">
                          <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">
                              Total Supply:
                            </span>
                            <span className="text-xs font-medium">
                              1,000,000
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">
                              Circulating:
                            </span>
                            <span className="text-xs font-medium">
                              {(420000).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">
                              Holders:
                            </span>
                            <span className="text-xs font-medium">
                              {(145).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">
                          Token Contract
                        </h3>
                        <div className="mt-2 flex items-center gap-2">
                          <code className="flex-1 rounded bg-muted px-2 py-1 text-xs">
                            0x6982...1933
                          </code>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </Card>

          {/* Tweet Card */}
          <Card className="p-4">
            <h2 className="mb-3 text-lg font-medium">Source Tweet</h2>
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-500/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://unavatar.io/twitter/${token.tweetAuthor}`}
                    alt={`@${token.tweetAuthor}`}
                    className="h-full w-full rounded-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src =
                        "https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png";
                    }}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">@{token.tweetAuthor}</span>
                    <span className="text-xs text-muted-foreground">
                      · {new Date().toLocaleDateString()}
                    </span>
                  </div>
                  <p className="mt-2 text-sm">
                    This is a sample tweet that led to the creation of the{" "}
                    {token.name} token. #AI #Crypto #Mentara
                  </p>
                  <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                    <span>💬 24</span>
                    <span>🔄 126</span>
                    <span>❤️ 438</span>
                  </div>
                  <div className="mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      asChild
                    >
                      <a
                        href={`https://twitter.com/${token.tweetAuthor}/status/${token.tweetId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View on Twitter
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Trading Interface */}
        <div className="space-y-6">
          <Card className="p-4">
            <h2 className="mb-4 text-lg font-medium">Trade {token.symbol}</h2>

            <Tabs defaultValue="buy">
              <TabsList className="w-full">
                <TabsTrigger value="buy" className="flex-1">
                  Buy
                </TabsTrigger>
                <TabsTrigger value="sell" className="flex-1">
                  Sell
                </TabsTrigger>
              </TabsList>

              <TabsContent value="buy" className="mt-4 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Amount to Buy
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      value={buyAmount}
                      onChange={(e) => setBuyAmount(e.target.value)}
                      placeholder="0.0"
                      className="flex-1 rounded-l-md border border-border bg-background px-3 py-2 text-right text-sm"
                    />
                    <div className="flex items-center rounded-r-md border border-l-0 border-border bg-muted px-3 py-2 text-sm">
                      {token.symbol}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-sm font-medium">You Pay</label>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">
                        Balance: 0.00
                      </span>
                    </div>
                  </div>
                  <div className="flex">
                    <input
                      type="text"
                      readOnly
                      value={
                        buyAmount
                          ? (parseFloat(buyAmount) * token.price).toFixed(6)
                          : "0.0"
                      }
                      className="flex-1 rounded-l-md border border-border bg-background px-3 py-2 text-right text-sm"
                    />
                    <div className="flex items-center rounded-r-md border border-l-0 border-border bg-muted px-3 py-2 text-sm">
                      APT
                    </div>
                  </div>
                </div>

                <div className="rounded border border-border p-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Price:</span>
                    <span>
                      ${token.price.toFixed(6)} per {token.symbol}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Price Impact:</span>
                    <span className="text-yellow-500">~2.4%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Network Fee:</span>
                    <span>~0.001 APT</span>
                  </div>
                </div>

                <Button className="w-full" disabled>
                  Connect Wallet to Buy
                </Button>
              </TabsContent>

              <TabsContent value="sell" className="mt-4 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Amount to Sell
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      value={sellAmount}
                      onChange={(e) => setSellAmount(e.target.value)}
                      placeholder="0.0"
                      className="flex-1 rounded-l-md border border-border bg-background px-3 py-2 text-right text-sm"
                    />
                    <div className="flex items-center rounded-r-md border border-l-0 border-border bg-muted px-3 py-2 text-sm">
                      {token.symbol}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-sm font-medium">You Receive</label>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">
                        Balance: 0.00
                      </span>
                    </div>
                  </div>
                  <div className="flex">
                    <input
                      type="text"
                      readOnly
                      value={
                        sellAmount
                          ? (
                              parseFloat(sellAmount) *
                              token.price *
                              0.97
                            ).toFixed(6)
                          : "0.0"
                      }
                      className="flex-1 rounded-l-md border border-border bg-background px-3 py-2 text-right text-sm"
                    />
                    <div className="flex items-center rounded-r-md border border-l-0 border-border bg-muted px-3 py-2 text-sm">
                      APT
                    </div>
                  </div>
                </div>

                <div className="rounded border border-border p-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Price:</span>
                    <span>
                      ${token.price.toFixed(6)} per {token.symbol}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Price Impact:</span>
                    <span className="text-yellow-500">~3.0%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Network Fee:</span>
                    <span>~0.001 APT</span>
                  </div>
                </div>

                <Button className="w-full" disabled>
                  Connect Wallet to Sell
                </Button>
              </TabsContent>
            </Tabs>

            <div className="mt-4 flex flex-col gap-2">
              <Button className="w-full" size="sm" variant="outline" asChild>
                <a
                  href={`https://twitter.com/intent/tweet?text=I&apos;m checking out the ${token.symbol} token on Mentara! 🚀&url=https://mintara.xyz/token/${token.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Share on Twitter
                </a>
              </Button>
              <Button className="w-full" size="sm" variant="ghost" asChild>
                <a
                  href={`https://explorer.aptoslabs.com/`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on Explorer
                </a>
              </Button>
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="mb-4 text-lg font-medium">Bonding Curve</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Current Progress
                  </span>
                  <span className="font-medium">{bondingCurveProgress}%</span>
                </div>
                <Progress value={bondingCurveProgress} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="container text-center text-sm text-muted-foreground">
          <p>© 2025 Mentara. Built on Aptos blockchain.</p>
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
