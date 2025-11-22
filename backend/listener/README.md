## GasStation Deposited Event Listener

Listens to `Deposited(address indexed user, uint256 totalAmount, uint256[] chainIds, uint256[] chainAmounts)` events from `0xEfE0B3eFB879891D16145B93f21369ddE8FAaA15` on Base and logs the details.

### Setup

- Copy `env.example` to `.env` and set your Base RPC URL.
  - Example (Alchemy): `https://base-mainnet.g.alchemy.com/v2/YOUR_KEY`
  - Example (Infura): `https://base-mainnet.infura.io/v3/YOUR_KEY`

```bash
cd listener
cp env.example .env
npm i
```

### Run

- One-off:

```bash
npx --yes tsx src/index.ts
```

- Or via npm script:

```bash
npm run start
```

### Notes

- Uses an HTTP JSON-RPC provider with polling. You can tweak `POLLING_INTERVAL_MS` in `.env`. A WebSocket URL is not required.
