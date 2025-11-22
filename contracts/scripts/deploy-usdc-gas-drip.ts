import { ethers, run, network } from "hardhat";

async function main() {
  // Base mainnet addresses
  const USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
  const SWAP_ROUTER = "0x2626664c2603336e57b271c5c0b26f421741e481";
  const WETH = "0x4200000000000000000000000000000000000006";
  const POOL_FEE = 500; // 0.05%

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  console.log("Deployer balance:", (await deployer.provider!.getBalance(deployer.address)).toString());

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
