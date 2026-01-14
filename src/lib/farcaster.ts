import { type WalletClient } from "viem";

export async function signFarcasterNameProof(
  walletClient: WalletClient,
  account: `0x${string}`,
  name: string
) {
  const timestamp = Math.floor(Date.now() / 1000);

  const claim = {
    name,
    owner: account,
    timestamp,
  };

  // Farcaster EIP-712 Domain for fnames
  const domain = {
    name: "Farcaster name verification",
    version: "1",
    chainId: 1,
    verifyingContract: "0xe3be01d99baa8db9905b33a3ca391238234b79d1",
  } as const;

  const types = {
    UserNameProof: [
      { name: "name", type: "string" },
      { name: "timestamp", type: "uint256" },
      { name: "owner", type: "address" },
    ],
  } as const;

  const signature = await walletClient.signTypedData({
    account,
    domain,
    types,
    primaryType: "UserNameProof",
    message: {
      name,
      owner: account,
      timestamp: BigInt(timestamp),
    },
  });

  return {
    claim,
    signature,
    timestamp,
  };
}
export interface FarcasterTransfer {
  id: number;
  timestamp: number;
  username: string;
  owner: `0x${string}`;
  from: number;
  to: number;
  user_signature: string;
  server_signature: string;
}

export async function getFidDetails(
  fid: number
): Promise<FarcasterTransfer | null> {
  try {
    const response = await fetch(
      `https://fnames.farcaster.xyz/transfers?fid=${fid}`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch FID details: ${response.statusText}`);
    }
    const data = await response.json();
    const transfers = data.transfers as FarcasterTransfer[];

    // Return the latest transfer
    if (transfers && transfers.length > 0) {
      return transfers[transfers.length - 1];
    }

    return null;
  } catch (error) {
    console.error("Error fetching FID details:", error);
    throw error;
  }
}

export interface TransferParams {
  name: string;
  from: number;
  to: number;
  fid: number;
  owner: `0x${string}`;
  timestamp: number;
  signature: `0x${string}`;
}

export async function isNameAvailable(name: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://fnames.farcaster.xyz/transfers?name=${name}`
    );
    if (!response.ok) return true; // Assume available if error or not found
    const data = await response.json();
    const transfers = data.transfers as FarcasterTransfer[];

    if (!transfers || transfers.length === 0) return true;

    const latest = transfers[transfers.length - 1];
    return latest.to === 0; // Available if latest transfer was to 0 (unregistered)
  } catch (error) {
    console.error("Error checking name availability:", error);
    return true;
  }
}

export async function submitTransfer(params: TransferParams): Promise<void> {
  const response = await fetch("https://fnames.farcaster.xyz/transfers", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Transfer failed: ${response.statusText}`
    );
  }
}
