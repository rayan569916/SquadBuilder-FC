import React, { useState } from 'react';
import { Bell, ChartNoAxesColumn, CircleDot, LogOut, Shield, Shuffle, Users } from 'lucide-react';
import appLogo from '../../ -2.jpg';
import { useAuth } from '../context/AuthContext';
import { AuthScreen } from '../screens/AuthScreen';
import { FormationScreen } from '../screens/FormationScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { LeaderboardsScreen } from '../screens/LeaderboardsScreen';
import { MatchHistoryScreen } from '../screens/MatchHistoryScreen';
import { MatchSetupScreen } from '../screens/MatchSetupScreen';
import { PlayerProfileScreen } from '../screens/PlayerProfileScreen';
import { StatsEntryScreen } from '../screens/StatsEntryScreen';
import { UserManagementScreen } from '../screens/UserManagementScreen';

export type ScreenId = 'club' | 'balancer' | 'formation' | 'match_history' | 'stats_entry' | 'profile' | 'leaderboards' | 'admin_users';

export const AppNavigator: React.FC = () => {
  const { currentUser, isAdmin, isLoading, isAuthenticated, logout } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('club');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>();
  const [selectedMatchId, setSelectedMatchId] = useState<string>();
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const navigateTo = (screen: ScreenId, id?: string) => {
    if (screen === 'profile' && id) setSelectedPlayerId(id);
    if (['formation', 'stats_entry', 'match_history'].includes(screen) && id) setSelectedMatchId(id);
    setCurrentScreen(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    setLogoutError(null);
    try {
      await logout();
      setCurrentScreen('club');
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : 'Unable to sign out.');
    }
  };

  if (isLoading) {
    return <div className="ambient-blueprint ambient-halo grid min-h-screen place-items-center bg-[#080a10] text-slate-300">Loading your squad…</div>;
  }
  if (!isAuthenticated) return <AuthScreen />;

  const renderActiveScreen = () => {
    switch (currentScreen) {
      case 'balancer':
        return <MatchSetupScreen onMatchCreated={(id) => navigateTo('formation', id)} onNavigateToFormation={() => navigateTo('formation', selectedMatchId)} />;
      case 'formation':
        return <FormationScreen matchId={selectedMatchId} onViewPlayer={(id) => navigateTo('profile', id)} onChooseMatch={() => navigateTo('balancer')} />;
      case 'stats_entry':
        return <StatsEntryScreen matchId={selectedMatchId} onStatsSaved={() => navigateTo('match_history', selectedMatchId)} onChooseMatch={() => navigateTo('balancer')} />;
      case 'match_history':
        return <MatchHistoryScreen matchId={selectedMatchId} onLogNewMatch={() => navigateTo('balancer')} onSelectMatch={(id) => navigateTo('stats_entry', id)} />;
      case 'profile':
        return <PlayerProfileScreen playerId={selectedPlayerId || currentUser?.id} onNavigateToTactics={() => navigateTo('formation', selectedMatchId)} />;
      case 'leaderboards':
        return <LeaderboardsScreen onSelectPlayer={(id) => navigateTo('profile', id)} />;
      case 'admin_users':
        return <UserManagementScreen />;
      default:
        return <HomeScreen onNavigate={(screen, id) => navigateTo(screen as ScreenId, id)} />;
    }
  };

  const navItems = [
    { id: 'formation' as const, label: 'Tactics', Icon: CircleDot },
    { id: 'balancer' as const, label: 'Balancer', Icon: Shuffle },
    { id: 'match_history' as const, label: 'Match & Stats', Icon: ChartNoAxesColumn },
    { id: 'club' as const, label: 'Club', Icon: Shield },
  ];
  const activeNavId = currentScreen === 'stats_entry'
    ? 'match_history'
    : ['profile', 'leaderboards', 'admin_users'].includes(currentScreen) ? 'club' : currentScreen;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#080a10] text-slate-100">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/8 bg-[#080a10]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <button onClick={() => navigateTo('club')} className="flex min-w-0 items-center gap-2.5 text-left" aria-label="SquadBuilder home">
            <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl border border-sky-200/20 bg-black"><img src={appLogo} alt="" className="h-full w-full object-cover" /></span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold tracking-wide text-sky-100">SQUADBUILDER</span>
              <span className="block text-[10px] uppercase tracking-[0.12em] text-slate-400">Tactics Lab</span>
            </span>
          </button>
          <div className="flex items-center gap-2">
            <button title="Notifications" className="grid h-9 w-9 place-items-center rounded-full text-slate-300 hover:bg-white/10"><Bell size={17} /></button>
            <button title="Leaderboards" onClick={() => navigateTo('leaderboards')} className="grid h-9 w-9 place-items-center rounded-full text-slate-300 hover:bg-white/10"><ChartNoAxesColumn size={17} /></button>
            {isAdmin && (
              <button onClick={() => navigateTo('admin_users')} title="Manage accounts" className="grid h-9 w-9 place-items-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white"><Users size={18} /></button>
            )}
            <button onClick={() => navigateTo('profile', currentUser?.id)} title="Your profile" className="grid h-9 w-9 place-items-center overflow-hidden rounded-full border border-primary/30 bg-primary-container text-sm font-semibold text-white shadow-[0_0_18px_rgba(112,66,248,0.35)]">
              {currentUser?.avatar_url ? <img src={currentUser.avatar_url} alt="" className="h-full w-full object-cover" /> : currentUser?.name.slice(0, 2).toUpperCase()}
            </button>
            <button onClick={handleLogout} title="Sign out" className="grid h-9 w-9 place-items-center rounded-lg text-slate-300 hover:bg-rose-400/10 hover:text-rose-300"><LogOut size={18} /></button>
          </div>
        </div>
      </header>

      {logoutError && <p role="alert" className="mx-auto max-w-5xl px-4 py-2 text-sm text-rose-300">{logoutError}</p>}
      <main className="ambient-blueprint ambient-halo mx-auto min-h-[calc(100vh-4rem)] w-full max-w-5xl pt-16 pb-[calc(6rem+env(safe-area-inset-bottom))]">{renderActiveScreen()}</main>

      <nav aria-label="Main navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0c0e15]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto grid h-16 max-w-lg grid-cols-4 items-center px-2">
          {navItems.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => navigateTo(id)} aria-current={activeNavId === id ? 'page' : undefined}
              className={`flex h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] transition-colors ${activeNavId === id ? 'bg-primary-container/20 text-primary shadow-[inset_0_0_18px_rgba(112,66,248,0.18)]' : 'text-slate-400 hover:text-white'}`}>
              <Icon size={18} strokeWidth={activeNavId === id ? 2.5 : 1.8} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};
