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

  console.log("🔍 Fetching history from:", url);
  console.log("📋 Options:", options);

  try {
    const response = await fetch(url);

    if (!response.ok) {
      // Try to parse error, but don't fail if it's not JSON
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      console.error("❌ History fetch error:", error);
      throw new Error(
        error.error || `Failed to fetch history: ${response.statusText}`
      );
    }

    const data = await response.json();
    console.log("✅ History response:", {
      itemsCount: data.items?.length || 0,
      items: data.items,
      nextCursor: data.nextCursor,
    });
    // Ensure we always return a valid response with items array
    return {
      items: data.items || [],
      nextCursor: data.nextCursor,
    };
  } catch (err) {
    // Handle network errors (CORS, connection refused, etc.)
    if (err instanceof TypeError && err.message.includes("fetch")) {
      throw new Error(
        "Failed to connect to server. Please check your connection."
      );
    }
    throw err;
  }
}
