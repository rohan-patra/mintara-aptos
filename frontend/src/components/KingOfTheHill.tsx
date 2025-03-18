import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type TokenData } from "./TokenCard";

interface KingOfTheHillProps {
  token: TokenData;
  className?: string;
}

export function KingOfTheHill({ token, className }: KingOfTheHillProps) {
  return (
    <Card
      className={cn("overflow-hidden border border-border bg-card", className)}
    >
      <CardHeader className="border-b border-border p-4 text-center">
        <h2 className="flex items-center justify-center text-lg font-bold text-cyan-400">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="mr-2 h-5 w-5"
          >
            <path
              d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          KING OF THE HILL
          <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="ml-2 h-5 w-5"
          >
            <path
              d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </h2>
      </CardHeader>
      <CardContent className="p-6 text-center">
        <div className="mb-4">
          <h3 className="text-4xl font-bold text-cyan-400">${token.symbol}</h3>
          <p className="text-lg text-muted-foreground">{token.name}</p>
        </div>

        <div className="mb-6 flex flex-col items-center">
          <p className="text-sm text-muted-foreground">Current Price</p>
          <p className="text-4xl font-bold">${token.price.toFixed(4)}</p>
          <p
            className={cn(
              "text-lg font-medium",
              token.change24h >= 0 ? "text-green-500" : "text-red-500",
            )}
          >
            {token.change24h >= 0 ? "↑" : "↓"}{" "}
            {Math.abs(token.change24h).toFixed(2)}%
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-sm text-muted-foreground">Volume 24h</p>
            <p className="text-xl font-semibold">
              ${token.volume24h.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Market Cap</p>
            <p className="text-xl font-semibold">
              ${token.marketCap.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex space-x-3">
          <Button className="flex-1" variant="default">
            Buy Now
          </Button>

          <Button variant="outline" className="flex-shrink-0">
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
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Launched by AI Agent from @{token.tweetAuthor}'s tweet
        </p>
      </CardContent>
    </Card>
  );
}
