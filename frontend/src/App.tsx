import React from "react";
import { GasFountainProvider, useGasFountain, ThemeProvider } from "./context";
import Layout from "./components/Layout";
import Header from "./components/Header";
import ActivityLog from "./components/ActivityLog";
import Step1Destinations from "./components/Step1Destinations";
import Step2Execution from "./components/Step2Execution";
import Step3Review from "./components/Step3Review";
import { createConfig, http, WagmiProvider } from "wagmi";
import {
  arbitrum,
  mainnet,
  sepolia,
  optimism,
  bsc,
  avalanche,
  scroll,
  zora,
  base,
} from "wagmi/chains";

export const wagmiConfig = createConfig({
  chains: [
    mainnet,
    sepolia,
    base,
    arbitrum,
    optimism,
    bsc,
    avalanche,
    scroll,
    zora,
  ],
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
  const { currentStep } = useGasFountain();

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
          <Layout>
            <Header />
            <MainContent />
          </Layout>
        </GasFountainProvider>
      </WagmiProvider>
    </ThemeProvider>
  );
};

export default App;
