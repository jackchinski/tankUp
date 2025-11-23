import hardhat, { network } from "hardhat";
import type { Address } from "viem";

async function main() {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [deployer] = await viem.getWalletClients();

  // Resolve per-network defaults; allow env overrides (using viem)
  const chainId = await publicClient.getChainId();
  const name = publicClient.chain?.name ?? String(chainId);
  const defaults: Record<number, { USDC: string; WETH: string; ROUTER: string }> = {
    // Base mainnet
    8453: {
      USDC: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
      WETH: "0x4200000000000000000000000000000000000006",
      // Base SwapRouter02
      ROUTER: "0x2626664c2603336E57B271c5C0b26F421741e481",
    },
    // Arbitrum One
    42161: {
      // Native USDC
      USDC: "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
      WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
      // Uniswap V3 SwapRouter (canonical V3)
      ROUTER: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    },
    // Optimism
    10: {
      // USDC.e (bridged) default; override with native USDC via env if desired
      USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
      WETH: "0x4200000000000000000000000000000000000006",
      ROUTER: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    },
    // Worldchain (chainId 480)
    480: {
      USDC: "0x79A02482A880bCE3F13e09Da970dC34db4CD24d1",
      WETH: "0x4200000000000000000000000000000000000006",
      ROUTER: "0x091AD9e2e6e5eD44c1c66dB50e49A601F9f36cF6",
    },
  };
  const envUSDC = process.env.USDC_ADDRESS;
  const envWETH = process.env.WETH_ADDRESS;
  const envROUTER = process.env.SWAP_ROUTER;
  const netDefaults = defaults[Number(chainId)];
  if (!netDefaults && (!envUSDC || !envWETH || !envROUTER)) {
    throw new Error(
      `No deploy defaults for chainId ${chainId} (${name}). Please set USDC_ADDRESS, WETH_ADDRESS, SWAP_ROUTER env vars.`
    );
  }

  const USDC = (envUSDC ?? netDefaults?.USDC ?? "") as Address;
  const WETH = (envWETH ?? netDefaults?.WETH ?? "") as Address;
  const SWAP_ROUTER = (envROUTER ?? netDefaults?.ROUTER ?? "") as Address;
  // Prefer 3000 (0.3%) on Base; allow override via env
  const POOL_FEE = Number(process.env.UNI_POOL_FEE ?? "3000");

  console.log("Deploying with:", deployer.account.address);
  const deployerBal = await publicClient.getBalance({ address: deployer.account.address });
  console.log("Deployer balance:", deployerBal.toString());

  // Sanity: router must have code on this network
  const routerCode = await publicClient.getBytecode({ address: SWAP_ROUTER });
  if (routerCode === null) {
    throw new Error(`SwapRouter address has no code on ${name}: ${SWAP_ROUTER}`);
  }
  // Sanity: USDC must be a contract
  const usdcCode = await publicClient.getBytecode({ address: USDC });
  if (usdcCode === null) {
    throw new Error(`USDC address has no code on ${name}: ${USDC}`);
  }

  // Deploy using hardhat-viem helper
  const contract = await viem.deployContract("GasStation", [USDC, SWAP_ROUTER, WETH, POOL_FEE], {
    client: { wallet: deployer },
  });
  const addr = contract.address as Address;
  console.log("GasStation deployed to:", addr);

  // Note: verification is not performed here; run a separate verify task if needed.
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

// pnpm hardhat run scripts/deploy-usdc-gas-drip.ts --network base
