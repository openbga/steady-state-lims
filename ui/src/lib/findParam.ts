import { useCallback } from "react";
import { useLocation, useSearchParams } from "react-router";
import { OPEN_PARAM, withoutPushed } from "./openRecord";

/**
 * A directory's find text, kept in `?q=` so Back, reload and the breadcrumb from a record
 * page return to the same rows. Changing it replaces the history entry rather than adding
 * one per pause in typing, and keeps the other parameters and the navigation state. It also
 * closes the record open in the side panel: a new find is a new look at the list.
 */
export function useFindParam(): [query: string, setQuery: (text: string) => void] {
  const [params, setParams] = useSearchParams();
  const { state } = useLocation();
  const open = params.has(OPEN_PARAM);
  const setQuery = useCallback(
    (text: string) =>
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (text.trim() === "") next.delete("q");
          else next.set("q", text);
          next.delete(OPEN_PARAM);
          return next;
        },
        { replace: true, state: open ? withoutPushed(state) : state },
      ),
    [open, setParams, state],
  );
  return [params.get("q") ?? "", setQuery];
}
