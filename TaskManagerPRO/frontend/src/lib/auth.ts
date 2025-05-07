'use client';

import { connectSocket, disconnectSocket } from './socket';
import Cookies from 'js-cookie';
import api from './api';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  token: string;
  user: User;
  isAuthenticated: boolean;
}

// Storage keys
const TOKEN_COOKIE = 'token';
const USER_DATA_COOKIE = 'user_data';
const TOKEN_STORAGE_KEY = 'session_token';
const USER_STORAGE_KEY = 'session_user';

// Generate a unique session ID that won't conflict
const generateSessionId = () => {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

// Get current session ID from sessionStorage or create a new one
const getOrCreateSessionId = () => {
  if (typeof window === 'undefined') return null;
  
  let sessionId = sessionStorage.getItem('sessionId');
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem('sessionId', sessionId);
  }
  return sessionId;
};

// Store auth data in sessionStorage (primary) and cookies (fallback)
export const saveAuthData = (token: string, user: User) => {
  try {
    // Get current session ID
    const sessionId = getOrCreateSessionId();
    if (!sessionId) return;
    
    // Primary: Store in sessionStorage for tab isolation
    sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    
    // Fallback: Store token in cookies (for API requests using HTTP-only cookies)
    // Use path-specific cookies to avoid overwriting across tabs
    Cookies.set(`${TOKEN_COOKIE}_${sessionId}`, token, { 
      expires: 7, // 7 days
      sameSite: 'strict',
      path: '/'
    });
    
    // Fallback: Store user data in a cookie (not sensitive info)
    // Use path-specific cookies to avoid overwriting across tabs
    Cookies.set(`${USER_DATA_COOKIE}_${sessionId}`, JSON.stringify(user), { 
      expires: 7,
      sameSite: 'strict',
      path: '/' 
    });
    
    // Create auth state for this session
    const authState: AuthState = {
      token,
      user,
      isAuthenticated: true
    };
    
    // Store auth state in sessionStorage for current session only
    sessionStorage.setItem(`auth-${sessionId}`, JSON.stringify(authState));
    
    // CRITICAL: Do NOT touch localStorage to avoid affecting other tabs
    // We completely avoid using localStorage for auth to prevent cross-tab issues
    
    // Store current path in sessionStorage
    sessionStorage.setItem('currentPath', '/dashboard');
    
    // Connect to socket with the new token for this tab only
    connectSocket(token);
    
    // Set API token for requests in this tab only
    if ('defaults' in api) {
      (api as any).defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    
  } catch (error) {
    console.error('Failed to save auth data', error);
  }
};

// Update user data in sessionStorage and cookies when it changes
export const updateUserData = (userData: Partial<User>) => {
  try {
    // Get current auth data
    const currentAuthData = getAuthData();
    if (!currentAuthData || !currentAuthData.user || !currentAuthData.token) {
      console.error('Cannot update user data: No current auth data found');
      return false;
    }
    
    // Get current session ID
    const sessionId = getOrCreateSessionId();
    if (!sessionId) return false;
    
    // Update user data
    const updatedUser = {
      ...currentAuthData.user,
      ...userData
    };
    
    // Create updated auth state
    const updatedAuthState: AuthState = {
      ...currentAuthData,
      user: updatedUser,
    };
    
    // Primary: Update sessionStorage
    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
    
    // Fallback: Update user data cookie
    Cookies.set(`${USER_DATA_COOKIE}_${sessionId}`, JSON.stringify(updatedUser), { 
      expires: 7,
      sameSite: 'strict',
      path: '/' 
    });
    
    // Update session-specific auth data
    sessionStorage.setItem(`auth-${sessionId}`, JSON.stringify(updatedAuthState));
    
    // IMPORTANT: Do NOT update localStorage to avoid affecting other tabs
    
    console.log('User data updated successfully:', updatedUser);
    return true;
  } catch (error) {
    console.error('Failed to update user data:', error);
    return false;
  }
};

// Get auth data from sessionStorage (primary) or cookies (fallback)
export const getAuthData = (): AuthState | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    // Get current session ID
    const sessionId = sessionStorage.getItem('sessionId');
    if (!sessionId) return null;
    
    // Primary: Try to get from sessionStorage first
    const sessionToken = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    const sessionUserString = sessionStorage.getItem(USER_STORAGE_KEY);
    
    if (sessionToken && sessionUserString) {
      const user = JSON.parse(sessionUserString);
      return {
        token: sessionToken,
        user,
        isAuthenticated: true
      };
    }
    
    // Fallback: Try session-specific cookies if sessionStorage doesn't have the data
    const token = Cookies.get(`${TOKEN_COOKIE}_${sessionId}`);
    if (!token) return null;
    
    const userDataString = Cookies.get(`${USER_DATA_COOKIE}_${sessionId}`);
    if (!userDataString) return null;
    
    // Parse user data from cookie
    const user = JSON.parse(userDataString);
    
    // Store in sessionStorage for future use
    sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    
    return {
      token,
      user,
      isAuthenticated: true
    };
  } catch (error) {
    console.error('Failed to get auth data', error);
    return null;
  }
};

