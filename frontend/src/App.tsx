import React, { useEffect } from "react";
import { GasFountainProvider, useGasFountain, ThemeProvider } from "./context";
import Layout from "./components/Layout";
import Header from "./components/Header";
import ActivityLog from "./components/ActivityLog";
import Step1Destinations from "./components/Step1Destinations";
import Step2Execution from "./components/Step2Execution";
import Step3Review from "./components/Step3Review";
import { createConfig, http, WagmiProvider } from "wagmi";
import { arbitrum, mainnet, sepolia, optimism, bsc, avalanche, scroll, zora, base } from "wagmi/chains";
import NexusProvider, { useNexus } from "./components/nexus/NexusProvider";
import { getDefaultConfig } from "tailwind-merge";
import { useAccount } from "wagmi";
import { EthereumProvider } from "@avail-project/nexus-core";

const walletConnectProjectId = "ea104276d5af626ff7bdfc3ed190e8f8";

const config = getDefaultConfig();
export const wagmiConfig = createConfig({
  chains: [mainnet, sepolia, base, arbitrum, optimism, bsc, avalanche, scroll, zora],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [base.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
    [bsc.id]: http(),
    [avalanche.id]: http(),
    [scroll.id]: http(),
    [zora.id]: http(),
  },
});
const MainContent: React.FC = () => {
  const { handleInit, fetchUnifiedBalance } = useNexus();
  const { currentStep } = useGasFountain();
  const { connector, status, address } = useAccount();

  useEffect(() => {
    const init = async () => {
      const provider = (await connector?.getProvider()) as EthereumProvider;
      await handleInit(provider);
      await fetchUnifiedBalance();
    };
    init();
  }, [handleInit, fetchUnifiedBalance, connector]);

  return (
    <div className="space-y-8">
      <div className="min-h-[400px]">
        {currentStep === 1 && <Step1Destinations />}
        {currentStep === 2 && <Step3Review />}
        {currentStep === 3 && <Step2Execution />}
      </div>

      <ActivityLog />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <WagmiProvider config={wagmiConfig}>
        <GasFountainProvider>
          <NexusProvider config={config}>
            <Layout>
              <Header />
              <MainContent />
            </Layout>
          </NexusProvider>
        </GasFountainProvider>
      </WagmiProvider>
    </ThemeProvider>
  );
};

export default App;
