import React, { useEffect, useState } from 'react';
import { Check, LoaderCircle, Trophy, X } from 'lucide-react';
import { api } from '../lib/api';
import { Match, MotmVote, Profile } from '../types/database';

interface MOTMModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match;
  candidates: Profile[];
  currentUserId: string;
  canVote?: boolean;
  onVoteCast?: (votedPlayerId: string) => void;
}

export const MOTMModal: React.FC<MOTMModalProps> = ({
  isOpen,
  onClose,
  match,
  candidates,
  currentUserId,
  canVote = false,
  onVoteCast,
}) => {
  const [votes, setVotes] = useState<MotmVote[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setLoading(true);
    api.getMotmVotes(match.id).then((result) => {
      if (!active) return;
      setVotes(result);
      setHasVoted(result.some((vote) => vote.voter_id === currentUserId));
      setSelectedCandidateId(candidates[0]?.id || '');
    }).catch((loadError: unknown) => {
      if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load votes.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [isOpen, match.id, currentUserId, candidates]);

  if (!isOpen) return null;

  const countFor = (playerId: string) => votes.filter((vote) => vote.voted_player_id === playerId).length;
  const totalVotes = votes.length;

  const castVote = async () => {
    if (!canVote || !currentUserId || !selectedCandidateId || hasVoted || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.castMotmVote(match.id, currentUserId, selectedCandidateId);
      const refreshed = await api.getMotmVotes(match.id);
      setVotes(refreshed);
      setHasVoted(true);
      onVoteCast?.(selectedCandidateId);
    } catch (voteError) {
      setError(voteError instanceof Error ? voteError.message : 'Unable to submit your vote.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="motm-title" className="w-full max-w-lg rounded-xl border border-white/10 bg-[#10121b] p-5 shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-emerald-300"><Trophy size={15} /> Match poll</p><h2 id="motm-title" className="mt-1 text-lg font-bold text-white">Man of the Match</h2><p className="mt-1 text-xs text-slate-400">{match.team_a_name} {match.team_a_score} - {match.team_b_score} {match.team_b_name}</p></div>
          <button onClick={onClose} title="Close poll" className="grid h-8 w-8 place-items-center rounded-md text-slate-400 hover:bg-white/10 hover:text-white"><X size={18} /></button>
        </header>

        {loading ? <div className="grid min-h-32 place-items-center"><LoaderCircle className="animate-spin text-slate-300" /></div> : <>
          <div className="mt-4 space-y-2">
            {candidates.map((player) => {
              const votesForPlayer = countFor(player.id);
              const percentage = totalVotes ? Math.round((votesForPlayer / totalVotes) * 100) : 0;
              const selected = selectedCandidateId === player.id;
              return <button key={player.id} type="button" disabled={hasVoted || !canVote} onClick={() => setSelectedCandidateId(player.id)} className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left disabled:cursor-default ${selected ? 'border-emerald-300/50 bg-emerald-300/10' : 'border-white/10 bg-white/[0.02]'}`}>
                <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-800 text-xs font-semibold text-white">{player.avatar_url ? <img src={player.avatar_url} alt="" className="h-full w-full object-cover" /> : player.name.slice(0, 2).toUpperCase()}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-white">{player.name}</span><span className="text-xs text-slate-400">{player.position} · {votesForPlayer} votes</span><span className="mt-1 block h-1 overflow-hidden rounded bg-white/10"><span className="block h-full bg-emerald-300" style={{ width: `${percentage}%` }} /></span></span>
                <span className="w-10 text-right text-sm tabular-nums text-emerald-200">{percentage}%</span>
                {selected && <Check size={16} className="text-emerald-200" />}
              </button>;
            })}
            {candidates.length === 0 && <p className="py-5 text-sm text-slate-400">There are no eligible players for this poll.</p>}
          </div>
          <p className="mt-3 text-xs text-slate-400">{totalVotes} total votes{hasVoted ? ' · Your vote is recorded' : ''}</p>
          {!canVote && <p className="mt-2 text-xs text-amber-200">Only players selected for this match can vote.</p>}
          {error && <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}
          <footer className="mt-4 flex justify-end gap-2">
            <button onClick={onClose} className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300">Close</button>
            <button onClick={() => void castVote()} disabled={!canVote || hasVoted || !selectedCandidateId || submitting} className="flex items-center gap-2 rounded-lg bg-emerald-400 px-3 py-2 text-sm font-semibold text-[#07110f] disabled:opacity-50">{submitting && <LoaderCircle size={15} className="animate-spin" />}{hasVoted ? 'Vote submitted' : 'Submit vote'}</button>
          </footer>
        </>}
      </section>
    </div>
  );
};
