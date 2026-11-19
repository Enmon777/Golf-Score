// Generated from the local migrations by npm run db:types.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];
export type Database = {
  public: {
    Tables: {
      course_holes: {
        Row: {
          id: string;
          course_id: string;
          hole_number: number;
          par: number | null;
          yardage: number | null;
        };
        Insert: {
          id?: string;
          course_id: string;
          hole_number: number;
          par?: number | null;
          yardage?: number | null;
        };
        Update: {
          id?: string;
          course_id?: string;
          hole_number?: number;
          par?: number | null;
          yardage?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "course_holes_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      courses: {
        Row: {
          id: string;
          tournament_id: string;
          name: string;
          location: string | null;
          number_of_holes: number;
          course_rating: number | null;
          slope_rating: number | null;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          name: string;
          location?: string | null;
          number_of_holes: number;
          course_rating?: number | null;
          slope_rating?: number | null;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          name?: string;
          location?: string | null;
          number_of_holes?: number;
          course_rating?: number | null;
          slope_rating?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "courses_tournament_id_fkey";
            columns: ["tournament_id"];
            isOneToOne: false;
            referencedRelation: "tournaments";
            referencedColumns: ["id"];
          },
        ];
      };
      hole_scores: {
        Row: {
          id: string;
          scorecard_id: string;
          hole_number: number;
          strokes: number;
          par: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          scorecard_id: string;
          hole_number: number;
          strokes: number;
          par?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          scorecard_id?: string;
          hole_number?: number;
          strokes?: number;
          par?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "hole_scores_scorecard_id_fkey";
            columns: ["scorecard_id"];
            isOneToOne: false;
            referencedRelation: "scorecards";
            referencedColumns: ["id"];
          },
        ];
      };
      players: {
        Row: {
          id: string;
          tournament_id: string;
          team_id: string | null;
          full_name: string;
          player_number: string | null;
          handicap: number | null;
          notes: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          team_id?: string | null;
          full_name: string;
          player_number?: string | null;
          handicap?: number | null;
          notes?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          team_id?: string | null;
          full_name?: string;
          player_number?: string | null;
          handicap?: number | null;
          notes?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "players_tournament_id_fkey";
            columns: ["tournament_id"];
            isOneToOne: false;
            referencedRelation: "tournaments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "players_tournament_id_team_id_fkey";
            columns: ["tournament_id", "team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["tournament_id", "id"];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      score_audit_logs: {
        Row: {
          id: string;
          tournament_id: string;
          scorecard_id: string;
          upload_id: string | null;
          changed_by: string;
          previous_data: Json | null;
          new_data: Json;
          reason: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          scorecard_id: string;
          upload_id?: string | null;
          changed_by: string;
          previous_data?: Json | null;
          new_data: Json;
          reason: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          scorecard_id?: string;
          upload_id?: string | null;
          changed_by?: string;
          previous_data?: Json | null;
          new_data?: Json;
          reason?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "score_audit_logs_tournament_id_fkey";
            columns: ["tournament_id"];
            isOneToOne: false;
            referencedRelation: "tournaments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "score_audit_logs_tournament_id_scorecard_id_fkey";
            columns: ["tournament_id", "scorecard_id"];
            isOneToOne: false;
            referencedRelation: "scorecards";
            referencedColumns: ["tournament_id", "id"];
          },
          {
            foreignKeyName: "score_audit_logs_upload_id_fkey";
            columns: ["upload_id"];
            isOneToOne: false;
            referencedRelation: "scorecard_uploads";
            referencedColumns: ["id"];
          },
        ];
      };
      scorecard_reviews: {
        Row: {
          id: string;
          upload_id: string;
          extracted_data: Json;
          corrected_data: Json | null;
          status: string;
          reviewed_by: string | null;
          reviewed_at: string | null;
        };
        Insert: {
          id?: string;
          upload_id: string;
          extracted_data: Json;
          corrected_data?: Json | null;
          status?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
        };
        Update: {
          id?: string;
          upload_id?: string;
          extracted_data?: Json;
          corrected_data?: Json | null;
          status?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "scorecard_reviews_upload_id_fkey";
            columns: ["upload_id"];
            isOneToOne: true;
            referencedRelation: "scorecard_uploads";
            referencedColumns: ["id"];
          },
        ];
      };
      scorecard_uploads: {
        Row: {
          id: string;
          tournament_id: string;
          round_id: string;
          storage_path: string;
          uploaded_by: string;
          scan_status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          round_id: string;
          storage_path: string;
          uploaded_by?: string;
          scan_status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          round_id?: string;
          storage_path?: string;
          uploaded_by?: string;
          scan_status?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scorecard_uploads_tournament_id_fkey";
            columns: ["tournament_id"];
            isOneToOne: false;
            referencedRelation: "tournaments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scorecard_uploads_tournament_id_round_id_fkey";
            columns: ["tournament_id", "round_id"];
            isOneToOne: false;
            referencedRelation: "tournament_rounds";
            referencedColumns: ["tournament_id", "id"];
          },
        ];
      };
      scorecards: {
        Row: {
          id: string;
          tournament_id: string;
          round_id: string;
          player_id: string;
          team_id: string | null;
          status: string;
          total_strokes: number;
          relative_to_par: number | null;
          approved_by: string;
          approved_at: string;
          created_at: string;
          updated_at: string;
          revision: number;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          round_id: string;
          player_id: string;
          team_id?: string | null;
          status?: string;
          total_strokes: number;
          relative_to_par?: number | null;
          approved_by: string;
          approved_at?: string;
          created_at?: string;
          updated_at?: string;
          revision?: number;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          round_id?: string;
          player_id?: string;
          team_id?: string | null;
          status?: string;
          total_strokes?: number;
          relative_to_par?: number | null;
          approved_by?: string;
          approved_at?: string;
          created_at?: string;
          updated_at?: string;
          revision?: number;
        };
        Relationships: [
          {
            foreignKeyName: "scorecards_tournament_id_fkey";
            columns: ["tournament_id"];
            isOneToOne: false;
            referencedRelation: "tournaments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scorecards_tournament_id_player_id_fkey";
            columns: ["tournament_id", "player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["tournament_id", "id"];
          },
          {
            foreignKeyName: "scorecards_tournament_id_round_id_fkey";
            columns: ["tournament_id", "round_id"];
            isOneToOne: false;
            referencedRelation: "tournament_rounds";
            referencedColumns: ["tournament_id", "id"];
          },
          {
            foreignKeyName: "scorecards_tournament_id_team_id_fkey";
            columns: ["tournament_id", "team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["tournament_id", "id"];
          },
        ];
      };
      teams: {
        Row: {
          id: string;
          tournament_id: string;
          name: string;
          description: string | null;
          logo_path: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          name: string;
          description?: string | null;
          logo_path?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          name?: string;
          description?: string | null;
          logo_path?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "teams_tournament_id_fkey";
            columns: ["tournament_id"];
            isOneToOne: false;
            referencedRelation: "tournaments";
            referencedColumns: ["id"];
          },
        ];
      };
      tournament_rounds: {
        Row: {
          id: string;
          tournament_id: string;
          course_id: string;
          round_number: number;
          name: string;
          start_time: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          course_id: string;
          round_number: number;
          name: string;
          start_time: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          course_id?: string;
          round_number?: number;
          name?: string;
          start_time?: string;
          status?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tournament_rounds_tournament_id_course_id_fkey";
            columns: ["tournament_id", "course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["tournament_id", "id"];
          },
          {
            foreignKeyName: "tournament_rounds_tournament_id_fkey";
            columns: ["tournament_id"];
            isOneToOne: false;
            referencedRelation: "tournaments";
            referencedColumns: ["id"];
          },
        ];
      };
      tournament_settings: {
        Row: {
          id: string;
          tournament_id: string;
          number_of_holes: number;
          team_scoring_policy: string;
          counting_players: number;
          tie_breaking_policy: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          number_of_holes?: number;
          team_scoring_policy?: string;
          counting_players?: number;
          tie_breaking_policy?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          number_of_holes?: number;
          team_scoring_policy?: string;
          counting_players?: number;
          tie_breaking_policy?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tournament_settings_tournament_id_fkey";
            columns: ["tournament_id"];
            isOneToOne: true;
            referencedRelation: "tournaments";
            referencedColumns: ["id"];
          },
        ];
      };
      tournaments: {
        Row: {
          id: string;
          owner_id: string;
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
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          name: string;
          description?: string | null;
          location?: string | null;
          logo_path?: string | null;
          start_date: string;
          end_date: string;
          timezone?: string;
          tournament_code?: string;
          scoring_format?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          description?: string | null;
          location?: string | null;
          logo_path?: string | null;
          start_date?: string;
          end_date?: string;
          timezone?: string;
          tournament_code?: string;
          scoring_format?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      approve_golf_scores: {
        Args: {
          p_tournament: string;
          p_round: string;
          p_request: string;
          p_upload: string | null;
          p_rows: Json;
        };
        Returns: undefined;
      };
      cancel_golf_scan: {
        Args: { p_tournament: string; p_upload: string | null };
        Returns: undefined;
      };
      create_golf_tournament: {
        Args: {
          p_name: string;
          p_start: string;
          p_end: string;
          p_timezone: string;
          p_format: string;
          p_holes: number;
          p_count: number;
          p_description: string | null;
          p_location: string | null;
        };
        Returns: string;
      };
      owner_golf_report: { Args: { p_tournament: string }; Returns: Json };
      public_golf_tournament: { Args: { p_code: string }; Returns: Json };
      register_golf_scan: {
        Args: {
          p_tournament: string;
          p_round: string;
          p_path: string;
          p_extracted: Json;
        };
        Returns: string;
      };
      rotate_golf_code: { Args: { p_tournament: string }; Returns: string };
      save_golf_course: {
        Args: {
          p_tournament: string;
          p_course: string | null;
          p_name: string;
          p_location: string | null;
          p_rating: number | null;
          p_slope: number | null;
          p_holes: Json;
        };
        Returns: string;
      };
      update_golf_settings: {
        Args: {
          p_tournament: string;
          p_name: string;
          p_start: string;
          p_end: string;
          p_timezone: string;
          p_format: string;
          p_holes: number;
          p_count: number;
          p_policy: string;
          p_status: string;
          p_description: string | null;
          p_location: string | null;
        };
        Returns: undefined;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
