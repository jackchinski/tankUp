import { ethers, run, network } from "hardhat";

async function main() {
  // Base mainnet addresses
  const USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
  // Uniswap V3 SwapRouter (canonical) — same address on many chains, incl. Base
  // Allow override via env SWAP_ROUTER if you want a custom router
  const SWAP_ROUTER = "0x2626664c2603336E57B271c5C0b26F421741e481";
  const WETH = "0x4200000000000000000000000000000000000006";
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
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

// pnpm hardhat run scripts/deploy-usdc-gas-drip.ts --network base
