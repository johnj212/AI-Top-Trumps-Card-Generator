import type { LoginRequest, LoginResponse, PlayerData } from '../types';

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '' // Use relative URLs in production
  : 'http://localhost:3001';

class AuthService {
  private playerData: PlayerData | null = null;

  constructor() {
    // Restore player data from localStorage on initialization
    // Token is now stored in httpOnly cookie for security
    const savedPlayerData = localStorage.getItem('player_data');
    if (savedPlayerData) {
      try {
        this.playerData = JSON.parse(savedPlayerData);
      } catch {
        // Invalid saved data, clear it
        localStorage.removeItem('player_data');
      }
    }
  }

  async login(playerCode: string): Promise<LoginResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important: send and receive cookies
        body: JSON.stringify({ playerCode } as LoginRequest),
      });

      const data: LoginResponse = await response.json();

      if (data.success && data.playerData) {
        this.playerData = data.playerData;

        // Only save player data to localStorage (token is in httpOnly cookie)
        localStorage.setItem('player_data', JSON.stringify(data.playerData));
      }

      return data;
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection and try again.'
      };
    }
  }

  async validateToken(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/validate`, {
        credentials: 'include', // Send httpOnly cookie with request
      });

      const data = await response.json();

      if (data.success && data.playerData) {
        this.playerData = data.playerData;
        localStorage.setItem('player_data', JSON.stringify(data.playerData));
        return true;
      } else {
        // Token is invalid, clear stored data
        this.logout();
        return false;
      }
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }

  async logout(): Promise<void> {
    try {
      // Call backend to clear httpOnly cookie
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local data regardless of API call result
      this.playerData = null;
      localStorage.removeItem('player_data');
    }
  }

  getPlayerData(): PlayerData | null {
    return this.playerData;
  }

  isAuthenticated(): boolean {
    // With httpOnly cookies, we rely on playerData being present
    // The cookie will be sent automatically with requests
    return !!this.playerData;
  }

  // Helper method to get fetch options with credentials for API requests
  getAuthFetchOptions(options: RequestInit = {}): RequestInit {
    return {
      ...options,
      credentials: 'include', // Always include cookies
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };
  }
}

// Export a singleton instance
export const authService = new AuthService();