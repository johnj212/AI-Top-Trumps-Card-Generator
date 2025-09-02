import React from 'react';
import { authService } from '../../services/authService';
import type { PlayerData } from '../../types';

interface PlayerProfileProps {
  playerData: PlayerData;
  onLogout: () => void;
}

const PlayerProfile: React.FC<PlayerProfileProps> = ({ playerData, onLogout }) => {
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

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-orange-600 rounded-full p-2">
            <span className="text-white text-lg">🎮</span>
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">
              Player: {playerData.playerCode}
            </h3>
            <p className="text-gray-400 text-sm">
              Active since {formatDate(playerData.createdAt)}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white px-3 py-1 rounded text-sm transition-colors duration-200"
          title="Logout"
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default PlayerProfile;