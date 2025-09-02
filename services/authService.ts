import type { LoginRequest, LoginResponse, PlayerData } from '../types';

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '' // Use relative URLs in production
  : 'http://localhost:3001';

class AuthService {
  private token: string | null = null;
  private playerData: PlayerData | null = null;

  constructor() {
    // Try to restore token from localStorage on initialization
    this.token = localStorage.getItem('player_token');
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
        body: JSON.stringify({ playerCode } as LoginRequest),
      });

      const data: LoginResponse = await response.json();

      if (data.success && data.token && data.playerData) {
        this.token = data.token;
        this.playerData = data.playerData;
        
        // Save to localStorage for persistence
        localStorage.setItem('player_token', data.token);
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
    if (!this.token) {
      return false;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/validate`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
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

  logout(): void {
    this.token = null;
    this.playerData = null;
    localStorage.removeItem('player_token');
    localStorage.removeItem('player_data');
  }

  getToken(): string | null {
    return this.token;
  }

  getPlayerData(): PlayerData | null {
    return this.playerData;
  }

  isAuthenticated(): boolean {
    return !!this.token && !!this.playerData;
  }

  // Helper method to add authorization header to API requests
  getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }
}

// Export a singleton instance
export const authService = new AuthService();