import React, { useEffect, useState } from 'react';
import { CalendarDays, LoaderCircle, MapPin, Trophy } from 'lucide-react';
import { FormationsBoard } from '../components/FormationsBoard';
import { api, MatchDetail } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Match, Profile } from '../types/database';

interface MatchHistoryScreenProps {
  matchId?: string;
  onLogNewMatch?: () => void;
  onSelectMatch?: (matchId: string) => void;
}

type Filter = 'all' | 'upcoming' | 'completed';

export const MatchHistoryScreen: React.FC<MatchHistoryScreenProps> = ({ matchId, onLogNewMatch, onSelectMatch }) => {
  const { currentUser, isAdmin } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<MatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getMatches().then(setMatches)
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : 'Unable to load matches.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (matchId) void openMatch(matchId);
  }, [matchId]);

  const openMatch = async (matchId: string) => {
    setDetailLoading(true);
    setError(null);
    try {
      const detail = await api.getMatchDetail(matchId);
      setSelected(detail);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load match details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const filteredMatches = matches.filter((match) => filter === 'all' || match.status === filter);
  const selectedMatch = selected?.match;
  const canRecordResult = Boolean(selectedMatch && currentUser && (isAdmin || selectedMatch.manager_a_id === currentUser.id || selectedMatch.manager_b_id === currentUser.id));

  const getWinner = (detail: MatchDetail): Profile | null => {
    const counts = detail.votes.reduce<Record<string, number>>((votes, vote) => {
      votes[vote.voted_player_id] = (votes[vote.voted_player_id] || 0) + 1;
      return votes;
    }, {});
    const winnerId = Object.entries(counts).sort((left, right) => right[1] - left[1])[0]?.[0];
    return detail.roster.find((entry) => entry.player_id === winnerId)?.player || null;
  };

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">Fixtures and results</p><h1 className="mt-2 text-2xl font-bold text-white">Match history</h1><p className="mt-1 text-sm text-slate-400">Every saved roster, formation, event, score, and poll result.</p></div>
        {onLogNewMatch && <button onClick={onLogNewMatch} className="rounded-lg bg-emerald-400 px-3 py-2 text-sm font-semibold text-[#07110f]">Create match</button>}
      </header>

      <div className="flex gap-2" role="tablist" aria-label="Filter matches">
        {(['all', 'upcoming', 'completed'] as const).map((value) => <button key={value} role="tab" aria-selected={filter === value} onClick={() => setFilter(value)} className={`rounded-lg border px-3 py-2 text-sm capitalize ${filter === value ? 'border-emerald-300/40 bg-emerald-300/10 text-emerald-200' : 'border-white/10 text-slate-400'}`}>{value}</button>)}
      </div>

      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      {loading ? <div className="grid min-h-40 place-items-center"><LoaderCircle className="animate-spin text-slate-300" /></div> : (
        <div className="space-y-2">
          {filteredMatches.map((match) => <button key={match.id} onClick={() => void openMatch(match.id)} className="grid w-full grid-cols-[1fr_auto] items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left hover:bg-white/[0.06]">
            <span className="min-w-0"><span className="block truncate text-sm font-semibold text-white">{match.team_a_name} <span className="text-slate-500">vs</span> {match.team_b_name}</span><span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400"><span className="inline-flex items-center gap-1"><CalendarDays size={13} />{new Date(match.date).toLocaleString()}</span><span className="inline-flex items-center gap-1"><MapPin size={13} />{match.venue}</span><span>{match.format}{match.format === 'custom' ? ` · ${match.custom_players_per_team} a side` : ''}</span></span></span>
            <span className="text-right"><span className="block text-lg font-bold tabular-nums text-white">{match.status === 'completed' ? `${match.team_a_score} - ${match.team_b_score}` : 'Upcoming'}</span><span className="text-[10px] uppercase tracking-wide text-emerald-300">{match.status}</span></span>
          </button>)}
          {filteredMatches.length === 0 && <p className="rounded-xl border border-white/10 p-5 text-sm text-slate-400">No matches in this view.</p>}
        </div>
      )}

      {detailLoading && <div className="grid min-h-24 place-items-center"><LoaderCircle className="animate-spin text-slate-300" /></div>}
      {selected && selectedMatch && <article className="space-y-5 border-t border-white/10 pt-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-xs uppercase tracking-widest text-emerald-300">{selectedMatch.status} match sheet</p><h2 className="mt-1 text-xl font-bold text-white">{selectedMatch.team_a_name} {selectedMatch.team_a_score} - {selectedMatch.team_b_score} {selectedMatch.team_b_name}</h2><p className="mt-1 text-sm text-slate-400">{new Date(selectedMatch.date).toLocaleString()} · {selectedMatch.venue}</p></div>
          <div className="flex gap-2">
            {canRecordResult && selectedMatch.status === 'upcoming' && onSelectMatch && <button onClick={() => onSelectMatch(selectedMatch.id)} className="rounded-lg border border-white/10 px-3 py-2 text-sm text-emerald-200">Enter final result</button>}
            {selectedMatch.status === 'completed' && currentUser && selected.roster.some((entry) => entry.player_id === currentUser.id) && !selected.votes.some((vote) => vote.voter_id === currentUser.id) && onSelectMatch && <button onClick={() => onSelectMatch(selectedMatch.id)} className="rounded-lg bg-emerald-400 px-3 py-2 text-sm font-semibold text-[#07110f]">Vote MOTM</button>}
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2">
          {(['A', 'B'] as const).map((team) => <div key={team} className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><h3 className="mb-2 text-sm font-semibold text-white">{team === 'A' ? selectedMatch.team_a_name : selectedMatch.team_b_name}</h3><ul className="space-y-1.5">{selected.roster.filter((entry) => entry.team === team).map((entry) => <li key={entry.player_id} className="flex items-center justify-between gap-2 text-sm"><span className="truncate text-slate-200">{entry.player?.name}</span><span className="shrink-0 text-xs text-slate-500">{entry.player?.position}</span></li>)}</ul></div>)}
        </section>

        <section><h3 className="mb-3 text-sm font-semibold text-white">Saved formations</h3><FormationsBoard lineups={selected.lineups} activeTeam="both" /></section>

        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><h3 className="mb-3 text-sm font-semibold text-white">Match events</h3><ol className="space-y-2">{selected.events.map((event, index) => <li key={event.id || index} className="flex justify-between gap-3 text-sm"><span className="text-slate-200">{event.type.replaceAll('_', ' ')} · {event.scorer_name || 'Player'}{event.assist_name ? ` (assist: ${event.assist_name})` : ''}{event.detail ? ` · ${event.detail}` : ''}</span><span className="shrink-0 text-xs text-slate-500">{event.minute !== undefined ? `${event.minute}′ · ` : ''}{event.team === 'A' ? selectedMatch.team_a_name : selectedMatch.team_b_name}</span></li>)}{selected.events.length === 0 && <li className="text-sm text-slate-400">No events have been recorded.</li>}</ol></section>

        {selectedMatch.status === 'completed' && <section className="rounded-xl border border-emerald-300/20 bg-emerald-300/5 p-4"><h3 className="flex items-center gap-2 text-sm font-semibold text-white"><Trophy size={16} /> Man of the Match</h3>{getWinner(selected) ? <p className="mt-2 text-sm text-emerald-200">{getWinner(selected)?.name} · {selected.votes.filter((vote) => vote.voted_player_id === getWinner(selected)?.id).length} votes</p> : <p className="mt-2 text-sm text-slate-400">No votes yet · {selected.votes.length} total</p>}</section>}
      </article>}
    </div>
  );
};
