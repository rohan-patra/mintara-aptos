import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface TokenData {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  tweetId: string;
  tweetAuthor: string;
  launchedAt: Date;
}

interface TokenCardProps {
  token: TokenData;
  className?: string;
  highlighted?: boolean;
}

export function TokenCard({
  token,
  className,
  highlighted = false,
}: TokenCardProps) {
  const priceChangeColor =
    token.change24h >= 0 ? "text-green-500" : "text-red-500";
  const priceChangeIcon = token.change24h >= 0 ? "↑" : "↓";

  return (
    <Card
      className={cn(
        "overflow-hidden border border-border transition-all duration-200",
        highlighted && "border-secondary shadow-md shadow-secondary/10",
        className,
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold">${token.symbol}</h3>
            <Badge variant="secondary" className="px-1.5 py-0.5 text-xs">
              AI Launched
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{token.name}</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold">${token.price.toFixed(4)}</div>
          <div className={cn("text-sm font-medium", priceChangeColor)}>
            {priceChangeIcon} {Math.abs(token.change24h).toFixed(2)}%
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 py-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Volume 24h</p>
            <p className="font-medium">${token.volume24h.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Market Cap</p>
            <p className="font-medium">${token.marketCap.toLocaleString()}</p>
          </div>
        </div>
        <div className="mt-3 border-t border-border pt-3">
          <p className="text-xs text-muted-foreground">
            Launched by AI Agent from @{token.tweetAuthor}'s tweet
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2 p-4 pt-0">
        <Button className="w-full" variant="default" size="sm">
          Buy
        </Button>
        <Button variant="outline" size="sm" className="flex-shrink-0">
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
            <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
          </svg>
          View Tweet
        </Button>
      </CardFooter>
    </Card>
  );
}

// Sample data
export const sampleTokens: TokenData[] = [
  {
    id: "1",
    symbol: "TESLA",
    name: "Tesla Token",
    price: 0.0012,
    change24h: 12.5,
    volume24h: 235000,
    marketCap: 450000,
    tweetId: "1234567890",
    tweetAuthor: "elonmusk",
    launchedAt: new Date(Date.now() - 3600000 * 2), // 2 hours ago
  },
  {
    id: "2",
    symbol: "CRYPTO",
    name: "Crypto Token",
    price: 0.0054,
    change24h: -5.2,
    volume24h: 198000,
    marketCap: 670000,
    tweetId: "2345678901",
    tweetAuthor: "coinbase",
    launchedAt: new Date(Date.now() - 3600000 * 5), // 5 hours ago
  },
  {
    id: "3",
    symbol: "APPLE",
    name: "Apple Token",
    price: 0.0087,
    change24h: 7.8,
    volume24h: 342000,
    marketCap: 890000,
    tweetId: "9876543210",
    tweetAuthor: "tim_cook",
    launchedAt: new Date(Date.now() - 3600000 * 8), // 8 hours ago
  },
  {
    id: "4",
    symbol: "META",
    name: "Meta Platform Token",
    price: 0.0031,
    change24h: -2.4,
    volume24h: 156000,
    marketCap: 520000,
    tweetId: "3456789012",
    tweetAuthor: "meta",
    launchedAt: new Date(Date.now() - 3600000 * 12), // 12 hours ago
  },
  {
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
  },
];
