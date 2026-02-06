// Helper functions for the generated API SDK
import { client } from '../api/client.gen';
import {
  createUserApiV1UsersPost,
  readUserMeApiV1UsersMeGet,
  updateUserMeApiV1UsersMePut,
} from '../api/sdk.gen';
import type { User, UserCreate, UserUpdate } from '../api/types.gen';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

// Configure the client with base URL
client.setConfig({
  baseUrl: API_BASE_URL,
});

/**
 * Fetches the current user's profile from the backend
 * Returns null if user doesn't exist (404)
 */
export async function getUser(token: string): Promise<User | null> {
  try {
    // Configure client with auth token
    client.setConfig({
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const response = await readUserMeApiV1UsersMeGet();
    if (!response.data) {
      throw new Error('No data returned from API');
    }
    return response.data;
  } catch (error) {
    // User doesn't exist in backend yet (404)
    if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
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
  // Configure client with auth token
  client.setConfig({
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const response = await createUserApiV1UsersPost({
    body: payload,
  });

  if (!response.data) {
    throw new Error('No data returned from API');
  }
  return response.data;
}

/**
 * Updates the current user's profile
 */
export async function updateUser(payload: UserUpdate, token: string): Promise<User> {
  // Configure client with auth token
  client.setConfig({
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const response = await updateUserMeApiV1UsersMePut({
    body: payload,
  });

  if (!response.data) {
    throw new Error('No data returned from API');
  }
  return response.data;
}
