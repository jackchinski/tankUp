import { ethers, run, network } from "hardhat";

async function main() {
  // Resolve per-network defaults; allow env overrides
  const { chainId, name } = await ethers.provider.getNetwork();
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
      ROUTER: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    },
    // Optimism
    10: {
      // USDC.e (bridged) default; override with native USDC via env if desired
      USDC: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607",
      WETH: "0x4200000000000000000000000000000000000006",
      ROUTER: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
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

  const USDC = (envUSDC ?? netDefaults?.USDC ?? "").toLowerCase();
  const WETH = (envWETH ?? netDefaults?.WETH ?? "").toLowerCase();
  const SWAP_ROUTER = (envROUTER ?? netDefaults?.ROUTER ?? "").toLowerCase();
  // Prefer 3000 (0.3%) on Base; allow override via env
  const POOL_FEE = Number(process.env.UNI_POOL_FEE ?? "3000");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  console.log("Deployer balance:", (await deployer.provider!.getBalance(deployer.address)).toString());

  // Sanity: router must have code on this network
  const routerCode = await ethers.provider.getCode(SWAP_ROUTER);
  if (routerCode === "0x") {
    throw new Error(`SwapRouter address has no code on ${(await ethers.provider.getNetwork()).name}: ${SWAP_ROUTER}`);
  }
  // Sanity: USDC must be a contract
  const usdcCode = await ethers.provider.getCode(USDC);
  if (usdcCode === "0x") {
    throw new Error(`USDC address has no code on ${(await ethers.provider.getNetwork()).name}: ${USDC}`);
  }

  const Factory = await ethers.getContractFactory("GasStation");
  const contract = await Factory.deploy(USDC, SWAP_ROUTER, WETH, POOL_FEE);

  await contract.waitForDeployment();

  const addr = await contract.getAddress();
  console.log("GasStation deployed to:", addr);

  // Optional: wait for a few confirmations before verifying
  const tx = contract.deploymentTransaction();
  if (tx) {
    await tx.wait(5);
  }

  // Verify on Basescan/Etherscan via hardhat-verify
  const supportedForAutoVerify = new Set<number>([8453, 42161, 10]); // base, arbitrum, optimism
  if (supportedForAutoVerify.has(Number(chainId))) {
    try {
      console.log("Verifying contract...");
      await run("verify:verify", {
        address: addr,
        constructorArguments: [USDC, SWAP_ROUTER, WETH, POOL_FEE],
      });
      console.log("Verification complete on", network.name);
    } catch (e: any) {
      const msg = (e?.message || "").toLowerCase();
      if (msg.includes("already verified")) {
        console.log("Already verified. Skipping.");
      } else {
        console.error("Verification failed:", e);
      }
    }
  } else {
    console.log(
      `Skipping auto-verify on chainId ${chainId} (${name}). Configure etherscan.customChains for this network's explorer and verify manually if desired.`
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

// pnpm hardhat run scripts/deploy-usdc-gas-drip.ts --network base
