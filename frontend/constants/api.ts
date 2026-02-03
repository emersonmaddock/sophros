// API Configuration for Backend Communication

import { User, UserCreate, UserUpdate } from '@/types/user';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
const API_VERSION = '/api/v1';

export const API_URL = `${API_BASE_URL}${API_VERSION}`;

export interface ApiError {
  detail: string;
}

/**
 * Makes an authenticated API request to the backend
 * @param endpoint - API endpoint (e.g., '/users')
 * @param token - Clerk session token
 * @param options - Fetch options
 */
export async function apiRequest<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: `HTTP ${response.status}: ${response.statusText}`,
    }));
    
    // Create error with status code included
    const errorMessage = `${error.detail} (Status: ${response.status})`;
    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * Fetches the current user's profile from the backend
 * Returns null if user doesn't exist (404)
 */
export async function getUser(token: string): Promise<User | null> {
  try {
    return await apiRequest<User>('/users/me', token);
  } catch (error) {
    // User doesn't exist in backend yet (404)
    if (error instanceof Error && (error.message.includes('404') || error.message.includes('Status: 404'))) {
      return null;
    }
    // Re-throw other errors (network, 401, 500, etc.)
    throw error;
  }
}

/**
 * Creates a new user in the backend
 */
export async function createUser(payload: UserCreate, token: string): Promise<User> {
  return apiRequest<User>('/users', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Updates the current user's profile
 */
export async function updateUser(payload: UserUpdate, token: string): Promise<User> {
  return apiRequest<User>('/users/me', token, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
