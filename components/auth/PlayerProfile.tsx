import React from 'react';
import { authService } from '../../services/authService';
import type { PlayerData } from '../../types';

interface PlayerProfileProps {
  playerData: PlayerData;
  onLogout: () => void;
  compact?: boolean;
}

const PlayerProfile: React.FC<PlayerProfileProps> = ({ playerData, onLogout, compact }) => {
  const handleLogout = () => {
    authService.logout();
    onLogout();
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Unknown';
    }
  };

  // Compact version for TopBar
  if (compact) {
    return (
      <button
        onClick={handleLogout}
        title="Tap to logout"
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-arcade-primary/20 border border-arcade-primary/40 text-arcade-primary hover:bg-arcade-primary/30 transition-all font-nunito text-sm font-bold"
      >
        <span>🎮</span>
        <span>{playerData.playerCode}</span>
      </button>
    );
  }

  // Full version for desktop sidebar
  return (
    <div className="bg-arcade-panel border border-arcade-primary/20 rounded-xl p-4 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-arcade-primary/20 border-2 border-arcade-primary flex items-center justify-center flex-shrink-0">
            <span className="text-lg">🎮</span>
          </div>
          <div>
            <p className="font-fredoka text-arcade-primary text-base leading-tight">
              {playerData.playerCode}
            </p>
            <p className="font-nunito text-arcade-dim text-xs">
              Active since {formatDate(playerData.createdAt)}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="px-3 py-1.5 rounded-lg bg-arcade-card border border-arcade-dim/40 font-nunito text-arcade-dim text-sm hover:text-arcade-text hover:border-arcade-dim transition-all"
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default PlayerProfile;
