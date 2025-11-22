# Gas Fountain Backend

Backend API for Gas Fountain - a service that disperses native gas tokens to multiple destination chains from a single deposit.

## Architecture

- **Escrow contracts** deployed on each chain emit `Deposited` events
- An **indexer** listens to these events and POSTs them to `POST /event`
- The **backend** processes events, creates intents, and manages dispersal status
- The **frontend** reads status via `GET /status/:intentId` and `GET /history`

## Setup

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
npm install
```

### Development

```bash
# Run in development mode with hot reload
npm run dev

# Or build and run
npm run build
npm start
```

The server will start on `http://localhost:3000` by default.

## API Endpoints

### `GET /status/:intentId`

Get the current status of a deposit intent.

**Path Parameters:**
- `intentId` (string): The deposit transaction hash (0x-prefixed hex string)

**Response 200:**
```json
{
  "intent": {
    "id": "0x...",
    "userAddress": "0x...",
    "sourceChainId": 1,
    "sourceTxHash": "0x...",
    "amountInUsd": "100.00",
    "status": "DISPERSE_IN_PROGRESS",
    "globalPhase": "DISPERSING",
    "chainStatuses": [
      {
        "chainId": 10,
        "chainName": "Optimism",
        "nativeSymbol": "OP",
        "amountUsd": "50.00",
        "status": "CONFIRMED",
        "txHash": "0x...",
        "explorerUrl": "https://...",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Errors:**
- `400`: Invalid intentId format
- `404`: Intent not found

### `GET /history`

Get a list of previous deposit intents.

**Query Parameters:**
- `userAddress` (optional, string): Filter by user address
- `status` (optional, enum): Filter by intent status
- `limit` (optional, number): Number of results (default: 20, max: 100)
- `cursor` (optional, string): Pagination cursor

**Response 200:**
```json
{
  "items": [
    {
      "id": "0x...",
      "userAddress": "0x...",
      "sourceChainId": 1,
      "amountInUsd": "100.00",
      "status": "DISPERSED",
      "numChains": 2,
      "chains": [...]
    }
  ],
  "nextCursor": "0x..."
}
```

### `POST /event`

Receive a deposit event from the indexer. This is the only way intents are created.

**Headers:**
- `X-Indexer-Secret` (optional for now, will be required in production)

**Request Body:**
```json
{
  "chainId": 1,
  "txHash": "0x...",
  "logIndex": 0,
  "blockNumber": 12345678,
  "blockTimestamp": 1704067200,
  "eventName": "Deposited",
  "data": {
    "user": "0x...",
    "token": "0x...",
    "amountTokenRaw": "100000000",
    "amountUsd": "100.00",
    "allocations": [
      {
        "destChainId": 10,
        "amountUsd": "50.00"
      },
      {
        "destChainId": 42161,
        "amountUsd": "50.00"
      }
    ]
  }
}
```

**Response 200:**
```json
{
  "ok": true,
  "intentId": "0x...",
  "newStatus": "DISPERSE_QUEUED"
}
```

**Errors:**
- `400`: Invalid payload or validation error
- `401`: Invalid or missing indexer secret (stubbed for now)

## Status Flow

1. **DEPOSIT_CONFIRMED**: Event received and intent created
2. **DISPERSE_QUEUED**: Dispersal jobs created for each destination chain
3. **DISPERSE_IN_PROGRESS**: At least one destination transaction broadcast
4. **DISPERSED**: All destination transactions confirmed
5. **FAILED**: Unrecoverable error occurred

## Global Phases

- **DEPOSIT_CONFIRMED**: On-chain deposit seen
- **PREPARING_SWAP**: Building transactions / getting quotes
- **SWAPPING**: Converting USDC -> native tokens
- **DISPERSING**: Sending native tokens to user on destination chains
- **COMPLETED**: All confirmed
- **FAILED**: Unrecoverable error

## Development Notes

### Current Implementation

- **Storage**: In-memory store (data lost on restart)
- **Dispersal**: Stubbed (no actual blockchain calls)

### TODO for Production

1. **Database**: Replace `InMemoryIntentStore` with PostgreSQL/MongoDB
2. **Dispersal Logic**: Implement actual blockchain interactions:
   - Swap service integration (USDC -> native)
   - Transaction building and broadcasting
   - Transaction confirmation tracking
3. **Indexer Authentication**: Implement `X-Indexer-Secret` header validation
4. **Error Handling**: Add retry logic and better error recovery
5. **Job Queue**: Use Bull/BullMQ for async dispersal processing
6. **Monitoring**: Add logging, metrics, and health checks

## Project Structure

```
src/
  types/          # TypeScript type definitions
  store/          # Data persistence layer (currently in-memory)
  services/       # Business logic (status transitions, dispersal)
  routes/         # Fastify route handlers
  index.ts        # Server entry point
```

## Environment Variables

- `PORT`: Server port (default: 3000)
- `HOST`: Server host (default: 0.0.0.0)
- `INDEXER_SECRET`: Secret for indexer authentication (TODO)
