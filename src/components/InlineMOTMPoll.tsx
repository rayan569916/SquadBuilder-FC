import React, { useMemo, useState } from 'react';
import { Check, LoaderCircle, LockKeyhole, Trophy, UserCheck } from 'lucide-react';
import { api, MatchDetail } from '../lib/api';
import { MotmVote, Profile } from '../types/database';

interface InlineMOTMPollProps {
  detail: MatchDetail;
  currentUser: Profile | null;
  isAdmin: boolean;
  onDetailUpdated: (detail: MatchDetail) => void;
}

export const InlineMOTMPoll: React.FC<InlineMOTMPollProps> = ({ detail, currentUser, isAdmin, onDetailUpdated }) => {
  const { match, roster, votes } = detail;
  const [selectedVoteId, setSelectedVoteId] = useState('');
  const [selectedMvpId, setSelectedMvpId] = useState('');
  const [localVote, setLocalVote] = useState<MotmVote | null>(null);
  const [approvedPlayerId, setApprovedPlayerId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<'vote' | 'approve' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const candidates = useMemo(() => roster
    .map((entry) => entry.player)
    .filter((player): player is Profile => Boolean(player)), [roster]);
  const voteRows = useMemo(() => localVote ? [...votes, localVote] : votes, [localVote, votes]);
  const counts = useMemo(() => {
    const result = new Map(candidates.map((player) => [player.id, 0]));
    voteRows.forEach((vote) => result.set(vote.voted_player_id, (result.get(vote.voted_player_id) || 0) + 1));
    return result;
  }, [candidates, voteRows]);
  const highestVoteCount = Math.max(0, ...counts.values());
  const leaders = useMemo(() => highestVoteCount === 0
    ? []
    : candidates.filter((player) => counts.get(player.id) === highestVoteCount), [candidates, counts, highestVoteCount]);
  const hasVoted = Boolean(currentUser && voteRows.some((vote) => vote.voter_id === currentUser.id));
  const isParticipant = Boolean(currentUser && roster.some((entry) => entry.player_id === currentUser.id));
  const isLocked = Boolean(match.motm_locked_at || approvedPlayerId);
  const winnerId = approvedPlayerId || match.motm_player_id;
  const winner = candidates.find((player) => player.id === winnerId);
  const canVote = match.status === 'completed' && !isLocked && isParticipant && !hasVoted;
  const canApprove = match.status === 'completed' && !isLocked && Boolean(currentUser && (
    isAdmin || match.manager_a_id === currentUser.id || match.manager_b_id === currentUser.id
  ));

  React.useEffect(() => {
    if (!candidates.some((player) => player.id === selectedVoteId)) setSelectedVoteId(candidates[0]?.id || '');
  }, [candidates, selectedVoteId]);
  React.useEffect(() => {
    if (!leaders.some((player) => player.id === selectedMvpId)) setSelectedMvpId(leaders[0]?.id || '');
  }, [leaders, selectedMvpId]);

  const castVote = async () => {
    if (!currentUser || !selectedVoteId || !canVote || submitting) return;
    setSubmitting('vote');
    setError(null);
    try {
      const vote = await api.castMotmVote(match.id, currentUser.id, selectedVoteId);
      setLocalVote(vote);
      try {
        const refreshed = await api.getMatchDetail(match.id);
        if (refreshed) {
          setLocalVote(null);
          onDetailUpdated(refreshed);
        }
      } catch {
        setError('Your vote was saved, but the latest totals could not be refreshed.');
      }
    } catch (voteError) {
      setError(voteError instanceof Error ? voteError.message : 'Unable to submit your vote.');
    } finally {
      setSubmitting(null);
    }
  };

  const approveMvp = async () => {
    if (!selectedMvpId || !leaders.some((player) => player.id === selectedMvpId) || !canApprove || submitting) return;
    setSubmitting('approve');
    setError(null);
    try {
      await api.approveMatchMotm(match.id, selectedMvpId);
      setApprovedPlayerId(selectedMvpId);
      try {
        const refreshed = await api.getMatchDetail(match.id);
        if (refreshed) onDetailUpdated(refreshed);
      } catch {
        setError('MVP approval was saved, but the match details could not be refreshed.');
      }
    } catch (approvalError) {
      setError(approvalError instanceof Error ? approvalError.message : 'Unable to approve the MVP.');
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <section className="glass-card space-y-4 rounded-2xl p-4" aria-labelledby="mvp-poll-title">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 id="mvp-poll-title" className="flex items-center gap-2 text-sm font-semibold text-white"><Trophy size={16} className="text-primary" /> MVP vote</h3>
          <p className="mt-1 text-xs text-slate-400">{voteRows.length} votes · {candidates.length} match players</p>
        </div>
        {isLocked && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] text-emerald-200"><LockKeyhole size={12} />Approved</span>}
      </header>

      {winner && isLocked && <div className="flex items-center gap-3 rounded-xl border border-emerald-300/20 bg-emerald-300/6 p-3">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-primary-container text-xs font-bold text-white">{winner.name.slice(0, 2).toUpperCase()}</span>
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-white">{winner.name}</span><span className="text-[10px] text-slate-400">Approved MVP · {counts.get(winner.id) || 0} votes</span></span>
        <Check size={16} className="text-emerald-200" />
      </div>}

      <div className="space-y-2">
        {candidates.map((player) => {
          const playerVotes = counts.get(player.id) || 0;
          const percentage = voteRows.length ? Math.round((playerVotes / voteRows.length) * 100) : 0;
          const selected = selectedVoteId === player.id;
          return <button key={player.id} type="button" disabled={!canVote} aria-pressed={selected} onClick={() => setSelectedVoteId(player.id)} className={`grid w-full grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border p-3 text-left disabled:cursor-default ${selected && canVote ? 'border-primary/45 bg-primary/[0.08]' : 'border-white/[0.07] bg-white/2'}`}>
            <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-slate-800 text-[10px] font-semibold text-white">{player.avatar_url ? <img src={player.avatar_url} alt="" className="h-full w-full object-cover" /> : player.name.slice(0, 2).toUpperCase()}</span>
            <span className="min-w-0"><span className="block truncate text-xs font-medium text-white">{player.name}</span><span className="text-[10px] text-slate-400">{player.position} · {playerVotes} votes · {player.total_motm_votes || 0} career</span><span className="mt-1 block h-1 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full bg-primary-container" style={{ width: `${percentage}%` }} /></span></span>
            <span className="text-xs tabular-nums text-sky-200">{percentage}%</span>
          </button>;
        })}
        {candidates.length === 0 && <p className="rounded-lg bg-white/3 p-3 text-xs text-slate-400">No players are assigned to this match.</p>}
      </div>

      {canVote && <button type="button" disabled={!selectedVoteId || submitting !== null} onClick={() => void castVote()} className="flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-primary-container px-4 text-xs font-semibold text-white disabled:opacity-50">{submitting === 'vote' && <LoaderCircle size={14} className="animate-spin" />}Submit vote</button>}
      {hasVoted && !isLocked && <p className="text-xs text-emerald-200">Your vote is recorded. Voting remains open until a manager approves the MVP.</p>}

      {canApprove && <div className="space-y-2 border-t border-white/8 pt-3">
        <p className="text-xs font-medium text-slate-200">Manager / admin approval</p>
        {leaders.length === 0 ? <p className="text-[10px] text-slate-400">There are no votes to approve yet.</p> : <>
          <p className="text-[10px] text-slate-400">Approve a top-voted player to name the MVP and close voting{leaders.length > 1 ? '. Votes are tied; select one of the leaders.' : '.'}</p>
          {leaders.length > 1 && <div className="flex flex-wrap gap-2">{leaders.map((player) => <button key={player.id} type="button" aria-pressed={selectedMvpId === player.id} onClick={() => setSelectedMvpId(player.id)} className={`rounded-full border px-3 py-1.5 text-[10px] ${selectedMvpId === player.id ? 'border-primary/50 bg-primary/15 text-primary' : 'border-white/10 text-slate-300'}`}>{player.name} · {counts.get(player.id)} votes</button>)}</div>}
          <button type="button" disabled={!selectedMvpId || submitting !== null} onClick={() => void approveMvp()} className="flex min-h-10 w-full items-center justify-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 text-xs font-semibold text-emerald-100 disabled:opacity-50">{submitting === 'approve' ? <LoaderCircle size={14} className="animate-spin" /> : <UserCheck size={14} />}Approve MVP &amp; close voting</button>
        </>}
      </div>}

      {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
    </section>
  );
};