import React, { useState } from 'react';
import { authService } from '../../services/authService';
import type { PlayerData } from '../../types';

interface LoginScreenProps {
  onLogin: (playerData: PlayerData) => void;
  onError: (error: string) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onError }) => {
  const [playerCode, setPlayerCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!playerCode.trim()) {
      onError('Please enter your player code');
      return;
    }

    // Clear any previous errors before attempting login
    onError('');
    setIsLoading(true);

    try {
      const result = await authService.login(playerCode.trim());

      if (result.success && result.playerData) {
        onLogin(result.playerData);
      } else {
        onError(result.error || 'Login failed. Please check your player code.');
      }
    } catch (error) {
      onError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().slice(0, 10); // Limit to 10 characters, uppercase
    setPlayerCode(value);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="text-6xl mb-4">🃏</div>
          <h1 className="text-4xl font-bold text-white mb-2">
            AI Top Trumps
          </h1>
          <p className="text-gray-400 text-lg">
            Card Generator
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-gray-800 rounded-lg p-8 shadow-2xl border border-gray-700">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">
              Enter Player Code
            </h2>
            <p className="text-gray-400 text-sm">
              Enter your player code to access the card generator
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="playerCode" className="block text-sm font-medium text-gray-300 mb-2">
                Player Code
              </label>
              <input
                id="playerCode"
                type="text"
                value={playerCode}
                onChange={handleInputChange}
                placeholder="PLAYER1"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-center text-xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                disabled={isLoading}
                maxLength={10}
                autoComplete="off"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || playerCode.length === 0}
              className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition duration-200 text-lg"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Logging In...
                </div>
              ) : (
                'Start Playing'
              )}
            </button>
          </form>

          {/* Help Section */}
          <div className="mt-6 pt-6 border-t border-gray-700">
            <button
              type="button"
              onClick={() => setShowHint(!showHint)}
              className="text-gray-400 hover:text-white text-sm underline w-full text-center"
            >
              Need help? Click for hint
            </button>
            
            {showHint && (
              <div className="mt-4 p-4 bg-gray-700 rounded-lg text-sm">
                <p className="text-gray-300">
                  <span className="font-bold text-orange-400">Need a player code?</span>
                  <br />
                  Player codes are alphanumeric (letters and numbers). Contact an admin to get your player code.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm">
          <p>🔒 Your privacy is protected. No personal information is collected.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;