"use client";

import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import { useState, useCallback, useEffect, useMemo } from "react";
import { AptosClient } from "aptos";

export function WalletConnect() {
  const wallet = useWallet();
  console.log("Wallet state:", {
    connected: wallet.connected,
    account: wallet.account,
    wallets: wallet.wallets,
    notDetectedWallets: wallet.notDetectedWallets,
    network: wallet.network,
  });

  const { account, connected, network } = wallet;
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPetraDetected, setIsPetraDetected] = useState<boolean | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [networkStatus, setNetworkStatus] = useState<string | null>(null);

  // Create an Aptos client instance wrapped in useMemo - using only devnet
  const aptosClient = useMemo(() => {
    // Always use devnet
    const networkUrl = "https://fullnode.devnet.aptoslabs.com/v1";
    console.log(`Creating Aptos client for devnet with URL: ${networkUrl}`);
    return new AptosClient(networkUrl);
  }, []);

  // Check if Petra wallet is installed
  useEffect(() => {
    const checkPetra = () => {
      const isPetraAvailable =
        typeof window !== "undefined" &&
        (typeof window.aptos !== "undefined" ||
          typeof window.petra !== "undefined");
      console.log("Petra wallet detected:", isPetraAvailable);
      setIsPetraDetected(isPetraAvailable);
    };

    checkPetra();

    // Re-check periodically in case user installs extension
    const intervalId = setInterval(checkPetra, 1000);
    return () => clearInterval(intervalId);
  }, []);

  // Fetch wallet balance when connected
  useEffect(() => {
    async function fetchBalance() {
      if (connected && account?.address) {
        try {
          // Log the current network and address we're trying to query
          console.log(
            `Fetching balance for address ${account.address.toString()} on devnet`,
          );
          setNetworkStatus(
            `Using Devnet (wallet on ${network?.name ?? "Unknown"})`,
          );

          const addressStr = account.address.toString();
          const resources = await aptosClient.getAccountResources(addressStr);

          // Find the APT coin resource
          const aptCoinResource = resources.find(
            (r) =>
              r.type === "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>",
          );

          // Use optional chaining to avoid the linter warning
          const coinData = aptCoinResource?.data as
            | { coin: { value: string } }
            | undefined;

          if (coinData) {
            const value = coinData.coin.value;
            // Convert from octas (10^8) to APT
            const aptValue = parseFloat(value) / 100000000;
            setBalance(aptValue.toFixed(4));
            console.log("Wallet balance fetched:", aptValue);
          } else {
            setBalance("0");
            console.log("No APT coin resource found");
          }
        } catch (err) {
          console.error("Error fetching balance:", err);
          // Check if it's an account not found error
          if (
            err instanceof Error &&
            err.message.includes("account_not_found")
          ) {
            setBalance("New on devnet");
            setNetworkStatus(
              `Account not found on devnet (wallet on ${network?.name ?? "Unknown"})`,
            );
          } else {
            setBalance(null);
          }
        }
      } else {
        setBalance(null);
        setNetworkStatus(null);
      }
    }

    // Immediately fetch balance
    void fetchBalance();

    // Set up polling for balance updates
    const intervalId = setInterval(() => {
      void fetchBalance();
    }, 15000); // Check every 15 seconds

    return () => {
      clearInterval(intervalId);
    };
  }, [connected, account, aptosClient, network]);

  // Create local function references to avoid unbound method warnings
  const connectWallet = useCallback(
    (walletName: string) => {
      console.log("Attempting to connect to wallet:", walletName);
      try {
        wallet.connect(walletName);
        console.log("Connect method called successfully");
      } catch (err) {
        console.error("Error in connectWallet:", err);
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [wallet],
  );

  const disconnectWallet = useCallback(() => {
    console.log("Attempting to disconnect wallet");
    try {
      wallet.disconnect();
      console.log("Disconnect method called successfully");
    } catch (err) {
      console.error("Error in disconnectWallet:", err);
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [wallet]);

  // Clear error on successful connection
  useEffect(() => {
    if (connected) {
      console.log("Wallet connected successfully:", account);
      if (error) {
        setError(null);
      }
    }
  }, [connected, account, error]);

  const handleConnect = () => {
    console.log("Connect button clicked");
    try {
      setIsConnecting(true);
      setError(null);
      connectWallet("Petra");
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      // Set a timeout to avoid the connecting state disappearing too quickly
      setTimeout(() => {
        setIsConnecting(false);
        console.log("isConnecting set to false");
      }, 1000);
    }
  };

  const handleDisconnect = () => {
    console.log("Disconnect button clicked");
    try {
      disconnectWallet();
    } catch (error) {
      console.error("Failed to disconnect wallet:", error);
      setError(error instanceof Error ? error.message : String(error));
    }
  };

  // Wallet not detected state
  if (isPetraDetected === false) {
    return (
      <a
        href="https://petra.app/download"
        target="_blank"
        rel="noopener noreferrer"
      >
        <Button variant="outline" size="sm" title="Install Petra Wallet">
          Install Wallet
        </Button>
      </a>
    );
  }

  if (connected && account) {
    // Format the address string properly
    const addressString = account.address?.toString();
    const formattedAddress = addressString
      ? `${addressString.slice(0, 6)}...${addressString.slice(-4)}`
      : "Connected";

    // Display address and balance if available
    const buttonText = balance
      ? `${formattedAddress} (${balance} APT)`
      : formattedAddress;

    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleDisconnect}
        title={`Connected to devnet${networkStatus ? ` - ${networkStatus}` : ""}`}
      >
        {buttonText}
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleConnect}
      disabled={isConnecting}
      title={error ?? "Connect your Aptos wallet"}
    >
      {isConnecting ? "Connecting..." : "Connect Wallet"}
    </Button>
  );
}
