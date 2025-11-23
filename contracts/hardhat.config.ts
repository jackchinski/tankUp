import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable, defineConfig } from "hardhat/config";
import hardhatVerify from "@nomicfoundation/hardhat-verify";

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin, hardhatVerify],
  paths: {
    sources: "src",
  },
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  verify: {
    etherscan: {
      apiKey: "CS94GVBTDBUD2DSDQARA99BZZRVTATEIUE",
      
    },
    blockscout: {
      enabled: false,
    },
    sourcify: {
      enabled: false,
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    base: {
      type: "http",
      chainType: "l1",
      url: configVariable("BASE_RPC_URL"),
      accounts: [configVariable("PRIVATE_KEY")],
    },
    arbitrum: {
      type: "http",
      chainType: "l1",
      url: "https://arbitrum.rpc.subquery.network/public",
      accounts: [configVariable("PRIVATE_KEY")],
    },
    optimism: {
      type: "http",
      chainType: "l1",
      url: "https://optimism.drpc.org",
      accounts: [configVariable("PRIVATE_KEY")],
    },
    worldchain: {
      type: "http",
      chainType: "l1",
      url: "https://worldchain-mainnet.g.alchemy.com/public",
      accounts: [configVariable("PRIVATE_KEY")],
    },
  },
});
