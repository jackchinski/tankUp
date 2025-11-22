import { ethers } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Owner signer:", signer.address);

  const GAS_STATION_ADDRESS = process.env.GAS_STATION_ADDRESS as string;
  if (!GAS_STATION_ADDRESS) {
    throw new Error("GAS_STATION_ADDRESS env var is required");
  }

  // Attach to GasStation
  const gasStation = await ethers.getContractAt("GasStation", GAS_STATION_ADDRESS);

  // Ensure caller is the owner (drip is onlyOwner)
  const owner: string = await gasStation.owner();
  if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    throw new Error(`Caller is not owner. Owner=${owner}, caller=${signer.address}`);
  }

  // Read USDC from contract and check contract's USDC balance
  const usdcAddress: string = await gasStation.usdc();
  const usdc = await ethers.getContractAt("IERC20", usdcAddress);
  const routerAddress: string = await gasStation.swapRouter();
  const wethAddress: string = await gasStation.weth();
  const poolFee: number = await gasStation.poolFee();
  console.log("GasStation config:", {
    usdc: usdcAddress,
    router: routerAddress,
    weth: wethAddress,
    poolFee,
  });
  // Sanity: router must have code on this network
  const routerCode = await signer.provider!.getCode(routerAddress);
  if (routerCode === "0x") {
    throw new Error(
      `SwapRouter address has no code on ${(await signer.provider!.getNetwork()).name}: ${routerAddress}`
    );
  }

  // 0.0001 USDC (6 decimals)
  const usdcAmount = ethers.parseUnits("0.0001", 6);
  const recipient = signer.address; // drip to deployer/same address

  const contractAddress = await gasStation.getAddress();
  const contractUsdcBalance = await usdc.balanceOf(contractAddress);
  console.log(
    `Contract USDC balance: ${ethers.formatUnits(contractUsdcBalance, 6)} (need ${ethers.formatUnits(usdcAmount, 6)})`
  );
  if (contractUsdcBalance < usdcAmount) {
    throw new Error("Insufficient USDC balance in GasStation contract for requested drip");
  }

  console.log(
    `Calling drip(${ethers.formatUnits(usdcAmount, 6)} USDC, ${recipient}) on network:`,
    (await signer.provider!.getNetwork()).name
  );

  const fee = await signer.provider!.getFeeData();
  const bump = (v: bigint | null | undefined, pct: bigint = 25n) => (v ? (v * (100n + pct)) / 100n : undefined);
  // Provide explicit gas + fee overrides to bypass estimator reverts
  const tx = await gasStation.drip(usdcAmount, recipient, {
    gasLimit: 750000n,
    maxFeePerGas: bump(fee.maxFeePerGas),
    maxPriorityFeePerGas: bump(fee.maxPriorityFeePerGas),
  });
  const receipt = await tx.wait(2);
  console.log("Drip tx hash:", receipt?.hash);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

// Run:
// pnpm hardhat run scripts/drip-op.ts --network base
