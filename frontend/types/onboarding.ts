export type Gender = 'male' | 'female';

export type ActivityLevel = 
  | 'sedentary' 
  | 'lightly-active' 
  | 'moderately-active' 
  | 'very-active' 

export type PrimaryGoal = 
  | 'build-muscle' 
  | 'lose-weight' 
  | 'maintain-health' 
  | 'increase-energy' 
  | 'improve-fitness' 
  | 'eat-nutritiously';

export type DietaryRestriction = 
  | 'vegetarian' 
  | 'vegan' 
  | 'pescatarian' 
  | 'gluten-free' 
  | 'dairy-free' 
  | 'nut-allergies' 
  | 'no-restrictions';

export interface BiologicalProfile {
  gender: Gender | null;
  age: number | null;
  heightFeet: number | null;
  heightInches: number | null;
  heightCm: number | null;
  useMetric: boolean;
  weightLbs: number | null;
  weightKg: number | null;
}


export interface OnboardingData {
  // Screen 3
  primaryGoal: PrimaryGoal | null;
  
  // Screen 4 & 5
  biologicalProfile: BiologicalProfile;
  activityLevel: ActivityLevel | null;
  
  // Screen 6
  dietaryRestrictions: DietaryRestriction[];
  otherRestrictions: string;
  
  // Meta
  currentStep: number;
  completedSteps: number[];
  isComplete: boolean;
}

export const initialOnboardingData: OnboardingData = {
  primaryGoal: null,
  biologicalProfile: {
    gender: null,
    age: null,
    heightFeet: null,
    heightInches: null,
    heightCm: null,
    useMetric: false,
    weightLbs: null,
    weightKg: null,
  },
  activityLevel: null,
  dietaryRestrictions: [],
  otherRestrictions: '',
  currentStep: 1,
  completedSteps: [],
  isComplete: false,
};
