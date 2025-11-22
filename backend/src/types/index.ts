// Status enums
export type IntentStatus =
  | "DEPOSIT_CONFIRMED" // deposit event seen and validated
  | "DISPERSE_QUEUED" // dispersal jobs created for each chain
  | "DISPERSE_IN_PROGRESS" // at least one destination tx broadcast, not all confirmed
  | "DISPERSED" // all destination txs confirmed
  | "FAILED"; // unrecoverable failure

export type ChainDispersalStatus =
  | "NOT_STARTED"
  | "QUEUED"
  | "BROADCASTED"
  | "CONFIRMED"
  | "FAILED";

export type GlobalPhase =
  | "DEPOSIT_CONFIRMED" // we've seen the on-chain deposit
  | "PREPARING_SWAP" // building txs / quotes
  | "SWAPPING" // doing USDC -> native swaps
  | "DISPERSING" // sending native to user on dest chains
  | "COMPLETED" // all confirmed
  | "FAILED"; // some unrecoverable error

// Allocations and per-chain status
export interface DestinationAllocation {
  chainId: number;
  chainName?: string; // optional convenience for FE
  nativeSymbol?: string; // e.g. "ETH", "OP"
  amountUsd: string; // decimal string, e.g. "20.00"
  estNativeAmount?: string; // optional decimal string
}

export interface ChainDispersal extends DestinationAllocation {
  status: ChainDispersalStatus;
  txHash?: string;
  explorerUrl?: string;
  gasUsed?: string; // bigint string
  errorMessage?: string;
  updatedAt: string; // ISO timestamp
}

// DepositIntent - we treat each Deposited event as a DepositIntent
export interface DepositIntent {
  id: string; // intentId; we use the deposit tx hash here
  userAddress: string;
  sourceChainId: number;
  sourceTxHash: string; // equals id; kept explicit
  sourceBlockNumber?: number;
  tokenAddress: string; // deposited token (e.g. USDC)
  tokenSymbol?: string;
  amountInTokenRaw: string; // bigint string in token units
  amountInUsd: string; // decimal string, e.g. "100.00"
  status: IntentStatus;
  globalPhase: GlobalPhase;
  allocations: DestinationAllocation[]; // desired split (as emitted by event)
  chainStatuses: ChainDispersal[]; // per-chain status (dynamic)
  createdAt: string; // ISO timestamp (when first seen)
  updatedAt: string;
  completedAt?: string; // when moved to DISPERSED or FAILED
}

// API error shape
export interface ApiError {
  error: string; // human-readable
  code: string; // e.g. "NOT_FOUND", "VALIDATION_ERROR"
  details?: any;
}

// Event payload from indexer
export interface DepositEventAllocationPayload {
  destChainId: number;
  amountUsd: string; // decimal string, e.g. "20.00"
}

export interface DepositEventPayload {
  chainId: number; // source chain id
  txHash: string; // deposit tx hash (will become intentId)
  logIndex: number;
  blockNumber: number;
  blockTimestamp?: number; // seconds since epoch
  eventName: "Deposited";
  data: {
    user: string;
    token: string;
    amountTokenRaw: string; // bigint string
    amountUsd: string; // decimal string for UX
    allocations: DepositEventAllocationPayload[];
  };
}

// API response types
export interface GetStatusResponse {
  intent: DepositIntent;
}

export interface HistoryEntry {
  id: string;
  userAddress: string;
  sourceChainId: number;
  sourceTxHash: string;
  tokenSymbol?: string;
  amountInUsd: string;
  status: IntentStatus;
  createdAt: string;
  completedAt?: string;
  numChains: number;
  chains: {
    chainId: number;
    chainName?: string;
    amountUsd: string;
    status: ChainDispersalStatus;
  }[];
}

export interface GetHistoryResponse {
  items: HistoryEntry[];
  nextCursor?: string;
}

export interface PostEventResponse {
  ok: true;
  intentId: string; // the txHash we used as id
  newStatus: IntentStatus;
}
