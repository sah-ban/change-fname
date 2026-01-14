"use client";

import { useState } from "react";
import Image from "next/image";
import { useAccount, useConnect, useDisconnect, useWalletClient } from "wagmi";
import {
  getFidDetails,
  isNameAvailable,
  submitTransfer,
  signFarcasterNameProof,
  type FarcasterTransfer,
} from "@/lib/farcaster";

export function FnameManager() {
  const account = useAccount();
  const { connectors, connect, status, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: walletClient } = useWalletClient();

  // FID Details state
  const [fid, setFid] = useState<string>("1");
  const [fidDetails, setFidDetails] = useState<FarcasterTransfer | null>(null);
  const [isFetchingFid, setIsFetchingFid] = useState(false);
  const [fidError, setFidError] = useState<string | null>(null);

  // Revoke/Claim state
  const [newFname, setNewFname] = useState("");
  const [availability, setAvailability] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferStatus, setTransferStatus] = useState<string | null>(null);
  const [isClaimed, setIsClaimed] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(0);

  const steps = [
    { id: 1, label: "Revoke Current Name" },
    { id: 2, label: "Register New Name" },
  ];

  const handleCopyAddress = () => {
    navigator.clipboard.writeText("0x21808EE320eDF64c019A6bb0F7E4bFB3d62F06Ec");
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const validateFname = (name: string): string | null => {
    if (name.length === 0) return null;
    if (name.length > 16) return "Maximum 16 characters";
    if (!/^[a-z0-9-]+$/.test(name))
      return "Only lowercase letters, numbers, and hyphens allowed";
    if (name.startsWith("-")) return "Cannot start with a hyphen";
    if (name.endsWith("-")) return "Cannot end with a hyphen";
    if (name.includes("--")) return "Cannot have consecutive hyphens";
    return null;
  };

  const handleFetchFid = async () => {
    const fidNumber = parseInt(fid);
    if (isNaN(fidNumber)) {
      setFidError("Invalid FID");
      return;
    }
    setIsFetchingFid(true);
    setFidError(null);
    try {
      const details = await getFidDetails(fidNumber);
      setFidDetails(details);
      if (!details) {
        setFidError("FID not found");
      }
    } catch (err: unknown) {
      console.error(err);
      setFidError(
        err instanceof Error ? err.message : "Failed to fetch FID details"
      );
    } finally {
      setIsFetchingFid(false);
    }
  };

  const handleCheckAvailability = async () => {
    if (!newFname) return;
    setIsChecking(true);
    setAvailability(null);
    try {
      const available = await isNameAvailable(newFname);
      setAvailability(available);
    } catch (err) {
      console.error(err);
    } finally {
      setIsChecking(false);
    }
  };

  const handleRevokeAndClaim = async () => {
    if (!walletClient || !account.address || !fidDetails || !newFname) return;

    const fidNumber = fidDetails.to;
    setIsTransferring(true);
    setTransferError(null);
    setTransferStatus(null);
    setIsClaimed(false);
    setCurrentStep(0);

    try {
      // 1. Revoke current name if it exists and is for this FID
      if (fidDetails.username) {
        setCurrentStep(1);
        setTransferStatus(`Please sign to revoke @${fidDetails.username}...`);
        const { signature: revokeSig, timestamp: revokeTs } =
          await signFarcasterNameProof(
            walletClient,
            account.address,
            fidDetails.username
          );

        setTransferStatus(`Updating registry...`);
        await submitTransfer({
          name: fidDetails.username,
          from: fidNumber,
          to: 0,
          fid: fidNumber,
          owner: account.address,
          timestamp: revokeTs,
          signature: revokeSig as `0x${string}`,
        });
      }

      // 2. Claim new name
      setCurrentStep(2);
      setTransferStatus(`Please sign to claim @${newFname}...`);
      const { signature: claimSig, timestamp: claimTs } =
        await signFarcasterNameProof(walletClient, account.address, newFname);

      setTransferStatus(`Finalizing registration...`);
      await submitTransfer({
        name: newFname,
        from: 0,
        to: fidNumber,
        fid: fidNumber,
        owner: account.address,
        timestamp: claimTs,
        signature: claimSig as `0x${string}`,
      });

      setCurrentStep(3);
      setTransferStatus(null);
      setIsClaimed(true);
      // Refresh FID details
      handleFetchFid();
    } catch (err: unknown) {
      console.error(err);
      setTransferError(err instanceof Error ? err.message : "Transfer failed");
      setTransferStatus(null);
      setCurrentStep(0);
    } finally {
      setIsTransferring(false);
    }
  };

  if (account.status === "connected") {
    const isOwner =
      fidDetails &&
      account.address?.toLowerCase() === fidDetails.owner.toLowerCase();

    return (
      <div className="flex flex-col gap-8 w-full max-w-lg md:max-w-6xl pb-8 pt-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <div className="text-center space-y-2 mb-4">
          <h1 className="text-5xl font-black bg-linear-to-r from-white via-purple-300 to-indigo-300 bg-clip-text text-transparent italic tracking-tighter">
            Fname Manager
          </h1>
          <p className="text-zinc-400 font-medium max-w-lg mx-auto">
            A secure workspace to manage your Farcaster usernames.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Left Column: Wallet Status & FID Lookup */}
          <div className="flex flex-col gap-8">
            {/* Connected Wallet Header */}
            <div className="flex items-center justify-between p-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
              <div className="flex flex-col gap-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Connected Wallet
                </div>
                <div className="font-mono text-xs font-semibold text-white">
                  {account.address?.slice(0, 6)}...{account.address?.slice(-4)}
                </div>
              </div>
              <button
                onClick={() => disconnect()}
                className="px-3 py-1.5 text-xs font-medium text-red-400 bg-red-400/10 rounded-lg hover:bg-red-400/20 transition-colors border border-red-400/20"
              >
                Disconnect
              </button>
            </div>

            {/* FID Details Card */}
            <div className="flex flex-col gap-6 p-6 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] transition-all">
              <div>
                <h2 className="text-xl font-bold text-white">Enter your FID</h2>
              </div>

              <div className="flex flex-col gap-4">
                <div className="relative group">
                  <input
                    type="number"
                    value={fid}
                    onChange={(e) => setFid(e.target.value)}
                    className="w-full h-12 pl-4 pr-24 rounded-2xl border border-white/10 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all font-medium placeholder:text-zinc-600"
                    placeholder="FID"
                  />
                  <button
                    onClick={handleFetchFid}
                    disabled={isFetchingFid}
                    className="absolute right-1.5 top-1.5 h-9 px-4 rounded-xl bg-purple-600 text-white font-bold text-sm hover:bg-purple-500 disabled:opacity-50 transition-all shadow-lg active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isFetchingFid ? "..." : "Fetch"}
                  </button>
                </div>

                {fidError && (
                  <div className="text-sm text-red-400 flex items-center gap-2 animate-in fade-in">
                    <span className="w-1 h-1 rounded-full bg-red-400" />
                    {fidError}
                  </div>
                )}

                {fidDetails && (
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-4 animate-in zoom-in-95 duration-300">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold text-zinc-400 uppercase">
                          Username
                        </div>
                        <div className="text-sm font-bold text-white">
                          @{fidDetails.username}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold text-zinc-400 uppercase">
                          FID
                        </div>
                        <div className="text-sm font-bold text-white">
                          #{fidDetails.to}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 pt-2 border-t border-white/5">
                      <div className="text-[10px] font-bold text-zinc-400 uppercase">
                        Owner Address
                      </div>
                      <div className="font-mono text-[10px] break-all text-zinc-300">
                        {fidDetails.owner}
                      </div>
                    </div>

                    <div
                      className={`p-3 rounded-xl border flex items-center justify-center gap-3 ${
                        isOwner
                          ? "bg-green-400/10 border-green-400/20 text-green-400"
                          : "bg-orange-400/10 border-orange-400/20 text-orange-400"
                      }`}
                    >
                      <div
                        className={`shrink-0 w-2 h-2 rounded-full ${
                          isOwner
                            ? "bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]"
                            : "bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.5)]"
                        }`}
                      />
                      <span className="text-xs font-bold leading-none">
                        {isOwner
                          ? "Match Confirmed: You own this FID"
                          : "Owner Mismatch: You don't own this FID"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Management Tool for Owners */}
          <div className="w-full h-full">
            {isOwner ? (
              <div className="flex flex-col gap-6 p-6 bg-white/5 backdrop-blur-3xl border border-purple-500/20 rounded-3xl shadow-[0_8px_32px_0_rgba(147,51,234,0.1)] transition-all animate-in fade-in slide-in-from-top-4 duration-500 relative overflow-hidden group h-full">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                  <div className="w-32 h-32 rounded-full border-16 border-purple-500/30" />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-white">
                    Revoke & Claim Fname
                  </h2>
                  <p className="text-sm text-zinc-400 mt-1">
                    Seamlessly change your Farcaster name.
                  </p>
                </div>

                <div className="space-y-5">
                  <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                    <div className="text-[10px] font-bold text-zinc-400 uppercase">
                      Active Fname
                    </div>
                    <div className="text-base font-bold text-white">
                      @{fidDetails?.username || "none"}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase px-1">
                      Desired New Fname
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={newFname}
                        onChange={(e) => {
                          const val = e.target.value.toLowerCase();
                          setNewFname(val);
                          setNameError(validateFname(val));
                          setAvailability(null);
                          setIsClaimed(false);
                        }}
                        className="w-full h-12 pl-4 pr-16 rounded-2xl border border-white/10 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm placeholder:text-zinc-600"
                        placeholder="e.g. vitalik"
                      />
                      <div className="absolute right-2 top-2">
                        <button
                          onClick={handleCheckAvailability}
                          disabled={isChecking || !newFname || !!nameError}
                          className="h-8 px-3 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-500 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                        >
                          {isChecking ? (
                            "..."
                          ) : (
                            <>
                              <span className="hidden md:inline">
                                Check Availability
                              </span>
                              <span className="inline md:hidden">Check</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {nameError && (
                      <div className="text-xs font-bold px-1 text-red-400 flex items-center gap-1.5 animate-in slide-in-from-left-1">
                        <span className="w-1 h-1 rounded-full bg-red-400" />
                        {nameError}
                      </div>
                    )}

                    {availability !== null && !nameError && (
                      <div
                        className={`text-xs font-bold px-1 transition-all flex items-center gap-1.5 ${
                          availability ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {availability ? (
                          <>
                            <span className="w-1 h-1 rounded-full bg-green-400" />
                            Available to claim
                          </>
                        ) : (
                          <>
                            <span className="w-1 h-1 rounded-full bg-red-400" />
                            Already taken
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="py-2">
                    <div className="p-3 bg-orange-400/10 border border-orange-400/20 rounded-2xl">
                      <div className="flex gap-2">
                        <span className="text-base leading-none pt-0.5">
                          ⚠️
                        </span>
                        <div className="text-[11px] leading-snug font-medium text-orange-200">
                          <strong>Important:</strong> Fnames can only be changed
                          once every <strong>30 days</strong>. Ensure you have
                          the correct handle before proceeding.
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleRevokeAndClaim}
                    disabled={
                      isTransferring ||
                      isChecking ||
                      !newFname ||
                      availability !== true ||
                      !!nameError
                    }
                    className="w-full h-14 rounded-2xl bg-purple-600 text-white font-bold text-base hover:bg-purple-500 hover:shadow-lg hover:shadow-purple-500/20 transition-all disabled:opacity-50 disabled:grayscale disabled:hover:shadow-none active:scale-[0.98] shadow-md cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isTransferring ? (
                      <span className="flex items-center justify-center gap-3">
                        <svg
                          className="animate-spin h-5 w-5 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Processing...
                      </span>
                    ) : (
                      "Revoke & Claim New Name"
                    )}
                  </button>

                  {transferError && (
                    <div className="p-3 text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl font-medium animate-bounce">
                      Error: {transferError}
                    </div>
                  )}

                  {transferStatus && (
                    <div className="space-y-4 p-4 bg-white/5 rounded-2xl border border-white/10 animate-in fade-in zoom-in-95">
                      <div className="space-y-3">
                        {steps.map((step) => {
                          const isComplete = currentStep > step.id;
                          const isActive = currentStep === step.id;
                          return (
                            <div
                              key={step.id}
                              className={`flex items-center gap-3 transition-opacity ${
                                !isActive && !isComplete ? "opacity-40" : ""
                              }`}
                            >
                              <div
                                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border transition-colors ${
                                  isComplete
                                    ? "bg-green-500 border-green-500 text-white"
                                    : isActive
                                    ? "bg-purple-600 border-purple-600 text-white animate-pulse"
                                    : "bg-transparent border-white/20 text-zinc-500"
                                }`}
                              >
                                {isComplete ? "✓" : step.id}
                              </div>
                              <span
                                className={`text-[11px] font-bold ${
                                  isActive
                                    ? "text-white"
                                    : isComplete
                                    ? "text-green-400"
                                    : "text-zinc-500"
                                }`}
                              >
                                {step.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-2 px-1 pt-1">
                        <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-ping" />
                        <div className="text-xs font-bold text-purple-300">
                          {transferStatus}
                        </div>
                      </div>
                    </div>
                  )}

                  {isClaimed && (
                    <div className="p-4 bg-green-400/10 border border-green-400/20 rounded-2xl space-y-2 animate-in slide-in-from-top-2 duration-500 text-center">
                      <div className="flex items-center gap-2 text-green-300 font-bold">
                        <span>🎉</span>
                        <span>Successfully Claimed!</span>
                      </div>
                      <p className="text-xs text-green-400/80 font-medium leading-relaxed">
                        You now own <strong>@{newFname}</strong>. Head over to
                        the Farcaster app settings to select and set your new
                        name as primary.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Empty State for Right Column */
              <div className="hidden md:flex flex-col items-center justify-center p-12 bg-white/5 backdrop-blur-3xl border border-white/10 border-dashed rounded-3xl h-full min-h-110">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 text-2xl">
                  🔒
                </div>
                <h3 className="text-white font-bold">Management Tool</h3>
                <p className="text-zinc-500 text-sm text-center mt-2 max-w-xs">
                  Lookup an FID you own to unlock the name management features.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Developer Footer */}
        <div className="pt-6 border-t border-white/5 flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12">
          <div className="flex items-center gap-3">
            <a
              href="https://farcaster.xyz/cashlessman.eth"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all group"
            >
              <Image
                src="/farcaster.png"
                alt="Farcaster"
                width={20}
                height={20}
                className="w-5 h-5 group-hover:scale-110 transition-transform rounded-lg"
              />
              <span className="text-xs font-bold text-zinc-300">
                developed by{" "}
                <span className="text-white group-hover:text-purple-400 transition-colors">
                  @cashlessman.eth
                </span>
              </span>
            </a>
          </div>

          <button
            onClick={handleCopyAddress}
            className="flex items-center gap-3 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all active:scale-95 group cursor-pointer"
          >
            <div className="flex flex-col items-start">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Support Development
              </span>
              <span className="text-[10px] font-mono text-zinc-300">
                0x2180...06Ec
              </span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center group-hover:bg-purple-600 transition-colors">
              {copySuccess ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-4 h-4 text-white"
                >
                  <path d="M7.5 3.375c0-1.036.84-1.875 1.875-1.875h.375a3.75 3.75 0 0 1 3.75 3.75v1.875C13.5 8.161 14.34 9 15.375 9h1.875A3.75 3.75 0 0 1 21 12.75v3.375C21 17.16 20.16 18 19.125 18h-9.75A1.875 1.875 0 0 1 7.5 16.125V3.375Z" />
                  <path d="M15 5.25a5.23 5.23 0 0 0-1.279-3.434 9.768 9.768 0 0 1 6.963 6.963A5.23 5.23 0 0 0 17.25 7.5h-1.875A.375.375 0 0 1 15 7.125V5.25ZM4.875 6H6v10.125A3.375 3.375 0 0 0 9.375 19.5H16.5v1.125c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 0 1 3 20.625V7.875C3 6.839 3.84 6 4.875 6Z" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-4 h-4 text-zinc-400 group-hover:text-white"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75"
                  />
                </svg>
              )}
            </div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8 py-8 animate-in fade-in zoom-in-95 duration-700 min-h-screen justify-center w-full max-w-lg md:max-w-6xl px-4">
      <div className="text-center space-y-2 mb-4">
        <h1 className="text-5xl font-black bg-linear-to-r from-white via-purple-300 to-indigo-300 bg-clip-text text-transparent italic tracking-tighter">
          Fname Manager
        </h1>
        <p className="text-zinc-400 font-medium max-w-lg mx-auto">
          A secure workspace to manage your Farcaster usernames.
        </p>
      </div>

      <div className="max-w-sm mx-auto p-4 bg-orange-400/10 border border-orange-400/20 rounded-2xl animate-in fade-in slide-in-from-top-4 duration-1000">
        <p className="text-xs font-medium text-orange-200 text-center leading-relaxed">
          Please import your <strong>Farcaster recovery phrase</strong> into a
          wallet (e.g. MetaMask, Rainbow) and then connect that wallet to manage
          your Farcaster username(fname).
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {connectors.map((connector) => (
          <button
            key={connector.uid}
            onClick={() => connect({ connector })}
            className="group relative flex h-14 w-64 items-center justify-between px-6 bg-white text-zinc-950 rounded-2xl font-bold transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-purple-500/20 cursor-pointer"
          >
            <span>Connect {connector.name}</span>
            <span className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300">
              →
            </span>
          </button>
        ))}
      </div>

      {status === "pending" && (
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.3s]" />
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.15s]" />
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" />
          </div>
          <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest px-2">
            Waiting for wallet...
          </div>
        </div>
      )}

      {error && (
        <div className="px-4 py-2 bg-red-400/10 text-red-400 text-xs font-bold rounded-full border border-red-400/20 text-center">
          {error.message}
        </div>
      )}

      {/* Developer Footer */}
      <div className="mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 w-full">
        <div className="flex items-center gap-3">
          <a
            href="https://farcaster.xyz/cashlessman.eth"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all group"
          >
            <Image
              src="/farcaster.png"
              alt="Farcaster"
              width={20}
              height={20}
              className="w-5 h-5 group-hover:scale-110 transition-transform rounded-lg"
            />
            <span className="text-xs font-bold text-zinc-300">
              developed by{" "}
              <span className="text-white group-hover:text-purple-400 transition-colors">
                @cashlessman.eth
              </span>
            </span>
          </a>
        </div>

        <button
          onClick={handleCopyAddress}
          className="flex items-center gap-3 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all active:scale-95 group cursor-pointer"
        >
          <div className="flex flex-col items-start">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Support Development
            </span>
            <span className="text-[10px] font-mono text-zinc-300">
              0x2180...06Ec
            </span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center group-hover:bg-purple-600 transition-colors">
            {copySuccess ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-4 h-4 text-white"
              >
                <path d="M7.5 3.375c0-1.036.84-1.875 1.875-1.875h.375a3.75 3.75 0 0 1 3.75 3.75v1.875C13.5 8.161 14.34 9 15.375 9h1.875A3.75 3.75 0 0 1 21 12.75v3.375C21 17.16 20.16 18 19.125 18h-9.75A1.875 1.875 0 0 1 7.5 16.125V3.375Z" />
                <path d="M15 5.25a5.23 5.23 0 0 0-1.279-3.434 9.768 9.768 0 0 1 6.963 6.963A5.23 5.23 0 0 0 17.25 7.5h-1.875A.375.375 0 0 1 15 7.125V5.25ZM4.875 6H6v10.125A3.375 3.375 0 0 0 9.375 19.5H16.5v1.125c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 0 1 3 20.625V7.875C3 6.839 3.84 6 4.875 6Z" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-4 h-4 text-zinc-400 group-hover:text-white"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75"
                />
              </svg>
            )}
          </div>
        </button>
      </div>
    </div>
  );
}
