import { ethers } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Using signer:", signer.address);

  // Deployed GasStation address (on the current --network)
  const GAS_STATION_ADDRESS = process.env.GAS_STATION_ADDRESS as string;
  if (!GAS_STATION_ADDRESS) {
    throw new Error("GAS_STATION_ADDRESS env var is required");
  }

  // Attach to GasStation
  const gasStation = await ethers.getContractAt("GasStation", GAS_STATION_ADDRESS);

  // Read USDC address from the contract to avoid mismatches
  const usdcAddress: string = await gasStation.usdc();
  const usdc = await ethers.getContractAt("IERC20", usdcAddress);

  // Send 0.001 USDC (USDC has 6 decimals)
  const amount = ethers.parseUnits("0.001", 6);
  const chainIds = [10]; // Optimism chainId
  const chainAmounts = [amount];

  // Sanity checks
  const balance = await usdc.balanceOf(signer.address);
  if (balance < amount) {
    throw new Error(
      `Insufficient USDC balance. Have=${ethers.formatUnits(balance, 6)} needed=${ethers.formatUnits(amount, 6)}`
    );
  }

  // Ensure allowance
  const currentAllowance = await usdc.allowance(signer.address, GAS_STATION_ADDRESS);
  if (currentAllowance < amount) {
    console.log("Setting allowance...");

    const bumpGas = (v?: bigint, pct: bigint = 20n) => (v ? (v * (100n + pct)) / 100n : undefined);

    const approveWithBump = async (value: bigint, pct: bigint) => {
      const fee = await signer.provider!.getFeeData();
      return usdc.approve(GAS_STATION_ADDRESS, value, {
        maxFeePerGas: bumpGas(fee.maxFeePerGas ?? undefined, pct),
        maxPriorityFeePerGas: bumpGas(fee.maxPriorityFeePerGas ?? undefined, pct),
      });
    };

    // Reset to 0 first (USDC-style safety), wait for 2 confs
    try {
      const resetTx = await approveWithBump(0n, 20n);
      await resetTx.wait(2);
    } catch (e: any) {
      const msg = (e?.message || "").toLowerCase();
      if (msg.includes("replacement transaction underpriced") || msg.includes("nonce too low")) {
        console.log("Retrying reset(0) with higher gas...");
        const resetTx2 = await approveWithBump(0n, 40n);
        await resetTx2.wait(2);
      } else {
        throw e;
      }
    }

    // Set target allowance, wait for 2 confs; retry on underpriced
    try {
      const approveTx = await approveWithBump(amount, 20n);
      await approveTx.wait(2);
    } catch (e: any) {
      const msg = (e?.message || "").toLowerCase();
      if (msg.includes("replacement transaction underpriced") || msg.includes("nonce too low")) {
        console.log("Retrying approve(amount) with higher gas...");
        const approveTx2 = await approveWithBump(amount, 40n);
        await approveTx2.wait(2);
      } else {
        throw e;
      }
    }
  }

  console.log(
    `Depositing ${ethers.formatUnits(amount, 6)} USDC with chainIds=${JSON.stringify(
      chainIds
    )} chainAmounts=[${ethers.formatUnits(amount, 6)}]`
  );

  const tx = await gasStation.deposit(amount, chainIds, chainAmounts);
  const receipt = await tx.wait();
  console.log("Deposit tx hash:", receipt?.hash);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

// Run:
// pnpm hardhat run scripts/deposit-op.ts --network base
