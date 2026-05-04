/**
 * 🧩 UI Types - فور سيما
 * UI Component Types
 */

import type { ReactNode } from 'react';
import type { HTMLMotionProps } from 'framer-motion';

// Icon types
export interface IconProps {
  size?: number | string;
  color?: string;
  className?: string;
}

// Common icon names used throughout the app
export type ActivityIcon = React.ComponentType<IconProps>;
export type ImageIcon = React.ComponentType<IconProps>;
export type LinkIcon = React.ComponentType<IconProps>;
export type UserIcon = React.ComponentType<IconProps>;

// UI Component Props
export interface ButtonProps {
  children: ReactNode;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  asChild?: boolean;
  className?: string;
  disabled?: boolean;
}

export interface CardProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  className?: string;
}

export interface InputProps {
  children: ReactNode;
  className?: string;
  // Add other input props as needed
}

export interface ModalProps {
  children: ReactNode;
  className?: string;
  // Add other modal props as needed
}

// Profile Types
export interface ProfileType {
  id: string;
  username: string;
  avatar_url?: string | null;
  banner_url?: string | null;
  role: 'user' | 'admin' | 'supervisor';
  bio?: string | null;
  website?: string | null;
  twitter?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  avatar_decoration?: string | null;
  is_public: boolean;
  total_xp?: number;
  movies_watched?: number;
  reviews_written?: number;
  created_at?: string;
}

// Social Types
export interface LeaderboardEntry {
  profile: ProfileType;
  score: number;
  rank: number;
  movies_watched?: number;
  reviews_written?: number;
}

export interface UserChallenge {
  id: string;
  user_id: string;
  challenge_id: string;
  progress: number;
  completed: boolean;
  completed_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  icon: string; // Could be icon name or component
  target: number;
  reward_xp: number;
  reward_type: 'badge' | 'currency' | 'premium_days';
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ActivityItem {
  id: string;
  user_id: string;
  type: string; // Could be more specific
  content_id?: string;
  content_type?: 'movie' | 'tv' | 'anime' | 'game' | 'software';
  description: string;
  metadata?: Record<string, any>;
  created_at?: string;
}

// Recommendation Types
export interface RecommendationItem {
  id: string;
  title: string;
  poster_path?: string | null;
  overview?: string | null;
  vote_average?: number | null;
  release_date?: string | null;
  content_type: 'movie' | 'tv' | 'anime' | 'game' | 'software';
  tmdb_id?: number;
}

// Quran Types
export interface QuranReciter {
  id: string;
  name: string;
  native_name?: string;
  country?: string;
  biography?: string;
  audio_url?: string;
  photo_url?: string;
}

// Software Types
export interface Software {
  id: string;
  name: string;
  description?: string;
  version?: string;
  category?: string;
  platform: 'pc' | 'android' | 'apple' | 'terminal' | 'other';
  download_url?: string;
  icon_url?: string;
  screenshots?: string[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// Achievement Types
export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  earned_at?: string;
  created_at?: string;
}

// Toast Types
export type ToastType = 'default' | 'success' | 'error' | 'warning' | 'info';
