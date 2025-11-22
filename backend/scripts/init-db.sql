-- Gas Fountain Database Schema

-- Create intents table
CREATE TABLE IF NOT EXISTS intents (
  id VARCHAR(66) PRIMARY KEY, -- txHash (0x + 64 hex chars)
  user_address VARCHAR(42) NOT NULL,
  source_chain_id INTEGER NOT NULL,
  source_tx_hash VARCHAR(66) NOT NULL,
  source_block_number INTEGER,
  token_address VARCHAR(42) NOT NULL,
  token_symbol VARCHAR(20),
  amount_in_token_raw VARCHAR(78) NOT NULL, -- bigint string
  amount_in_usd VARCHAR(50) NOT NULL, -- decimal string
  status VARCHAR(30) NOT NULL,
  global_phase VARCHAR(30) NOT NULL,
  allocations JSONB NOT NULL, -- array of DestinationAllocation
  chain_statuses JSONB NOT NULL, -- array of ChainDispersal
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_intents_user_address ON intents(user_address);
CREATE INDEX IF NOT EXISTS idx_intents_status ON intents(status);
CREATE INDEX IF NOT EXISTS idx_intents_created_at ON intents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_intents_source_chain_id ON intents(source_chain_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_intents_updated_at
  BEFORE UPDATE ON intents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