// Get auth token - prefer sessionStorage over cookies
export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  
  // Try sessionStorage first
  const sessionToken = sessionStorage.getItem(TOKEN_STORAGE_KEY);
  if (sessionToken) return sessionToken;
  
  // Fallback to session-specific cookies
  const sessionId = sessionStorage.getItem('sessionId');
  if (sessionId) {
    return Cookies.get(`${TOKEN_COOKIE}_${sessionId}`) || null;
  }
  
  return null;
};

// Get current user - prefer sessionStorage over cookies
export const getUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  
  // Try sessionStorage first
  const sessionUserString = sessionStorage.getItem(USER_STORAGE_KEY);
  if (sessionUserString) {
    try {
      return JSON.parse(sessionUserString);
    } catch (error) {
      console.error('Failed to parse user data from sessionStorage', error);
    }
  }
  
  // Fallback to session-specific cookies
  const sessionId = sessionStorage.getItem('sessionId');
  if (sessionId) {
    const userDataString = Cookies.get(`${USER_DATA_COOKIE}_${sessionId}`);
    if (userDataString) {
      try {
        return JSON.parse(userDataString);
      } catch (error) {
        console.error('Failed to parse user data from cookies', error);
      }
    }
  }
  
  return null;
};

// Check if user is authenticated - use sessionStorage first
export const isAuthenticated = (): boolean => {
  return !!getToken();
};

// Log out user - clear only the current tab's session
export const logout = async (isVoluntary = true) => {
  try {
    // Get current session ID
    const sessionId = sessionStorage.getItem('sessionId');
    
    // Call the backend logout endpoint to clear HTTP-only cookies for this session
    try {
      await api.post('/auth/logout', { sessionId });
    } catch (error) {
      console.error('Error calling logout endpoint:', error);
    }
    
    // Clear sessionStorage for this session only
    sessionStorage.clear(); // Clear all session data for this tab
    
    // Remove session-specific cookies
    if (sessionId) {
      Cookies.remove(`${TOKEN_COOKIE}_${sessionId}`, { path: '/' });
      Cookies.remove(`${USER_DATA_COOKIE}_${sessionId}`, { path: '/' });
    }
    
    // Don't remove the global cookies to avoid affecting other tabs
    // Only remove them if we're sure no other tabs are using them
    
    // Clear API header for this tab
    if ('defaults' in api) {
      delete (api as any).defaults.headers.common['Authorization'];
    }
    
    // Disconnect socket for this tab
    disconnectSocket();
    
    // Important: DO NOT clear the global localStorage auth-storage
    // This prevents logout from affecting other tabs
    // Instead, create an event specifically for this purpose if needed
    if (isVoluntary && sessionId) {
      // Instead of removing localStorage, dispatch a custom event
      // that other tabs can listen for if you want coordinated logout
      const logoutEvent = new CustomEvent('tab-logout', {
        detail: { sessionId }
      });
      window.dispatchEvent(logoutEvent);
    }
    
    console.log('Logout completed successfully for this tab');
    return true;
  } catch (error) {
    console.error('Failed to logout', error);
    return false;
  }
};

// Initialize session
export const initSession = () => {
  if (typeof window === 'undefined') return;
  
  // Ensure we have a session ID
  getOrCreateSessionId();
  
  // Connect with token if authenticated and set the API header
  const token = getToken();
  if (token) {
    connectSocket(token);
    if ('defaults' in api) {
      (api as any).defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }
};

// For handling page refreshes and coordinating between tabs if needed
if (typeof window !== 'undefined') {
  window.addEventListener('load', initSession);
  
  // Remove the storage event listener that was causing logout in all tabs
  
  // Optional: Add a custom event listener to handle coordinated logouts if needed
  // This is for future extensibility but won't be triggered in the current implementation
  window.addEventListener('tab-logout', (event: any) => {
    // Only respond if explicitly requested for this tab
    const eventSessionId = event.detail?.sessionId;
    const currentSessionId = sessionStorage.getItem('sessionId');
    
    // Only respond if the event relates to this specific tab
    if (eventSessionId === currentSessionId) {
      console.log('Received logout event for this tab');
    }
  });
}

// Backward compatibility functions - now just aliases to the main functions
export const setUserSession = (user: User) => {
  sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
};

export const getUserFromSession = (): User | null => {
  const userStr = sessionStorage.getItem(USER_STORAGE_KEY);
  return userStr ? JSON.parse(userStr) : null;
};

export const setTokenSession = (token: string) => {
  sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
  if ('defaults' in api) {
    (api as any).defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
};

export const getTokenFromSession = (): string | null => {
  return sessionStorage.getItem(TOKEN_STORAGE_KEY);
};

export const removeUserSession = () => {
  sessionStorage.removeItem(USER_STORAGE_KEY);
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  if ('defaults' in api) {
    delete (api as any).defaults.headers.common['Authorization'];
  }
};

// Utility function to check if the user is logged in
export const isLoggedIn = () => {
  return !!getTokenFromSession();
};

// Get current session ID or create a new one
export const getSessionId = () => {
  let sessionId = sessionStorage.getItem('sessionId');
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem('sessionId', sessionId);
  }
  return sessionId;
}; 