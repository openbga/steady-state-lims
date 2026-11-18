import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";
import type { SpecimenAcceptance } from "@/generated/SpecimenAcceptance";

/** One container looked up in this session, as its lookup answered. */
export interface RecentLookup {
  labelCode: string;
  accessionNumber: string;
  /** The patient's name: patient data, so the list lives in memory only. */
  patient: string;
  acceptance: SpecimenAcceptance;
  lookedUpAt: string;
}

const MOST = 10;

interface RecentLookups {
  entries: readonly RecentLookup[];
  remember: (entry: RecentLookup) => void;
}

const NONE: RecentLookups = { entries: [], remember: () => undefined };

const RecentLookupsContext = createContext<RecentLookups>(NONE);

/**
 * The containers this person looked up since signing in or unlocking, newest first, at most
 * 10. Held in React state inside the signed-in frame, never in storage: the frame unmounts
 * on sign-out and on lock (`AuthGate`), and the list goes with it.
 */
export function RecentLookupsProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<readonly RecentLookup[]>([]);
  const remember = useCallback((entry: RecentLookup) => {
    setEntries((last) =>
      [entry, ...last.filter((each) => each.labelCode !== entry.labelCode)].slice(0, MOST),
    );
  }, []);
  const value = useMemo(() => ({ entries, remember }), [entries, remember]);
  return <RecentLookupsContext.Provider value={value}>{children}</RecentLookupsContext.Provider>;
}

export function useRecentLookups(): RecentLookups {
  return useContext(RecentLookupsContext);
}
