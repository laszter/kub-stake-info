"use client";

import { useState, useCallback } from "react";
import { useConfig } from "wagmi";
import {
  simulateContract,
  writeContract,
  waitForTransactionReceipt,
} from "wagmi/actions";
import type { Abi } from "viem";
import { BaseError } from "viem";

export type TxStatus = "idle" | "simulating" | "pending" | "confirming" | "success" | "error";

export interface TxParams {
  address: `0x${string}`;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
  account: `0x${string}`;
  chainId: number;
}

/** Keep an unrecognized chain error readable instead of dumping a revert trace. */
function clampMessage(msg: string): string {
  const firstLine = msg.split("\n")[0].trim();
  return firstLine.length > 160 ? `${firstLine.slice(0, 157)}…` : firstLine;
}

export function prettyError(e: unknown): string {
  if (e instanceof BaseError) {
    const msg = e.shortMessage || e.message;
    if (/user rejected|denied|rejected the request/i.test(msg))
      return "Transaction rejected in your wallet.";
    if (/insufficient funds/i.test(msg))
      return "Insufficient KUB to cover the amount plus gas.";
    return clampMessage(msg);
  }
  if (e instanceof Error) {
    if (/user rejected|denied/i.test(e.message))
      return "Transaction rejected in your wallet.";
    return clampMessage(e.message);
  }
  return "Transaction failed.";
}

export function useTx() {
  const config = useConfig();
  const [status, setStatus] = useState<TxStatus>("idle");
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const [error, setError] = useState<string | undefined>();

  const run = useCallback(
    async (params: TxParams) => {
      setError(undefined);
      setHash(undefined);
      setStatus("simulating");
      try {
        // Simulate first so a revert is caught before the wallet popup / gas.
        // The ABI is a runtime-loaded `Abi`, so wagmi's deep generics can't be
        // satisfied statically — cast at this boundary.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { request } = await simulateContract(config, params as any);
        setStatus("pending");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const h = await writeContract(config, request as any);
        setHash(h);
        setStatus("confirming");
        await waitForTransactionReceipt(config, { hash: h });
        setStatus("success");
        return h;
      } catch (e) {
        setError(prettyError(e));
        setStatus("error");
        return undefined;
      }
    },
    [config],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setHash(undefined);
    setError(undefined);
  }, []);

  const isBusy = status === "simulating" || status === "pending" || status === "confirming";

  return { run, reset, status, hash, error, isBusy };
}
