// TypeScript types matching backend User model

export interface User {
  id: string; // Clerk ID
  email: string;
  is_active: boolean;
  age: number | null;
  weight: number | null; // kg
  height: number | null; // cm
  gender: string | null;
  activity_level: string | null;
  pregnancy_status: string | null;
}

export interface UserUpdate {
  email?: string;
  age?: number;
  weight?: number; // kg
  height?: number; // cm
  gender?: string;
  activity_level?: string;
  pregnancy_status?: string;
}

export interface UserCreate {
  email: string;
  is_active?: boolean;
  age?: number;
  weight?: number; // kg
  height?: number; // cm
  gender?: string;
  activity_level?: string;
  pregnancy_status?: string;
}

// Extended user profile with Clerk data
export interface UserProfile extends User {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  imageUrl?: string;
}
