"use client";

import { useCallback, useState } from "react";
import { useConfig } from "wagmi";
import {
  simulateContract,
  writeContract,
  waitForTransactionReceipt,
} from "wagmi/actions";
import type { Abi } from "viem";
import { prettyError, type TxStatus } from "./useTx";

export interface BulkItem {
  label: string;
  build: {
    address: `0x${string}`;
    abi: readonly unknown[];
    functionName: string;
    args: readonly unknown[];
    value?: bigint;
  };
}

export interface BulkResult {
  label: string;
  ok: boolean;
  error?: string;
}

export type BulkStatus = "idle" | "running" | "done";

/**
 * Runs a list of claim transactions one at a time (the contract has no batch
 * call), tracking per-item results. A wallet rejection stops the run; other
 * failures are recorded and the batch continues so one bad node doesn't block
 * the rest.
 */
export function useBulkClaim() {
  const config = useConfig();
  const [status, setStatus] = useState<BulkStatus>("idle");
  const [index, setIndex] = useState(0);
  const [total, setTotal] = useState(0);
  const [step, setStep] = useState<TxStatus>("idle");
  const [results, setResults] = useState<BulkResult[]>([]);

  const run = useCallback(
    async (items: BulkItem[], account: `0x${string}`, chainId: number) => {
      setStatus("running");
      setTotal(items.length);
      setResults([]);
      setIndex(0);

      const collected: BulkResult[] = [];
      for (let i = 0; i < items.length; i++) {
        setIndex(i);
        const { build, label } = items[i];
        try {
          setStep("simulating");
          const { request } = await simulateContract(config, {
            address: build.address,
            abi: build.abi as Abi,
            functionName: build.functionName,
            args: build.args,
            value: build.value,
            account,
            chainId,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any);
          setStep("pending");
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const hash = await writeContract(config, request as any);
          setStep("confirming");
          await waitForTransactionReceipt(config, { hash });
          collected.push({ label, ok: true });
        } catch (e) {
          const error = prettyError(e);
          collected.push({ label, ok: false, error });
          setResults([...collected]);
          // A wallet rejection means the user is bailing out — stop the batch.
          if (/reject|denied/i.test(error)) break;
          continue;
        }
        setResults([...collected]);
      }

      setStep("idle");
      setStatus("done");
    },
    [config],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setResults([]);
    setIndex(0);
    setTotal(0);
    setStep("idle");
  }, []);

  return { run, reset, status, index, total, step, results };
}
