import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppKitProvider } from "@reown/appkit/react";
import { appKitConfig } from "../config/wagmi";

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

interface WalletProviderProps {
  children: React.ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  return (
    <AppKitProvider {...appKitConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
        <appkit-modal />
      </QueryClientProvider>
    </AppKitProvider>
  );
};
