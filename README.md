# Fname Manager

This tool allows users to look up Farcaster IDs (FIDs), verify ownership, and seamlessly revoke and claim new handles in a single workflow.

## Features

- **🔍 FID Lookup**: Instantly fetch details for any Farcaster ID and automatically compare the owner address with your connected wallet to verify ownership.
- **✅ Real-time Validation**: Strict enforcement of Farcaster handle rules (length, characters, and availability) before you commit.
- **🔄 Atomic Revoke & Claim**: A granular two-step workflow that guides you through revoking your old handle and claiming a new one.
- **📱 Fully Responsive**: Optimized for both desktop and mobile screens.
- **🛡️ Security First**: Client-side signing using standard EIP-712 proofs to ensure you maintain full control over your identity.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- An Ethereum wallet (MetaMask, Rainbow, etc.) containing your Farcaster recovery phrase.

### Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/sah-ban/change-fname.git
    cd change-fname
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Run the development server:**

    ```bash
    npm run dev
    ```

4.  **Open the app:**
    Navigate to [http://localhost:3000](http://localhost:3000).

## Usage

1.  **Connect Wallet**: Import your Farcaster recovery phrase into your wallet and connect.
2.  **Enter FID**: Enter the Farcaster ID you own to unlock management features.
3.  **Check Availability**: Type your desired new handle and check if it's available.
4.  **Revoke & Claim**: Follow the on-screen prompts to sign the revoke and claim proofs.

## Developed By

Built with ❤️ by **[@cashlessman.eth](https://farcaster.xyz/cashlessman.eth)**.

If you find this tool useful, consider supporting development:
`0x21808EE320eDF64c019A6bb0F7E4bFB3d62F06Ec`

## License

MIT
