import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string | null;
          role: 'member' | 'super_admin' | 'slot_manager' | 'finance_manager';
          is_long_term_player: boolean;
          balance: number;
          badminton_elo: number;
          badminton_grade: 'A' | 'B' | 'C' | 'D';
          badminton_games_played: number;
          badminton_wins: number;
          badminton_losses: number;
          cricket_elo: number;
          cricket_grade: 'A' | 'B' | 'C' | 'D';
          cricket_games_played: number;
          cricket_wins: number;
          cricket_losses: number;
          current_win_streak: number;
          longest_win_streak: number;
          achievements: string[];
          created_at: string;
          updated_at: string;
        };
      };
      slots: {
        Row: {
          id: string;
          date: string;
          time: string;
          location: string;
          sport: 'badminton' | 'cricket';
          total_spots: number;
          booked_user_ids: string[];
          waitlist: Array<{ user_id: string; added_at: string }>;
          status: 'open' | 'full' | 'cancelled';
          created_by: string | null;
          created_at: string;
        };
      };
      bookings: {
        Row: {
          id: string;
          user_id: string;
          slot_id: string;
          status: 'confirmed' | 'waitlist' | 'cancelled';
          amount_paid: number;
          refunded: boolean;
          booked_at: string;
          cancelled_at: string | null;
        };
      };
      matches: {
        Row: {
          id: string;
          slot_id: string | null;
          date: string;
          time: string;
          sport: 'badminton' | 'cricket';
          match_type: 'singles' | 'doubles';
          team1_user_ids: string[];
          team2_user_ids: string[];
          team1_score: number;
          team2_score: number;
          status: 'pending_confirmation' | 'confirmed' | 'rejected' | 'disputed';
          confirmed_by: string[];
          pending_confirmation: string[];
          elo_updated: boolean;
          created_by: string;
          created_at: string;
        };
      };
    };
  };
};
