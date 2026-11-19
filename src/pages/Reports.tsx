import { lazy, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useResource } from "../hooks/useResource";
import { ownerReport } from "../services/leaderboardService";
import { useTournament } from "./TournamentDashboard";
import { Standings } from "../components/leaderboard/Standings";
export const Analytics = lazy(() =>
  import("../components/analytics/Analytics").then((module) => ({
    default: module.Analytics,
  })),
);
export function useResultsUpdates(
  code: string,
  enabled: boolean,
  reload: () => void,
) {
  useEffect(() => {
    if (!enabled) return;
    let last = 0;
    const refresh = () => {
      if (Date.now() - last > 2000) {
        last = Date.now();
        reload();
      }
    };
    const channel = supabase
      ?.channel("golf:" + code)
      .on("broadcast", { event: "scores_changed" }, refresh)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") refresh();
      });
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 25000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      if (channel) void supabase?.removeChannel(channel);
    };
  }, [code, enabled, reload]);
}
export function ReportPage({ analytics = false }: { analytics?: boolean }) {
  const { tournament } = useTournament();
  const { data, error, reload } = useResource(tournament.id, ownerReport);
  useResultsUpdates(tournament.tournament_code, Boolean(data), reload);
  return (
    <>
      <h1>{analytics ? "Analytics" : "Leaderboard"}</h1>
      {error && (
        <p role="alert">
          {error} <button onClick={reload}>Retry</button>
        </p>
      )}
      {!data && !error && <p role="status">Loading verified scores…</p>}
      {data &&
        (analytics ? <Analytics report={data} /> : <Standings report={data} />)}
    </>
  );
}
