"use client";

import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { Network } from "@aptos-labs/ts-sdk";
import { type ReactNode, useEffect } from "react";

interface WalletProviderProps {
  children: ReactNode;
}

// This is needed so TypeScript doesn't complain about the window.aptos object
// We have a separate petra.d.ts file for this now

export function WalletProvider({ children }: WalletProviderProps) {
  useEffect(() => {
    // Log available wallets on mount to help with debugging
    const checkForWallet = () => {
      const hasAptos = typeof window !== "undefined" && !!window.aptos;
      const hasPetra = typeof window !== "undefined" && !!window.petra;

      console.log("Wallet available check:", {
        hasAptos,
        hasPetra,
        timestamp: new Date().toISOString(),
      });
    };

    // Check immediately
    checkForWallet();

    // And check periodically
    const intervalId = setInterval(checkForWallet, 2000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <AptosWalletAdapterProvider
      optInWallets={["Petra"]}
      autoConnect={false} // Set to false initially to avoid confusion
      dappConfig={{
        network: Network.DEVNET,
      }}
      onError={(error) => {
        console.error("Wallet adapter error:", error);
      }}
    >
      {children}
    </AptosWalletAdapterProvider>
  );
}
