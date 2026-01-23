// API Configuration for Backend Communication

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
const API_VERSION = '/api/v1';

export const API_URL = `${API_BASE_URL}${API_VERSION}`;

export interface CreateUserPayload {
  id: string; // Clerk ID
  email: string;
  age: number;
  weight: number; // kg
  height: number; // cm
  gender: string;
  activity_level: string;
  pregnancy_status?: string; // only for females
}

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
      detail: 'An unexpected error occurred',
    }));
    throw new Error(error.detail || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Creates a new user in the backend
 */
export async function createUser(payload: CreateUserPayload, token: string) {
  return apiRequest('/users', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Updates the current user's profile
 */
export async function updateUser(payload: Partial<CreateUserPayload>, token: string) {
  return apiRequest('/users/me', token, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
