import { GetStatusResponse, GetHistoryResponse, IntentStatus } from "../types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export async function fetchIntentStatus(
  intentId: string
): Promise<GetStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/status/${intentId}`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Intent not found: ${intentId}`);
    }
    const error = await response
      .json()
      .catch(() => ({ error: "Unknown error" }));
    throw new Error(
      error.error || `Failed to fetch intent status: ${response.statusText}`
    );
  }

  return response.json();
}

export interface FetchHistoryOptions {
  userAddress?: string;
  status?: IntentStatus;
  limit?: number;
  cursor?: string;
}

export async function fetchHistory(
  options: FetchHistoryOptions = {}
): Promise<GetHistoryResponse> {
  const params = new URLSearchParams();

  if (options.userAddress) {
    params.append("userAddress", options.userAddress);
  }
  if (options.status) {
    params.append("status", options.status);
  }
  if (options.limit) {
    params.append("limit", options.limit.toString());
  }
  if (options.cursor) {
    params.append("cursor", options.cursor);
  }

  const queryString = params.toString();
  const url = `${API_BASE_URL}/history${queryString ? `?${queryString}` : ""}`;

  const response = await fetch(url);

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Unknown error" }));
    throw new Error(
      error.error || `Failed to fetch history: ${response.statusText}`
    );
  }

  return response.json();
}
