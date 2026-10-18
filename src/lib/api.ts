import { Match, MatchEvent, MatchLineup, MatchRosterEntry, MotmVote, PlayerAttributes, Profile } from '../types/database';
import { requireSupabase } from './supabaseClient';

export interface MatchDetail {
  match: Match;
  profiles: Profile[];
  roster: MatchRosterEntry[];
  lineups: MatchLineup[];
  events: MatchEvent[];
  votes: MotmVote[];
}

function withAvatarUrl(profile: Profile): Profile {
  if (!profile.avatar_path) return profile;
  const client = requireSupabase();
  return {
    ...profile,
    avatar_url: client.storage.from('avatars').getPublicUrl(profile.avatar_path).data.publicUrl,
  };
}

function mapEvent(row: Record<string, unknown>, profiles: Profile[]): MatchEvent {
  const scorerId = typeof row.player_id === 'string' ? row.player_id : undefined;
  const assistId = typeof row.assist_id === 'string' ? row.assist_id : undefined;
  return {
    id: String(row.id),
    minute: typeof row.minute === 'number' ? row.minute : undefined,
    scorer_id: scorerId,
    scorer_name: profiles.find((profile) => profile.id === scorerId)?.name,
    assist_id: assistId,
    assist_name: profiles.find((profile) => profile.id === assistId)?.name,
    team: row.team as MatchEvent['team'],
    type: row.event_type as MatchEvent['type'],
    detail: typeof row.notes === 'string' ? row.notes : undefined,
  };
}

async function throwFunctionError(error: Error): Promise<never> {
  const context = (error as Error & { context?: unknown }).context;
  if (context instanceof Response) {
    let message: string | undefined;
    try {
      const payload: unknown = await context.clone().json();
      if (payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string') {
        message = payload.error;
      }
    } catch {}
    throw new Error(message || `${error.message} (HTTP ${context.status})`);
  }
  throw error;
}

