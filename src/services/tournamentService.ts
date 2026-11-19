import { database } from "../lib/supabase";
import type { TournamentData } from "../types/golf";
import type { Database } from "../types/database";

export function unwrap<T>(result: { data: T; error: unknown }): T {
  if (result.error) throw result.error;
  return result.data;
}
export async function getTournament(id: string): Promise<TournamentData> {
  const db = database();
  const results = await Promise.all([
    db.from("tournaments").select("*").eq("id", id).maybeSingle(),
    db
      .from("tournament_settings")
      .select("*")
      .eq("tournament_id", id)
      .maybeSingle(),
    db.from("teams").select("*").eq("tournament_id", id).order("name"),
    db.from("players").select("*").eq("tournament_id", id).order("full_name"),
    db
      .from("courses")
      .select("*,course_holes(*)")
      .eq("tournament_id", id)
      .order("name"),
    db
      .from("tournament_rounds")
      .select("*")
      .eq("tournament_id", id)
      .order("start_time"),
    db
      .from("scorecards")
      .select("*,hole_scores(*)")
      .eq("tournament_id", id)
      .order("approved_at", { ascending: false }),
    db
      .from("scorecard_uploads")
      .select("*,scorecard_reviews(extracted_data)")
      .eq("tournament_id", id)
      .order("created_at", { ascending: false }),
  ]);
  const [
    tournament,
    settings,
    teams,
    players,
    courses,
    rounds,
    cards,
    uploads,
  ] = results;
  const event = unwrap(tournament);
  if (!event) throw new Error("Tournament unavailable or you do not own it.");
  return {
    tournament: event,
    settings: unwrap(settings),
    teams: unwrap(teams) ?? [],
    players: unwrap(players) ?? [],
    courses: unwrap(courses) ?? [],
    rounds: unwrap(rounds) ?? [],
    cards: unwrap(cards) ?? [],
    uploads: unwrap(uploads) ?? [],
  };
}
type GolfTables = Database["public"]["Tables"];
type RecordPayload = {
  [K in "teams" | "players" | "tournament_rounds"]: {
    table: K;
    data: Omit<GolfTables[K]["Insert"], "tournament_id">;
  };
}["teams" | "players" | "tournament_rounds"];
export async function saveRecord(
  record: RecordPayload,
  id: string | undefined,
  tournamentId: string,
) {
  const db = database();
  switch (record.table) {
    case "teams": {
      const query = db.from("teams");
      unwrap(
        await (id
          ? query
              .update(record.data)
              .eq("id", id)
              .eq("tournament_id", tournamentId)
              .select("id")
              .single()
          : query
              .insert({ ...record.data, tournament_id: tournamentId })
              .select("id")
              .single()),
      );
      break;
    }
    case "players": {
      const query = db.from("players");
      unwrap(
        await (id
          ? query
              .update(record.data)
              .eq("id", id)
              .eq("tournament_id", tournamentId)
              .select("id")
              .single()
          : query
              .insert({ ...record.data, tournament_id: tournamentId })
              .select("id")
              .single()),
      );
      break;
    }
    case "tournament_rounds": {
      const query = db.from("tournament_rounds");
      unwrap(
        await (id
          ? query
              .update(record.data)
              .eq("id", id)
              .eq("tournament_id", tournamentId)
              .select("id")
              .single()
          : query
              .insert({ ...record.data, tournament_id: tournamentId })
              .select("id")
              .single()),
      );
      break;
    }
  }
}
