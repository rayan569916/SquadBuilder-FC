export type UserRole = 'player' | 'manager' | 'admin';
export type PlayerPosition = 'GK' | 'DF' | 'MF' | 'FW';
export type MatchFormat = '5s' | '6s' | '7s' | 'custom';
export type MatchStatus = 'upcoming' | 'completed';
export type MatchTeam = 'A' | 'B';
export type MatchEventType = 'goal' | 'penalty_goal' | 'freekick_goal' | 'penalty_missed' | 'penalty_save' | 'save' | 'tackle';

export interface GoalkeeperAttributes {
  diving: number;
  handling: number;
  kicking: number;
  reflexes: number;
  speed: number;
  positioning: number;
}

export interface PlayerAttributes {
  impact: number;      // 0-100 (e.g. 98)
  shooting: number;    // 0-100 (e.g. 96)
  defense: number;     // 0-100 (e.g. 88)
  physical: number;    // 0-100 (e.g. 94)
  passing: number;     // 0-100 (e.g. 94)
  goalkeeping?: GoalkeeperAttributes;
}

export interface InjuryRecord {
  id: string;
  matchday: string;
  description: string;
  status: 'cleared' | 'recovering' | 'minor';
  returnDate: string;
}

export interface Profile {
  id: string;
  email: string;
  name: string;
  age: number;
  position: PlayerPosition;
  role: UserRole;
  avatar_url?: string;
  avatar_path?: string;
  club?: string;
  jersey_number?: number;
  elo_rating: number;
  overall_rating: number;
  total_motm_votes: number;
  
  // Player Stats
  goals: number;
  assists: number;
  motm_count: number;
  matches_played: number;
  total_wins: number;
  win_percentage: number;
  saves: number;
  tackles: number;
  injuries_count: number;
  
  // Manager Stats
  matches_managed: number;
  matches_won: number;
  trophies: number;
  
  // Rich Player Attributes & History
  attributes?: PlayerAttributes;
  recent_form?: ('W' | 'D' | 'L')[];
  injuries?: InjuryRecord[];
  created_at?: string;
}

export interface MatchEvent {
  id?: string;
  minute?: number;
  scorer_id?: string;
  scorer_name?: string;
  assist_id?: string;
  assist_name?: string;
  team: MatchTeam;
  type: MatchEventType;
  detail?: string;
}

export interface Match {
  id: string;
  date: string;
  format: MatchFormat;
  custom_players_per_team?: number;
  status: MatchStatus;
  manager_a_id: string;
  manager_b_id: string;
  team_a_name: string;
  team_b_name: string;
  team_a_score: number;
  team_b_score: number;
  venue?: string;
  pitch?: string;
  intensity?: number;
  possession_a?: number;
  possession_b?: number;
  shots_a?: number;
  shots_b?: number;
  pass_acc_a?: number;
  pass_acc_b?: number;
  motm_player_id?: string;
  motm_locked_at?: string;
  motm_approved_by?: string;
  events?: MatchEvent[];
  created_by?: string;
  created_at?: string;
}

export interface MatchLineup {
  id: string;
  match_id: string;
  team: MatchTeam;
  player_id: string;
  x_coord: number; // 0 - 100 percentage
  y_coord: number; // 0 - 100 percentage
  position_tag: string;
  player?: Profile;
}

export interface MotmVote {
  id: string;
  match_id: string;
  voter_id: string;
  voted_player_id: string;
  created_at?: string;
}

export interface MatchRosterEntry {
  match_id: string;
  player_id: string;
  team: MatchTeam;
  player?: Profile;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string; email: string; name: string };
        Update: Partial<Profile>;
      };
      matches: {
        Row: Match;
        Insert: Partial<Match> & { id: string };
        Update: Partial<Match>;
      };
      match_lineups: {
        Row: MatchLineup;
        Insert: Partial<MatchLineup> & { id: string; match_id: string; player_id: string };
        Update: Partial<MatchLineup>;
      };
      motm_votes: {
        Row: MotmVote;
        Insert: MotmVote;
        Update: Partial<MotmVote>;
      };
    };
  };
}
