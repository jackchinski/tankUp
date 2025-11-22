import "dotenv/config";
import { ethers } from "ethers";

const CONTRACT_ADDRESS = "0xEfE0B3eFB879891D16145B93f21369ddE8FAaA15";
const ABI = ["event Deposited(address indexed user, uint256 totalAmount, uint256[] chainIds, uint256[] chainAmounts)"];

function logDepositedEvent(
  evt:
    | {
        user: string;
        totalAmount: bigint;
        chainIds: readonly bigint[];
        chainAmounts: readonly bigint[];
        event: ethers.EventLog | ethers.Log;
      }
    | {
        user: string;
        totalAmount: bigint;
        chainIds: readonly bigint[];
        chainAmounts: readonly bigint[];
        txHash?: string;
        blockNumber?: number;
      }
): void {
  const { user, totalAmount, chainIds, chainAmounts } = evt;
  const txHash =
    "event" in evt && "transactionHash" in evt.event
      ? evt.event.transactionHash
      : "txHash" in evt
      ? evt.txHash
      : undefined;
  const blockNumber =
    "event" in evt && "blockNumber" in evt.event
      ? evt.event.blockNumber
      : "blockNumber" in evt
      ? evt.blockNumber
      : undefined;

  const details = {
    txHash,
    blockNumber,
    user,
    totalAmount: totalAmount.toString(),
    chainIds: chainIds.map((x) => x.toString()),
    chainAmounts: chainAmounts.map((x) => x.toString()),
  };
  console.log("Deposited event:", details);
}

function getLogKey(
  from: ethers.EventLog | ethers.Log | { transactionHash?: string; index?: number; logIndex?: number }
): string | undefined {
  const txHash = (from as any).transactionHash as string | undefined;
  const index = (from as any).index ?? (from as any).logIndex;
  if (typeof txHash === "string" && typeof index === "number") {
    return `${txHash}-${index}`;
  }
  return undefined;
}

async function main(): Promise<void> {
  const rpcUrl = process.env.BASE_RPC_URL;
  if (!rpcUrl) {
    console.error("Missing BASE_RPC_URL in .env");
    process.exit(1);
  }

  const wsUrl = process.env.BASE_WS_URL;
  const pollingIntervalMs =
    process.env.POLLING_INTERVAL_MS !== undefined ? Number(process.env.POLLING_INTERVAL_MS) : 4000;

  // In-memory deduplication of logs within a single process lifetime
  const seenLogKeys = new Set<string>();

  if (wsUrl) {
    // Preferred: WebSocket subscriptions (no eth_newFilter / filter eviction)
    const wsProvider = new ethers.WebSocketProvider(wsUrl);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wsProvider);

    console.log(`Listening (WebSocket) for Deposited on ${CONTRACT_ADDRESS}...`);

    contract.on(
      "Deposited",
      (
        user: string,
        totalAmount: bigint,
        chainIds: readonly bigint[],
        chainAmounts: readonly bigint[],
        event: ethers.EventLog | ethers.Log
      ) => {
        const key = getLogKey(event);
        if (key && seenLogKeys.has(key)) {
          return;
        }
        if (key) {
          seenLogKeys.add(key);
        }
        logDepositedEvent({ user, totalAmount, chainIds, chainAmounts, event });
      }
    );

    const shutdown = async () => {
      console.log("Shutting down listener...");
      contract.removeAllListeners();
      try {
        await wsProvider.destroy();
      } catch {
        // ignore
      }
      process.exit(0);
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
    return;
  }

  // Fallback: HTTP polling without filters using getLogs over new blocks
  const httpProvider = new ethers.JsonRpcProvider(rpcUrl);
  httpProvider.pollingInterval = pollingIntervalMs;
  const iface = new ethers.Interface(ABI);
  const topic = ethers.id("Deposited(address,uint256,uint256[],uint256[])");

  let lastProcessedBlock = await httpProvider.getBlockNumber();
  console.log(
    `Listening (HTTP getLogs) for Deposited on ${CONTRACT_ADDRESS} starting at block ${
      lastProcessedBlock + 1
    } (polling ${pollingIntervalMs}ms)...`
  );

  const onBlock = async (blockNumber: number) => {
    try {
      const fromBlock = lastProcessedBlock + 1;
      const toBlock = blockNumber;
      if (toBlock < fromBlock) {
        return;
      }

      const logs = await httpProvider.getLogs({
        address: CONTRACT_ADDRESS,
        topics: [topic],
        fromBlock,
        toBlock,
      });

      for (const log of logs) {
        try {
          const parsed = iface.parseLog(log);
          if (!parsed) {
            continue;
          }
          const key = getLogKey(log);
          if (key && seenLogKeys.has(key)) {
            continue;
          }
          if (key) {
            seenLogKeys.add(key);
          }
          // args: [user, totalAmount, chainIds, chainAmounts]
          const user = parsed.args[0] as string;
          const totalAmount = parsed.args[1] as bigint;
          const chainIds = parsed.args[2] as readonly bigint[];
          const chainAmounts = parsed.args[3] as readonly bigint[];
          logDepositedEvent({
            user,
            totalAmount,
            chainIds,
            chainAmounts,
            txHash: log.transactionHash,
            blockNumber: log.blockNumber ?? undefined,
          });
        } catch (e) {
          console.error("Failed to parse log", e);
        }
      }

      lastProcessedBlock = toBlock;
    } catch (e) {
      console.error("Block handler error", e);
    }
  };

  httpProvider.on("block", onBlock);

  const shutdown = () => {
    console.log("Shutting down listener...");
    httpProvider.removeAllListeners();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

// run with
// pnpm run start
