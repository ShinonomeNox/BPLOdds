// Supabaseのテーブル定義（supabase/schema.sql）に対応する型定義。
// Supabase CLI導入後は `supabase gen types typescript` の出力に置き換える想定。

export type GameTitle = "iidx" | "sdvx" | "ddr";
export type MatchStatus = "scheduled" | "live" | "settled";
export type SongStatus = "open" | "closed" | "settled";
export type TeamSide = "a" | "b";
export type CoinLogType =
  | "initial"
  | "login_bonus"
  | "share_bonus"
  | "bet"
  | "payout"
  | "yell_donation"
  | "admin_adjust";
export type PayoutStatus = "pending" | "won" | "lost";
export type LegacyStatCategoryType = "theme" | "level";

export interface Database {
  public: {
    Tables: {
      teams: {
        Row: {
          id: string;
          name: string;
          game_title: GameTitle;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          game_title: GameTitle;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["teams"]["Insert"]>;
        Relationships: [];
      };
      players: {
        Row: {
          id: string;
          name: string;
          team_id: string;
          game_title: GameTitle;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          team_id: string;
          game_title: GameTitle;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["players"]["Insert"]>;
        Relationships: [];
      };
      songs: {
        Row: {
          id: string;
          game_title: GameTitle;
          name: string;
          theme: string | null;
          level: number | null;
        };
        Insert: {
          id?: string;
          game_title: GameTitle;
          name: string;
          theme?: string | null;
          level?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["songs"]["Insert"]>;
        Relationships: [];
      };
      player_legacy_stats: {
        Row: {
          id: string;
          player_id: string;
          season: string;
          category_type: LegacyStatCategoryType;
          category_value: string;
          wins: number;
          plays: number;
        };
        Insert: {
          id?: string;
          player_id: string;
          season: string;
          category_type: LegacyStatCategoryType;
          category_value: string;
          wins: number;
          plays: number;
        };
        Update: Partial<
          Database["public"]["Tables"]["player_legacy_stats"]["Insert"]
        >;
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          login_id: string;
          password_hash: string;
          coins: number;
          last_login_bonus_date: string | null;
          last_share_bonus_date: string | null;
          registered_ip: string | null;
          is_admin: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          login_id: string;
          password_hash: string;
          coins?: number;
          last_login_bonus_date?: string | null;
          last_share_bonus_date?: string | null;
          registered_ip?: string | null;
          is_admin?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
        Relationships: [];
      };
      coin_logs: {
        Row: {
          id: string;
          user_id: string;
          type: CoinLogType;
          amount: number;
          related_match_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: CoinLogType;
          amount: number;
          related_match_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["coin_logs"]["Insert"]>;
        Relationships: [];
      };
      matches: {
        Row: {
          id: string;
          game_title: GameTitle;
          team_a_id: string;
          team_b_id: string;
          status: MatchStatus;
          start_time: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          game_title: GameTitle;
          team_a_id: string;
          team_b_id: string;
          status?: MatchStatus;
          start_time: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["matches"]["Insert"]>;
        Relationships: [];
      };
      tag_battle_songs: {
        Row: {
          id: string;
          match_id: string;
          song_id: string | null;
          song_number: number;
          status: SongStatus;
        };
        Insert: {
          id?: string;
          match_id: string;
          song_id?: string | null;
          song_number: number;
          status?: SongStatus;
        };
        Update: Partial<
          Database["public"]["Tables"]["tag_battle_songs"]["Insert"]
        >;
        Relationships: [];
      };
      match_participants: {
        Row: {
          id: string;
          match_id: string;
          player_id: string;
          team_side: TeamSide;
        };
        Insert: {
          id?: string;
          match_id: string;
          player_id: string;
          team_side: TeamSide;
        };
        Update: Partial<
          Database["public"]["Tables"]["match_participants"]["Insert"]
        >;
        Relationships: [];
      };
      song_results: {
        Row: {
          id: string;
          song_id: string;
          participant_id: string;
          raw_score: number | null;
          rank: number | null;
        };
        Insert: {
          id?: string;
          song_id: string;
          participant_id: string;
          raw_score?: number | null;
          rank?: number | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["song_results"]["Insert"]
        >;
        Relationships: [];
      };
      bet_types: {
        Row: {
          id: string;
          match_id: string | null;
          song_id: string | null;
          type_key: string;
          label: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id?: string | null;
          song_id?: string | null;
          type_key: string;
          label: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["bet_types"]["Insert"]>;
        Relationships: [];
      };
      bet_options: {
        Row: {
          id: string;
          bet_type_id: string;
          option_key: string;
          label: string;
          min_diff: number | null;
          max_diff: number | null;
          side: TeamSide | null;
          player_id: string | null;
          team_id: string | null;
        };
        Insert: {
          id?: string;
          bet_type_id: string;
          option_key: string;
          label: string;
          min_diff?: number | null;
          max_diff?: number | null;
          side?: TeamSide | null;
          player_id?: string | null;
          team_id?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["bet_options"]["Insert"]
        >;
        Relationships: [];
      };
      bets: {
        Row: {
          id: string;
          user_id: string;
          bet_option_id: string;
          amount: number;
          payout_status: PayoutStatus;
          payout_amount: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          bet_option_id: string;
          amount: number;
          payout_status?: PayoutStatus;
          payout_amount?: number | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["bets"]["Insert"]>;
        Relationships: [];
      };
      player_yell_points: {
        Row: {
          player_id: string;
          total_points: number;
          updated_at: string;
        };
        Insert: {
          player_id: string;
          total_points?: number;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["player_yell_points"]["Insert"]
        >;
        Relationships: [];
      };
      team_yell_points: {
        Row: {
          team_id: string;
          total_points: number;
          updated_at: string;
        };
        Insert: {
          team_id: string;
          total_points?: number;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["team_yell_points"]["Insert"]
        >;
        Relationships: [];
      };
      yell_donations: {
        Row: {
          id: string;
          user_id: string;
          player_id: string | null;
          team_id: string | null;
          amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          player_id?: string | null;
          team_id?: string | null;
          amount: number;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["yell_donations"]["Insert"]
        >;
        Relationships: [];
      };
      system_settings: {
        Row: {
          key: string;
          value: string;
        };
        Insert: {
          key: string;
          value: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["system_settings"]["Insert"]
        >;
        Relationships: [];
      };
    };
    Views: {
      player_season_stats: {
        Row: {
          player_id: string;
          name: string;
          team_id: string;
          songs_played: number;
          first_place_count: number;
          avg_raw_score: number | null;
          best_score: number | null;
        };
        Relationships: [];
      };
      player_theme_stats: {
        Row: {
          player_id: string;
          theme: string | null;
          plays: number;
          wins: number;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
  };
}
