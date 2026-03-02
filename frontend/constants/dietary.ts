import type { Allergy, Cuisine } from '@/api/types.gen';

export const ALL_ALLERGIES: Allergy[] = [
  'Dairy',
  'Egg',
  'Gluten',
  'Grain',
  'Peanut',
  'Seafood',
  'Sesame',
  'Shellfish',
  'Soy',
  'Sulfite',
  'Tree Nut',
  'Wheat',
];

export const ALL_CUISINES: Cuisine[] = [
  'African',
  'American',
  'Asian',
  'British',
  'Cajun',
  'Caribbean',
  'Chinese',
  'Eastern European',
  'European',
  'French',
  'German',
  'Greek',
  'Indian',
  'Irish',
  'Italian',
  'Japanese',
  'Jewish',
  'Korean',
  'Latin American',
  'Mediterranean',
  'Mexican',
  'Middle Eastern',
  'Nordic',
  'Southern',
  'Spanish',
  'Thai',
  'Vietnamese',
];

export const DIET_OPTIONS: { key: string; label: string }[] = [
  { key: 'is_gluten_free', label: 'Gluten-Free' },
  { key: 'is_ketogenic', label: 'Keto' },
  { key: 'is_vegetarian', label: 'Vegetarian' },
  { key: 'is_vegan', label: 'Vegan' },
  { key: 'is_pescatarian', label: 'Pescatarian' },
];
