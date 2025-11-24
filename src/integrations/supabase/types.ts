export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      annual_plans: {
        Row: {
          athlete_id: string
          competition_date: string
          created_at: string
          id: string
          notes: string | null
          percentages: Json
          plan_name: string
          planned_loads: Json | null
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          athlete_id: string
          competition_date: string
          created_at?: string
          id?: string
          notes?: string | null
          percentages?: Json
          plan_name: string
          planned_loads?: Json | null
          start_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          athlete_id?: string
          competition_date?: string
          created_at?: string
          id?: string
          notes?: string | null
          percentages?: Json
          plan_name?: string
          planned_loads?: Json | null
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      athlete_goals: {
        Row: {
          athlete_id: string
          baseline_value: number | null
          created_at: string
          current_value: number | null
          goal_name: string
          goal_type: string
          id: string
          notes: string | null
          status: string | null
          target_date: string | null
          target_unit: string | null
          target_value: number | null
          updated_at: string
        }
        Insert: {
          athlete_id: string
          baseline_value?: number | null
          created_at?: string
          current_value?: number | null
          goal_name: string
          goal_type: string
          id?: string
          notes?: string | null
          status?: string | null
          target_date?: string | null
          target_unit?: string | null
          target_value?: number | null
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          baseline_value?: number | null
          created_at?: string
          current_value?: number | null
          goal_name?: string
          goal_type?: string
          id?: string
          notes?: string | null
          status?: string | null
          target_date?: string | null
          target_unit?: string | null
          target_value?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      physical_tests: {
        Row: {
          athlete_id: string
          category: string
          created_at: string
          id: string
          notes: string | null
          test_date: string
          test_name: string
          unit: string
          value: number
        }
        Insert: {
          athlete_id: string
          category: string
          created_at?: string
          id?: string
          notes?: string | null
          test_date: string
          test_name: string
          unit: string
          value: number
        }
        Update: {
          athlete_id?: string
          category?: string
          created_at?: string
          id?: string
          notes?: string | null
          test_date?: string
          test_name?: string
          unit?: string
          value?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          athlete_name: string
          avatar_url: string | null
          baseline_rhr: number | null
          baseline_vj: number | null
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          age?: number | null
          athlete_name: string
          avatar_url?: string | null
          baseline_rhr?: number | null
          baseline_vj?: number | null
          created_at?: string
          id: string
          updated_at?: string
        }
        Update: {
          age?: number | null
          athlete_name?: string
          avatar_url?: string | null
          baseline_rhr?: number | null
          baseline_vj?: number | null
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      readiness_logs: {
        Row: {
          athlete_id: string
          created_at: string
          date: string
          id: string
          notes: string | null
          readiness_score: number
          readiness_zone: string
          rhr: number
          rhr_score: number
          vj: number
          vj_score: number
        }
        Insert: {
          athlete_id: string
          created_at?: string
          date: string
          id?: string
          notes?: string | null
          readiness_score: number
          readiness_zone: string
          rhr: number
          rhr_score: number
          vj: number
          vj_score: number
        }
        Update: {
          athlete_id?: string
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          readiness_score?: number
          readiness_zone?: string
          rhr?: number
          rhr_score?: number
          vj?: number
          vj_score?: number
        }
        Relationships: []
      }
      training_sessions: {
        Row: {
          athlete_name: string
          created_at: string
          date: string
          duration_minutes: number | null
          id: string
          load_auto: number | null
          load_final: number | null
          load_manual: number | null
          notes: string | null
          rpe: number | null
          session_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          athlete_name: string
          created_at?: string
          date: string
          duration_minutes?: number | null
          id?: string
          load_auto?: number | null
          load_final?: number | null
          load_manual?: number | null
          notes?: string | null
          rpe?: number | null
          session_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          athlete_name?: string
          created_at?: string
          date?: string
          duration_minutes?: number | null
          id?: string
          load_auto?: number | null
          load_final?: number | null
          load_manual?: number | null
          notes?: string | null
          rpe?: number | null
          session_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      training_templates: {
        Row: {
          created_at: string
          duration_minutes: number
          id: string
          notes: string | null
          rpe: number
          session_name: string | null
          template_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_minutes: number
          id?: string
          notes?: string | null
          rpe: number
          session_name?: string | null
          template_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          rpe?: number
          session_name?: string | null
          template_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "coach" | "athlete"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["coach", "athlete"],
    },
  },
} as const
