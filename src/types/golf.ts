export type Tournament = {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  logo_path: string | null;
  start_date: string;
  end_date: string;
  timezone: string;
  tournament_code: string;
  scoring_format: string;
  status: string;
};
export type Settings = {
  number_of_holes: number;
  counting_players: number;
  team_scoring_policy: string;
};
export type Team = {
  id: string;
  name: string;
  description: string | null;
  logo_path: string | null;
};
export type Player = {
  id: string;
  full_name: string;
  team_id: string | null;
  player_number: string | null;
  handicap: number | null;
  status: string;
  notes?: string | null;
};
export type Hole = {
  hole_number: number;
  par: number | null;
  yardage: number | null;
};
export type Course = {
  id: string;
  name: string;
  location: string | null;
  number_of_holes: number;
  course_rating: number | null;
  slope_rating: number | null;
  course_holes: Hole[];
};
export type Round = {
  id: string;
  course_id: string;
  name: string;
  round_number: number;
  start_time: string;
  status: string;
};
export type Card = {
  id: string;
  player_id: string;
  round_id: string;
  total_strokes: number;
  relative_to_par: number | null;
  revision: number;
  approved_at: string;
  hole_scores: { hole_number: number; strokes: number; par: number | null }[];
};
export type Upload = {
  id: string;
  round_id: string;
  storage_path: string;
  scan_status: string;
  created_at: string;
  scorecard_reviews: { extracted_data: unknown } | null;
};
export type TournamentData = {
  tournament: Tournament;
  settings: Settings | null;
  teams: Team[];
  players: Player[];
  courses: Course[];
  rounds: Round[];
  cards: Card[];
  uploads: Upload[];
};
