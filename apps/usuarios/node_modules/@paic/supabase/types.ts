// @paic/supabase/types - Tipos de base de datos generados desde schema.sql
// Regenerar con: npx supabase gen types typescript --project-id <ref> > types.ts

export interface Json {
  [key: string]: any;
}

export interface Database {
  public: {
    Tables: {
      conjuntos: {
        Row: {
          id: string;
          name: string;
          nit: string | null;
          address: string | null;
          admin_name: string | null;
          admin_email: string | null;
          admin_phone: string | null;
          subscription_plan: string;
          plan_price: number | null;
          registration_date: string | null;
        };
        Insert: {
          id: string;
          name: string;
          nit?: string | null;
          address?: string | null;
          admin_name?: string | null;
          admin_email?: string | null;
          admin_phone?: string | null;
          subscription_plan?: string;
          plan_price?: number | null;
          registration_date?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          nit?: string | null;
          address?: string | null;
          admin_name?: string | null;
          admin_email?: string | null;
          admin_phone?: string | null;
          subscription_plan?: string;
          plan_price?: number | null;
          registration_date?: string | null;
        };
      };
      user_profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          avatar_url: string | null;
          role: 'trial' | 'subscriber' | 'internal' | 'admin';
          trial_expires_at: string | null;
          conjunto_id: string | null;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: 'trial' | 'subscriber' | 'internal' | 'admin';
          trial_expires_at?: string | null;
          conjunto_id?: string | null;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: 'trial' | 'subscriber' | 'internal' | 'admin';
          trial_expires_at?: string | null;
          conjunto_id?: string | null;
        };
      };
      residents: {
        Row: {
          apartment: string;
          name: string;
          email: string | null;
          phone: string | null;
          conjunto_id: string;
        };
        Insert: {
          apartment: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          conjunto_id: string;
        };
        Update: {
          apartment?: string;
          name?: string;
          email?: string | null;
          phone?: string | null;
          conjunto_id?: string;
        };
      };
      account_status: {
        Row: {
          apartment: string;
          last_payment_date: string | null;
          admin_fee_value: number;
          pending_installments: number;
          other_charges: number;
          outstanding_balance: number;
          conjunto_id: string;
        };
        Insert: {
          apartment: string;
          last_payment_date?: string | null;
          admin_fee_value?: number;
          pending_installments?: number;
          other_charges?: number;
          outstanding_balance?: number;
          conjunto_id: string;
        };
        Update: {
          apartment?: string;
          last_payment_date?: string | null;
          admin_fee_value?: number;
          pending_installments?: number;
          other_charges?: number;
          outstanding_balance?: number;
          conjunto_id?: string;
        };
      };
      providers: {
        Row: {
          id: number;
          company: string;
          specialty: string | null;
          email: string | null;
          phone: string | null;
          conjunto_id: string;
        };
        Insert: {
          company: string;
          specialty?: string | null;
          email?: string | null;
          phone?: string | null;
          conjunto_id: string;
        };
        Update: {
          id?: number;
          company?: string;
          specialty?: string | null;
          email?: string | null;
          phone?: string | null;
          conjunto_id?: string;
        };
      };
      internal_staff: {
        Row: {
          name: string;
          position: string | null;
          email: string | null;
          phone: string | null;
          conjunto_id: string;
        };
        Insert: {
          name: string;
          position?: string | null;
          email?: string | null;
          phone?: string | null;
          conjunto_id: string;
        };
        Update: {
          name?: string;
          position?: string | null;
          email?: string | null;
          phone?: string | null;
          conjunto_id?: string;
        };
      };
      users: {
        Row: {
          id: number;
          name: string;
          email: string;
          phone_number: string | null;
          role: string;
          password: string | null;
          conjunto_id: string;
        };
        Insert: {
          name: string;
          email: string;
          phone_number?: string | null;
          role: string;
          password?: string | null;
          conjunto_id: string;
        };
        Update: {
          id?: number;
          name?: string;
          email?: string;
          phone_number?: string | null;
          role?: string;
          password?: string | null;
          conjunto_id?: string;
        };
      };
      user_roles: {
        Row: {
          id: string;
          name: string;
          permissions: string[] | null;
          conjunto_id: string;
        };
        Insert: {
          id?: string;
          name: string;
          permissions?: string[] | null;
          conjunto_id: string;
        };
        Update: {
          id?: string;
          name?: string;
          permissions?: string[] | null;
          conjunto_id?: string;
        };
      };
      common_areas: {
        Row: {
          id: string;
          name: string;
          color: Json | null;
          conjunto_id: string;
        };
        Insert: {
          id?: string;
          name: string;
          color?: Json | null;
          conjunto_id: string;
        };
        Update: {
          id?: string;
          name?: string;
          color?: Json | null;
          conjunto_id?: string;
        };
      };
      bookings: {
        Row: {
          id: number;
          day: number;
          time: string;
          event: string;
          user: string;
          conjunto_id: string;
        };
        Insert: {
          id?: number;
          day: number;
          time: string;
          event: string;
          user: string;
          conjunto_id: string;
        };
        Update: {
          id?: number;
          day?: number;
          time?: string;
          event?: string;
          user?: string;
          conjunto_id?: string;
        };
      };
      reservations: {
        Row: {
          id: number;
          conjunto_id: string;
          apartment: string;
          resident_name: string;
          common_area_id: string;
          date: string;
          start_time: string;
          end_time: string;
          email: string | null;
          phone: string | null;
          created_at: string;
        };
        Insert: {
          conjunto_id: string;
          apartment: string;
          resident_name: string;
          common_area_id: string;
          date: string;
          start_time: string;
          end_time: string;
          email?: string | null;
          phone?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          conjunto_id?: string;
          apartment?: string;
          resident_name?: string;
          common_area_id?: string;
          date?: string;
          start_time?: string;
          end_time?: string;
          email?: string | null;
          phone?: string | null;
          created_at?: string;
        };
      };
      due_dates: {
        Row: {
          id: number;
          item: string;
          category: string;
          due_date: string;
          status: string;
          conjunto_id: string;
        };
        Insert: {
          item: string;
          category: string;
          due_date: string;
          status: string;
          conjunto_id: string;
        };
        Update: {
          id?: number;
          item?: string;
          category?: string;
          due_date?: string;
          status?: string;
          conjunto_id?: string;
        };
      };
      tasks: {
        Row: {
          id: number;
          text: string;
          due_date: string | null;
          completed: boolean;
          conjunto_id: string;
        };
        Insert: {
          text: string;
          due_date?: string | null;
          completed?: boolean;
          conjunto_id: string;
        };
        Update: {
          id?: number;
          text?: string;
          due_date?: string | null;
          completed?: boolean;
          conjunto_id?: string;
        };
      };
      expenses: {
        Row: {
          id: number;
          description: string;
          amount: number;
          category: string;
          date: string;
          provider_id: number | null;
          conjunto_id: string;
        };
        Insert: {
          description: string;
          amount: number;
          category: string;
          date: string;
          provider_id?: number | null;
          conjunto_id: string;
        };
        Update: {
          id?: number;
          description?: string;
          amount?: number;
          category?: string;
          date?: string;
          provider_id?: number | null;
          conjunto_id?: string;
        };
      };
      incomes: {
        Row: {
          id: number;
          description: string;
          amount: number;
          category: string;
          date: string;
          conjunto_id: string;
        };
        Insert: {
          description: string;
          amount: number;
          category: string;
          date: string;
          conjunto_id: string;
        };
        Update: {
          id?: number;
          description?: string;
          amount?: number;
          category?: string;
          date?: string;
          conjunto_id?: string;
        };
      };
      access_points: {
        Row: {
          id: number;
          name: string;
          conjunto_id: string;
        };
        Insert: {
          id?: number;
          name: string;
          conjunto_id: string;
        };
        Update: {
          id?: number;
          name?: string;
          conjunto_id?: string;
        };
      };
      visitor_logs: {
        Row: {
          id: number;
          apartment: string;
          visitor_name: string;
          date: string;
          status: string;
          entry_time: string | null;
          exit_time: string | null;
          access_point_id: number | null;
          conjunto_id: string;
        };
        Insert: {
          apartment: string;
          visitor_name: string;
          date: string;
          status: string;
          entry_time?: string | null;
          exit_time?: string | null;
          access_point_id?: number | null;
          conjunto_id: string;
        };
        Update: {
          id?: number;
          apartment?: string;
          visitor_name?: string;
          date?: string;
          status?: string;
          entry_time?: string | null;
          exit_time?: string | null;
          access_point_id?: number | null;
          conjunto_id?: string;
        };
      };
      package_logs: {
        Row: {
          id: number;
          apartment: string;
          courier: string;
          tracking_number: string | null;
          received_date: string;
          status: string;
          conjunto_id: string;
        };
        Insert: {
          apartment: string;
          courier: string;
          tracking_number?: string | null;
          received_date?: string;
          status: string;
          conjunto_id: string;
        };
        Update: {
          id?: number;
          apartment?: string;
          courier?: string;
          tracking_number?: string | null;
          received_date?: string;
          status?: string;
          conjunto_id?: string;
        };
      };
      chatbot_interactions: {
        Row: {
          id: number;
          created_at: string;
          conjunto_id: string;
        };
        Insert: {
          id?: number;
          created_at?: string;
          conjunto_id: string;
        };
        Update: {
          id?: number;
          created_at?: string;
          conjunto_id?: string;
        };
      };
      chat_messages: {
        Row: {
          id: number;
          user_id: string;
          conjunto_id: string;
          role: 'user' | 'model';
          content: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          conjunto_id: string;
          role: 'user' | 'model';
          content: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          conjunto_id?: string;
          role?: 'user' | 'model';
          content?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_my_conjunto_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      handle_new_user: {
        Args: Record<PropertyKey, never>;
        Returns: unknown;
      };
      update_user_password: {
        Args: { new_password: string; user_id: number };
        Returns: void;
      };
    };
    Enums: {
      user_role: 'trial' | 'subscriber' | 'internal' | 'admin';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}