import React, { useState } from 'react';
import { CalendarDays, ClipboardList, History, Home, LogOut, Shield, Users } from 'lucide-react';
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
  const { currentUser, role, isAdmin, isLoading, isAuthenticated, logout } = useAuth();
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
    return <div className="min-h-screen grid place-items-center bg-[#080a10] text-slate-300">Loading your squad…</div>;
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
    { id: 'club' as const, label: 'Home', Icon: Home },
    { id: 'balancer' as const, label: 'New match', Icon: CalendarDays },
    { id: 'match_history' as const, label: 'History', Icon: History },
    { id: 'formation' as const, label: 'Tactics', Icon: ClipboardList },
  ];

  return (
    <div className="relative min-h-screen bg-[#080a10] text-slate-100">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#080a10]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
          <button onClick={() => navigateTo('club')} className="flex min-w-0 items-center gap-2.5 text-left" aria-label="SquadBuilder home">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-400/15 text-emerald-300"><Shield size={19} /></span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold tracking-wide text-white">SQUADBUILDER FC</span>
              <span className="block text-xs capitalize text-slate-400">{role} account</span>
            </span>
          </button>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button onClick={() => navigateTo('admin_users')} title="Manage accounts" className="grid h-9 w-9 place-items-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white"><Users size={18} /></button>
            )}
            <button onClick={() => navigateTo('profile', currentUser?.id)} title="Your profile" className="grid h-9 w-9 place-items-center overflow-hidden rounded-full border border-white/15 bg-slate-800 text-sm font-semibold text-white">
              {currentUser?.avatar_url ? <img src={currentUser.avatar_url} alt="" className="h-full w-full object-cover" /> : currentUser?.name.slice(0, 2).toUpperCase()}
            </button>
            <button onClick={handleLogout} title="Sign out" className="grid h-9 w-9 place-items-center rounded-lg text-slate-300 hover:bg-rose-400/10 hover:text-rose-300"><LogOut size={18} /></button>
          </div>
        </div>
      </header>

      {logoutError && <p role="alert" className="mx-auto max-w-5xl px-4 py-2 text-sm text-rose-300">{logoutError}</p>}
      <main className="mx-auto min-h-[calc(100vh-8rem)] w-full max-w-5xl pb-24">{renderActiveScreen()}</main>

      <nav aria-label="Main navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0c0e15]/95 pb-safe backdrop-blur">
        <div className="mx-auto grid h-16 max-w-lg grid-cols-4 items-center px-2">
          {navItems.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => navigateTo(id)} aria-current={currentScreen === id ? 'page' : undefined}
              className={`flex h-12 flex-col items-center justify-center gap-1 rounded-lg text-[11px] ${currentScreen === id ? 'text-emerald-300' : 'text-slate-400 hover:text-white'}`}>
              <Icon size={18} strokeWidth={currentScreen === id ? 2.5 : 1.8} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};
