import { network } from "hardhat";
import type { Address } from "viem";
import { parseUnits, formatUnits } from "viem";

async function main() {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [wallet] = await viem.getWalletClients();
  console.log("Owner signer:", wallet.account.address);

  const GAS_STATION_ADDRESS = "0x771dffdd30cae323aff4b72a356c023c963a8236";
  if (!GAS_STATION_ADDRESS) {
    throw new Error("GAS_STATION_ADDRESS env var is required");
  }

  // Attach to GasStation (viem)
  const gasStation = await viem.getContractAt("GasStation", GAS_STATION_ADDRESS as Address, {
    client: { wallet },
  });

  // Ensure caller is the owner (drip is onlyOwner)
  const owner: string = await gasStation.read.owner();
  if (owner.toLowerCase() !== wallet.account.address.toLowerCase()) {
    throw new Error(`Caller is not owner. Owner=${owner}, caller=${wallet.account.address}`);
  }

  // Read USDC from contract and check contract's USDC balance
  const usdcAddress: Address = await gasStation.read.usdc();
  const routerAddress: Address = await gasStation.read.swapRouter();
  const wethAddress: Address = await gasStation.read.weth();
  const poolFee: number = Number(await gasStation.read.poolFee());
  console.log("GasStation config:", {
    usdc: usdcAddress,
    router: routerAddress,
    weth: wethAddress,
    poolFee,
  });
  // Sanity: router must have code on this network
  const routerCode = await publicClient.getBytecode({ address: routerAddress });
  if (routerCode === null) {
    throw new Error(`SwapRouter address has no code on ${publicClient.chain?.name ?? ""}: ${routerAddress}`);
  }

  // 0.0001 USDC (6 decimals)
  const usdcAmount = parseUnits("2.68", 6);
  const recipient = wallet.account.address as Address; // drip to deployer/same address

  const contractAddress = gasStation.address as Address;
  // Minimal ERC20 ABI for balanceOf
  const erc20Abi = [
    {
      type: "function",
      stateMutability: "view",
      name: "balanceOf",
      inputs: [{ name: "account", type: "address" }],
      outputs: [{ name: "", type: "uint256" }],
    },
  ] as const;
  const contractUsdcBalance = (await publicClient.readContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [contractAddress],
  })) as bigint;
  console.log(`Contract USDC balance: ${formatUnits(contractUsdcBalance, 6)} (need ${formatUnits(usdcAmount, 6)})`);
  if (contractUsdcBalance < usdcAmount) {
    throw new Error("Insufficient USDC balance in GasStation contract for requested drip");
  }

  console.log(
    `Calling drip(${formatUnits(usdcAmount, 6)} USDC, ${recipient}) on network:`,
    publicClient.chain?.name ?? ""
  );

  // Estimate EIP-1559 fees if available
  const fees = await publicClient.estimateFeesPerGas().catch(() => null);
  let overrides: any = { gasLimit: 750000n };
  if (fees && "maxFeePerGas" in fees && "maxPriorityFeePerGas" in fees) {
    const maxFee = fees.maxFeePerGas!;
    const maxPrio = fees.maxPriorityFeePerGas!;
    overrides = {
      ...overrides,
      maxFeePerGas: maxFee,
      maxPriorityFeePerGas: maxPrio > maxFee ? maxFee : maxPrio,
    };
  }

  const hash = await gasStation.write.drip([usdcAmount, recipient], overrides);
  console.log("Drip tx hash:", hash);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log("Drip confirmed in block:", receipt.blockNumber);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

// Run:
// pnpm hardhat run scripts/drip-op.ts --network base
