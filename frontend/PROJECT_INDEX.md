# Project Index

This document provides an overview of the project structure and available exports.

## Project Structure

```
src/
├── components/       # React components
├── config/          # Configuration files (wagmi, appkit)
├── context/         # React context providers
├── data/            # Static data (chains, tokens)
├── hooks/           # Custom React hooks
├── providers/       # Provider components
├── types/           # TypeScript type definitions
└── index.ts         # Main barrel export file
```

## Index Files

All directories now have `index.ts` files that provide barrel exports for cleaner imports:

### Components (`components/index.ts`)
- `ActivityLog`
- `ChainSelectorModal`
- `Header`
- `Layout`
- `Step1Destinations`
- `Step2Execution`
- `Step2Source`
- `Step3Review`
- `Stepper`
- `TokenSelectorModal`
- `VisualizationCanvas`

### Hooks (`hooks/index.ts`)
- `useTokenBalances`

### Data (`data/index.ts`)
- `chains` - Chain configuration data
- `getViemChain` - Helper to get viem chain object
- `chainIdMap` - Chain ID mapping
- `tokens` - Token configuration data
- `getTokenAddress` - Helper to get token address for a chain
- `getTokensForChain` - Helper to get all tokens for a chain

### Context (`context/index.ts`)
- `GasFountainProvider` - Main context provider
- `useGasFountain` - Hook to access context

### Providers (`providers/index.ts`)
- `WalletProvider` - Wallet connection provider

### Config (`config/index.ts`)
- `appKitConfig` - AppKit configuration
- `appKit` - AppKit instance
- `supportedChains` - Supported chain configurations

### Types (`types/index.ts`)
- `ChainData` - Chain data interface
- `Token` - Token interface
- `GasFountainContextType` - Context type definition
- `HistoryItem` - History item interface
- `GasFountainProviderProps` - Provider props interface

## Usage Examples

### Before (direct imports)
```typescript
import { GasFountainProvider } from "./context/GasFountainContext";
import { chains } from "./data/chains";
import { useTokenBalances } from "./hooks/useTokenBalances";
```

### After (barrel exports)
```typescript
import { GasFountainProvider } from "./context";
import { chains } from "./data";
import { useTokenBalances } from "./hooks";
```

### Or from main index
```typescript
import { GasFountainProvider, chains, useTokenBalances } from "./";
```

## Benefits

1. **Cleaner imports** - Shorter import paths
2. **Better organization** - Clear module boundaries
3. **Easier refactoring** - Change file locations without updating all imports
4. **Better IDE support** - Autocomplete works better with barrel exports