function createUploadId(): string {
  const runtimeCrypto = globalThis.crypto;
  if (typeof runtimeCrypto?.randomUUID === 'function') return runtimeCrypto.randomUUID();

  const bytes = new Uint8Array(16);
  if (typeof runtimeCrypto?.getRandomValues === 'function') {
    runtimeCrypto.getRandomValues(bytes);
  } else {
    bytes.forEach((_, index) => { bytes[index] = Math.floor(Math.random() * 256); });
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export const api = {
  async getProfiles(): Promise<Profile[]> {
    const { data, error } = await requireSupabase().from('profiles').select('*').order('name');
    if (error) throw error;
    return (data || []).map((profile) => withAvatarUrl(profile as Profile));
  },

  async getProfileById(id: string): Promise<Profile | null> {
    const { data, error } = await requireSupabase().from('profiles').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? withAvatarUrl(data as Profile) : null;
  },

  async updateProfile(id: string, updates: Partial<Profile>): Promise<Profile> {
    const { avatar_url: _avatarUrl, ...storedUpdates } = updates;
    const { data, error } = await requireSupabase()
      .from('profiles')
      .update(storedUpdates)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return withAvatarUrl(data as Profile);
  },

  async updateManagedProfile(data: {
    profile_id: string;
    name: string;
    email: string;
    password?: string;
    role: Profile['role'];
    position: Profile['position'];
    attributes: PlayerAttributes;
  }): Promise<Profile> {
    const { data: result, error } = await requireSupabase().functions.invoke('admin-update-user', { body: data });
    if (error) await throwFunctionError(error);
    if (!result?.profile) throw new Error(result?.error || 'Unable to update account.');
    return withAvatarUrl(result.profile as Profile);
  },

  async createProfile(data: {
    name: string;
    email: string;
    password: string;
    role: Profile['role'];
    position: Profile['position'];
    age: number;
    attributes: PlayerAttributes;
  }): Promise<Profile> {
    const { data: result, error } = await requireSupabase().functions.invoke('admin-create-user', { body: data });
    if (error) await throwFunctionError(error);
    if (!result?.profile) throw new Error(result?.error || 'Account creation failed.');
    return withAvatarUrl(result.profile as Profile);
  },

  async uploadAvatar(userId: string, file: File): Promise<Profile> {
    if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
    if (file.size > 5 * 1024 * 1024) throw new Error('Avatar images must be 5 MB or smaller.');

    const client = requireSupabase();
    const path = `${userId}/${createUploadId()}`;
    const { error: uploadError } = await client.storage.from('avatars').upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (uploadError) throw uploadError;

    try {
      return await api.updateProfile(userId, { avatar_path: path });
    } catch (error) {
      await client.storage.from('avatars').remove([path]);
      throw error;
    }
  },

  async getMatches(): Promise<Match[]> {
    const { data, error } = await requireSupabase().from('matches').select('*').order('date', { ascending: false });
    if (error) throw error;
    return (data || []) as Match[];
  },

  async getMatchById(id: string): Promise<Match | null> {
    const { data, error } = await requireSupabase().from('matches').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data as Match | null;
  },

  async getMatchDetail(id: string): Promise<MatchDetail | null> {
    const client = requireSupabase();
    const [matchResult, rosterResult, lineupResult, eventResult, voteResult, profileResult] = await Promise.all([
      client.from('matches').select('*').eq('id', id).maybeSingle(),
      client.from('match_players').select('*').eq('match_id', id),
      client.from('match_lineups').select('*').eq('match_id', id),
      client.from('match_events').select('*').eq('match_id', id).order('minute'),
      client.from('motm_votes').select('*').eq('match_id', id),
      client.from('profiles').select('*'),
    ]);
    const error = matchResult.error || rosterResult.error || lineupResult.error || eventResult.error || voteResult.error || profileResult.error;
    if (error) throw error;
    if (!matchResult.data) return null;

    const profiles = (profileResult.data || []).map((profile) => withAvatarUrl(profile as Profile));
    const roster = (rosterResult.data || []).map((entry) => ({
      ...(entry as MatchRosterEntry),
      player: profiles.find((profile) => profile.id === entry.player_id),
    }));
    const lineups = (lineupResult.data || []).map((entry) => {
      const rosterEntry = roster.find((item) => item.player_id === entry.player_id);
      return {
        ...(entry as MatchLineup),
        team: rosterEntry?.team || 'A',
        player: rosterEntry?.player,
      };
    });

    return {
      match: matchResult.data as Match,
      profiles,
      roster,
      lineups,
      events: (eventResult.data || []).map((event) => mapEvent(event, profiles)),
      votes: (voteResult.data || []) as MotmVote[],
    };
  },

  async createMatch(
    match: Omit<Match, 'id' | 'status' | 'team_a_score' | 'team_b_score'>,
    roster: MatchRosterEntry[],
    lineups: MatchLineup[]
  ): Promise<string> {
    const matchData = {
      date: match.date,
      venue: match.venue,
      format: match.format,
      custom_players_per_team: match.custom_players_per_team ?? null,
      team_a_name: match.team_a_name,
      team_b_name: match.team_b_name,
      manager_a_id: match.manager_a_id,
      manager_b_id: match.manager_b_id,
    };
    const { data, error } = await requireSupabase().rpc('create_match_with_roster', {
      p_match: matchData,
      p_roster: roster.map(({ player_id, team }) => ({ player_id, team })),
      p_lineups: lineups.map(({ player_id, x_coord, y_coord, position_tag }) => ({ player_id, x_coord, y_coord, position_tag })),
    });
    if (error) throw error;
    return data as string;
  },

  async saveMatchRosterAndLineup(matchId: string, roster: MatchRosterEntry[], lineups: MatchLineup[]): Promise<void> {
    const { error } = await requireSupabase().rpc('save_match_roster_and_lineup', {
      p_match_id: matchId,
      p_roster: roster.map(({ player_id, team }) => ({ player_id, team })),
      p_lineups: lineups.map(({ player_id, x_coord, y_coord, position_tag }) => ({ player_id, x_coord, y_coord, position_tag })),
    });
    if (error) throw error;
  },

  async getMatchLineups(matchId: string): Promise<MatchLineup[]> {
    const detail = await api.getMatchDetail(matchId);
    return detail?.lineups || [];
  },

  async getMotmVotes(matchId: string): Promise<MotmVote[]> {
    const { data, error } = await requireSupabase().from('motm_votes').select('*').eq('match_id', matchId);
    if (error) throw error;
    return (data || []) as MotmVote[];
  },

  async castMotmVote(matchId: string, voterId: string, votedPlayerId: string): Promise<MotmVote> {
    const { data, error } = await requireSupabase()
      .from('motm_votes')
      .insert({ match_id: matchId, voter_id: voterId, voted_player_id: votedPlayerId })
      .select('*')
      .single();
    if (error) throw error;
    return data as MotmVote;
  },

  async approveMatchMotm(matchId: string, votedPlayerId: string): Promise<void> {
    const { error } = await requireSupabase().rpc('approve_match_motm', {
      p_match_id: matchId,
      p_player_id: votedPlayerId,
    });
    if (error) throw error;
  },

  async submitMatchStats(matchId: string, payload: {
    team_a_score: number;
    team_b_score: number;
    events: MatchEvent[];
  }): Promise<void> {
    const { error } = await requireSupabase().rpc('save_match_result', {
      p_match_id: matchId,
      p_team_a_score: payload.team_a_score,
      p_team_b_score: payload.team_b_score,
      p_events: payload.events.map((event) => ({
        team: event.team,
        event_type: event.type,
        player_id: event.scorer_id || null,
        assist_id: event.assist_id || null,
        minute: event.minute ?? null,
        notes: event.detail || null,
      })),
    });
    if (error) throw error;
  },
};
