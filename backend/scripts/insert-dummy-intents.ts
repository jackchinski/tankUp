/**
 * Script to insert dummy completed intents for testing
 * Usage: npx tsx scripts/insert-dummy-intents.ts
 */

import { PrismaClient } from "@prisma/client";
import { initPrisma, closePrisma } from "../src/db/prisma";

const USER_ADDRESS = "0x3814f9f424874860ffcd9f70f0d4b74b81e791e8";

// USDC address on Base (for example)
const USDC_ADDRESS_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const USDC_ADDRESS_ARB = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";

// Chain IDs
const BASE_CHAIN_ID = 8453;
const ARB_CHAIN_ID = 42161;
const OP_CHAIN_ID = 10;
const POLYGON_CHAIN_ID = 137;
const WORLD_CHAIN_ID = 480;

// Helper to generate a fake tx hash
function generateTxHash(): string {
  return `0x${Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("")}`;
}

// Helper to generate a fake block number
function generateBlockNumber(): number {
  return Math.floor(Math.random() * 10000000) + 10000000;
}

async function insertDummyIntents() {
  // Set DATABASE_URL if not provided (for compatibility with existing env vars)
  if (!process.env.DATABASE_URL) {
    const dbHost = process.env.DB_HOST || "localhost";
    const dbPort = process.env.DB_PORT || "5432";
    const dbUser = process.env.DB_USER || "gasfountain";
    const dbPassword = process.env.DB_PASSWORD || "gasfountain123";
    const dbName = process.env.DB_NAME || "gasfountain";
    
    process.env.DATABASE_URL = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}?schema=public`;
    console.log(`📊 Using DATABASE_URL: postgresql://${dbUser}:***@${dbHost}:${dbPort}/${dbName}`);
  }

  const prisma = await initPrisma();

  try {
    console.log("📝 Inserting dummy completed intents...");

    // Intent 1: Base -> OP + Polygon (small amount)
    const intent1Id = generateTxHash();
    const now1 = new Date();
    now1.setDate(now1.getDate() - 2); // 2 days ago
    const completed1 = new Date(now1);
    completed1.setHours(completed1.getHours() + 1);

    await prisma.intent.create({
      data: {
        id: intent1Id,
        userAddress: USER_ADDRESS,
        sourceChainId: BASE_CHAIN_ID,
        sourceTxHash: intent1Id,
        sourceBlockNumber: generateBlockNumber(),
        tokenAddress: USDC_ADDRESS_BASE,
        tokenSymbol: "USDC",
        amountInTokenRaw: "1250000", // $1.25 (6 decimals)
        amountInUsd: "1.25",
        status: "DISPERSED",
        globalPhase: "COMPLETED",
        allocations: [
          {
            chainId: OP_CHAIN_ID,
            chainName: "Optimism",
            nativeSymbol: "ETH",
            amountUsd: "0.75",
          },
          {
            chainId: POLYGON_CHAIN_ID,
            chainName: "Polygon",
            nativeSymbol: "MATIC",
            amountUsd: "0.50",
          },
        ],
        chainStatuses: [
          {
            chainId: OP_CHAIN_ID,
            chainName: "Optimism",
            nativeSymbol: "ETH",
            amountUsd: "0.75",
            status: "CONFIRMED",
            txHash: generateTxHash(),
            explorerUrl: `https://optimistic.etherscan.io/tx/${generateTxHash()}`,
            updatedAt: completed1.toISOString(),
          },
          {
            chainId: POLYGON_CHAIN_ID,
            chainName: "Polygon",
            nativeSymbol: "MATIC",
            amountUsd: "0.50",
            status: "CONFIRMED",
            txHash: generateTxHash(),
            explorerUrl: `https://polygonscan.com/tx/${generateTxHash()}`,
            updatedAt: completed1.toISOString(),
          },
        ],
        createdAt: now1,
        updatedAt: completed1,
        completedAt: completed1,
      },
    });

    console.log(`✅ Inserted intent 1: ${intent1Id}`);

    // Intent 2: Base -> Base + Arbitrum (medium amount)
    const intent2Id = generateTxHash();
    const now2 = new Date();
    now2.setDate(now2.getDate() - 1); // 1 day ago
    const completed2 = new Date(now2);
    completed2.setHours(completed2.getHours() + 2);

    await prisma.intent.create({
      data: {
        id: intent2Id,
        userAddress: USER_ADDRESS,
        sourceChainId: BASE_CHAIN_ID,
        sourceTxHash: intent2Id,
        sourceBlockNumber: generateBlockNumber(),
        tokenAddress: USDC_ADDRESS_BASE,
        tokenSymbol: "USDC",
        amountInTokenRaw: "5000000", // $5.00 (6 decimals)
        amountInUsd: "5.00",
        status: "DISPERSED",
        globalPhase: "COMPLETED",
        allocations: [
          {
            chainId: BASE_CHAIN_ID,
            chainName: "Base",
            nativeSymbol: "ETH",
            amountUsd: "2.50",
          },
          {
            chainId: ARB_CHAIN_ID,
            chainName: "Arbitrum",
            nativeSymbol: "ETH",
            amountUsd: "2.50",
          },
        ],
        chainStatuses: [
          {
            chainId: BASE_CHAIN_ID,
            chainName: "Base",
            nativeSymbol: "ETH",
            amountUsd: "2.50",
            status: "CONFIRMED",
            txHash: generateTxHash(),
            explorerUrl: `https://basescan.org/tx/${generateTxHash()}`,
            updatedAt: completed2.toISOString(),
          },
          {
            chainId: ARB_CHAIN_ID,
            chainName: "Arbitrum",
            nativeSymbol: "ETH",
            amountUsd: "2.50",
            status: "CONFIRMED",
            txHash: generateTxHash(),
            explorerUrl: `https://arbiscan.io/tx/${generateTxHash()}`,
            updatedAt: completed2.toISOString(),
          },
        ],
        createdAt: now2,
        updatedAt: completed2,
        completedAt: completed2,
      },
    });

    console.log(`✅ Inserted intent 2: ${intent2Id}`);

    // Intent 3: Arbitrum -> OP + Polygon + World (larger amount)
    const intent3Id = generateTxHash();
    const now3 = new Date();
    now3.setHours(now3.getHours() - 6); // 6 hours ago
    const completed3 = new Date(now3);
    completed3.setHours(completed3.getHours() + 3);

    await prisma.intent.create({
      data: {
        id: intent3Id,
        userAddress: USER_ADDRESS,
        sourceChainId: ARB_CHAIN_ID,
        sourceTxHash: intent3Id,
        sourceBlockNumber: generateBlockNumber(),
        tokenAddress: USDC_ADDRESS_ARB,
        tokenSymbol: "USDC",
        amountInTokenRaw: "10000000", // $10.00 (6 decimals)
        amountInUsd: "10.00",
        status: "DISPERSED",
        globalPhase: "COMPLETED",
        allocations: [
          {
            chainId: OP_CHAIN_ID,
            chainName: "Optimism",
            nativeSymbol: "ETH",
            amountUsd: "3.50",
          },
          {
            chainId: POLYGON_CHAIN_ID,
            chainName: "Polygon",
            nativeSymbol: "MATIC",
            amountUsd: "3.00",
          },
          {
            chainId: WORLD_CHAIN_ID,
            chainName: "World Chain",
            nativeSymbol: "ETH",
            amountUsd: "3.50",
          },
        ],
        chainStatuses: [
          {
            chainId: OP_CHAIN_ID,
            chainName: "Optimism",
            nativeSymbol: "ETH",
            amountUsd: "3.50",
            status: "CONFIRMED",
            txHash: generateTxHash(),
            explorerUrl: `https://optimistic.etherscan.io/tx/${generateTxHash()}`,
            updatedAt: completed3.toISOString(),
          },
          {
            chainId: POLYGON_CHAIN_ID,
            chainName: "Polygon",
            nativeSymbol: "MATIC",
            amountUsd: "3.00",
            status: "CONFIRMED",
            txHash: generateTxHash(),
            explorerUrl: `https://polygonscan.com/tx/${generateTxHash()}`,
            updatedAt: completed3.toISOString(),
          },
          {
            chainId: WORLD_CHAIN_ID,
            chainName: "World Chain",
            nativeSymbol: "ETH",
            amountUsd: "3.50",
            status: "CONFIRMED",
            txHash: generateTxHash(),
            explorerUrl: `https://worldscan.org/tx/${generateTxHash()}`,
            updatedAt: completed3.toISOString(),
          },
        ],
        createdAt: now3,
        updatedAt: completed3,
        completedAt: completed3,
      },
    });

    console.log(`✅ Inserted intent 3: ${intent3Id}`);

    // Intent 4: Base -> All 5 chains (large amount)
    const intent4Id = generateTxHash();
    const now4 = new Date();
    now4.setHours(now4.getHours() - 2); // 2 hours ago
    const completed4 = new Date(now4);
    completed4.setHours(completed4.getHours() + 1);

    await prisma.intent.create({
      data: {
        id: intent4Id,
        userAddress: USER_ADDRESS,
        sourceChainId: BASE_CHAIN_ID,
        sourceTxHash: intent4Id,
        sourceBlockNumber: generateBlockNumber(),
        tokenAddress: USDC_ADDRESS_BASE,
        tokenSymbol: "USDC",
        amountInTokenRaw: "25000000", // $25.00 (6 decimals)
        amountInUsd: "25.00",
        status: "DISPERSED",
        globalPhase: "COMPLETED",
        allocations: [
          {
            chainId: OP_CHAIN_ID,
            chainName: "Optimism",
            nativeSymbol: "ETH",
            amountUsd: "5.00",
          },
          {
            chainId: POLYGON_CHAIN_ID,
            chainName: "Polygon",
            nativeSymbol: "MATIC",
            amountUsd: "5.00",
          },
          {
            chainId: WORLD_CHAIN_ID,
            chainName: "World Chain",
            nativeSymbol: "ETH",
            amountUsd: "5.00",
          },
          {
            chainId: BASE_CHAIN_ID,
            chainName: "Base",
            nativeSymbol: "ETH",
            amountUsd: "5.00",
          },
          {
            chainId: ARB_CHAIN_ID,
            chainName: "Arbitrum",
            nativeSymbol: "ETH",
            amountUsd: "5.00",
          },
        ],
        chainStatuses: [
          {
            chainId: OP_CHAIN_ID,
            chainName: "Optimism",
            nativeSymbol: "ETH",
            amountUsd: "5.00",
            status: "CONFIRMED",
            txHash: generateTxHash(),
            explorerUrl: `https://optimistic.etherscan.io/tx/${generateTxHash()}`,
            updatedAt: completed4.toISOString(),
          },
          {
            chainId: POLYGON_CHAIN_ID,
            chainName: "Polygon",
            nativeSymbol: "MATIC",
            amountUsd: "5.00",
            status: "CONFIRMED",
            txHash: generateTxHash(),
            explorerUrl: `https://polygonscan.com/tx/${generateTxHash()}`,
            updatedAt: completed4.toISOString(),
          },
          {
            chainId: WORLD_CHAIN_ID,
            chainName: "World Chain",
            nativeSymbol: "ETH",
            amountUsd: "5.00",
            status: "CONFIRMED",
            txHash: generateTxHash(),
            explorerUrl: `https://worldscan.org/tx/${generateTxHash()}`,
            updatedAt: completed4.toISOString(),
          },
          {
            chainId: BASE_CHAIN_ID,
            chainName: "Base",
            nativeSymbol: "ETH",
            amountUsd: "5.00",
            status: "CONFIRMED",
            txHash: generateTxHash(),
            explorerUrl: `https://basescan.org/tx/${generateTxHash()}`,
            updatedAt: completed4.toISOString(),
          },
          {
            chainId: ARB_CHAIN_ID,
            chainName: "Arbitrum",
            nativeSymbol: "ETH",
            amountUsd: "5.00",
            status: "CONFIRMED",
            txHash: generateTxHash(),
            explorerUrl: `https://arbiscan.io/tx/${generateTxHash()}`,
            updatedAt: completed4.toISOString(),
          },
        ],
        createdAt: now4,
        updatedAt: completed4,
        completedAt: completed4,
      },
    });

    console.log(`✅ Inserted intent 4: ${intent4Id}`);

    console.log("\n✨ Successfully inserted 4 dummy completed intents!");
    console.log(`👤 User address: ${USER_ADDRESS}`);
    console.log("\nYou can now test the frontend to see these intents in the activity log.");
  } catch (error) {
    console.error("❌ Error inserting dummy intents:", error);
    throw error;
  } finally {
    await closePrisma();
  }
}

// Run the script
insertDummyIntents()
  .then(() => {
    console.log("\n✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });

