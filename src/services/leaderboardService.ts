import { database } from "../lib/supabase";
import { unwrap } from "./tournamentService";
import type {
  Card,
  Course,
  Player,
  Round,
  Team,
  Tournament,
} from "../types/golf";
export type Individual = {
  id: string;
  full_name: string;
  team: string | null;
  status: string;
  rounds: number;
  complete: boolean;
  strokes: number | null;
  relative: number | null;
  position: number | null;
  average: number | null;
  best: number | null;
  worst: number | null;
};
export type TeamStanding = {
  id: string;
  name: string;
  rounds: number;
  counting_players: number | null;
  strokes: number | null;
  relative: number | null;
  position: number | null;
  average: number | null;
  best_player: string | null;
};
export type Report = {
  individual: Individual[];
  teams: TeamStanding[];
  team_rounds: {
    team_id: string;
    round_number: number;
    strokes: number;
    relative: number | null;
  }[];
  holes: { player_id: string; hole_number: number; average: number }[];
  events: {
    player_id: string;
    eagles: number;
    birdies: number;
    pars: number;
    bogeys: number;
    double_bogeys: number;
    known_pars: number;
  }[];
  distribution: { strokes: number; scorecards: number }[];
  progression: {
    player_id: string;
    round_number: number;
    strokes: number;
    position: number;
  }[];
  summary: {
    players: number;
    teams: number;
    scheduled_rounds: number;
    completed_rounds: number;
    best: number | null;
    worst: number | null;
    average: number | null;
  };
};
export type PublicData = {
  tournament: Pick<
    Tournament,
    | "name"
    | "description"
    | "location"
    | "start_date"
    | "end_date"
    | "timezone"
    | "scoring_format"
    | "status"
  >;
  teams: Pick<Team, "id" | "name" | "description">[];
  players: Pick<Player, "id" | "full_name" | "team_id" | "status">[];
  rounds: Round[];
  courses: Pick<Course, "id" | "name" | "number_of_holes">[];
  cards: Omit<Card, "revision" | "approved_at">[];
  report: Report;
};
export async function ownerReport(id: string) {
  return unwrap(
    await database().rpc("owner_golf_report", { p_tournament: id }),
  ) as Report;
}
export async function publicTournament(code: string) {
  return unwrap(
    await database().rpc("public_golf_tournament", { p_code: code }),
  ) as PublicData | null;
}
