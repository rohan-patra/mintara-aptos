"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import { type TokenData } from "./TokenCard";

interface TickerEvent {
  id: string;
  type: "new_coin" | "new_trade";
  message: string;
  timestamp: Date;
}

interface TickerProps {
  events?: TickerEvent[];
  tokens: TokenData[];
  className?: string;
}

export function Ticker({
  events: providedEvents,
  tokens,
  className,
}: TickerProps) {
  const events = useMemo(() => {
    if (providedEvents && providedEvents.length > 0) {
      return providedEvents;
    }

    // Generate events based on tokens
    const generatedEvents: TickerEvent[] = [];

    // Add new coin events
    tokens.forEach((token) => {
      generatedEvents.push({
        id: `coin-${token.id}`,
        type: "new_coin",
        message: `AI Agent launched $${token.symbol} from ${token.tweetAuthor}'s tweet`,
        timestamp: token.launchedAt,
      });
    });

    // Add trading events
    const tradeTypes = ["purchased", "sold"];
    const tradeSizes = [100, 250, 500, 1000, 1200, 2000, 5000];

    tokens.forEach((token) => {
      const tradeType =
        tradeTypes[Math.floor(Math.random() * tradeTypes.length)];
      const tradeSize =
        tradeSizes[Math.floor(Math.random() * tradeSizes.length)];

      generatedEvents.push({
        id: `trade-${token.id}`,
        type: "new_trade",
        message: `User ${tradeType} ${tradeSize} $${token.symbol}`,
        timestamp: new Date(Date.now() - Math.random() * 86400000), // Random time in last 24h
      });
    });

    // Sort by timestamp (newest first) and take 10 most recent
    return generatedEvents
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);
  }, [providedEvents, tokens]);

  if (!events.length) return null;

  return (
    <div
      className={cn(
        "w-full overflow-hidden border-y border-border bg-background py-2",
        className,
      )}
    >
      <div className="animate-marquee flex items-center whitespace-nowrap">
        {events.map((event, i) => (
          <React.Fragment key={event.id}>
            <div className="mx-4 inline-flex items-center text-sm">
              {event.type === "new_coin" ? (
                <>
                  <span className="mr-2 font-bold text-secondary">
                    🚀 NEW COIN
                  </span>
                  <span>{event.message}</span>
                </>
              ) : (
                <>
                  <span className="mr-2 font-bold">👤 NEW TRADE</span>
                  <span>{event.message}</span>
                </>
              )}
            </div>
            {i < events.length - 1 && (
              <span className="mx-2 text-muted-foreground">•</span>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// Sample data - these are only needed if you want to override the auto-generated events
export const sampleTickerEvents: TickerEvent[] = [
  {
    id: "1",
    type: "new_coin",
    message: "AI Agent launched $APPLE from Tim Cook tweet",
    timestamp: new Date(),
  },
  {
    id: "2",
    type: "new_trade",
    message: "User purchased 500 $CRYPTO",
    timestamp: new Date(),
  },
  {
    id: "3",
    type: "new_coin",
    message: "AI Agent launched $NVIDIA from Jensen Huang tweet",
    timestamp: new Date(),
  },
];
