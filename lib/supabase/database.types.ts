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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_personalizations: {
        Row: {
          created_at: string
          id: number
          path_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          path_id?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: never
          path_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_personalizations_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          answers: Json
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          answers: Json
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          areas: string[]
          chapters: string[]
          created_at: string
          difficulty: Database["public"]["Enums"]["course_difficulty"]
          hours: number
          id: number
          image_url: string | null
          in_construction: boolean
          instructor: string | null
          is_active: boolean
          is_free: boolean
          is_new: boolean
          is_pro: boolean
          lessons: number
          outcome: string
          outcomes: string[]
          prerequisites: string[]
          price: number | null
          related: string[]
          slug: string
          summary: string | null
          title: string
          topics: string[]
          url: string
        }
        Insert: {
          areas?: string[]
          chapters?: string[]
          created_at?: string
          difficulty: Database["public"]["Enums"]["course_difficulty"]
          hours: number
          id?: never
          image_url?: string | null
          in_construction?: boolean
          instructor?: string | null
          is_active?: boolean
          is_free?: boolean
          is_new?: boolean
          is_pro?: boolean
          lessons: number
          outcome: string
          outcomes?: string[]
          prerequisites?: string[]
          price?: number | null
          related?: string[]
          slug: string
          summary?: string | null
          title: string
          topics?: string[]
          url: string
        }
        Update: {
          areas?: string[]
          chapters?: string[]
          created_at?: string
          difficulty?: Database["public"]["Enums"]["course_difficulty"]
          hours?: number
          id?: never
          image_url?: string | null
          in_construction?: boolean
          instructor?: string | null
          is_active?: boolean
          is_free?: boolean
          is_new?: boolean
          is_pro?: boolean
          lessons?: number
          outcome?: string
          outcomes?: string[]
          prerequisites?: string[]
          price?: number | null
          related?: string[]
          slug?: string
          summary?: string | null
          title?: string
          topics?: string[]
          url?: string
        }
        Relationships: []
      }
      learning_paths: {
        Row: {
          ai_adjustments: Json | null
          ai_summary: string | null
          ai_title: string | null
          assessment_id: string | null
          budget_hours: number | null
          copied_from_path_id: string | null
          created_at: string
          goal: string
          id: string
          is_public: boolean
          personalized_at: string | null
          share_slug: string
          summary: string | null
          title: string
          user_id: string
        }
        Insert: {
          ai_adjustments?: Json | null
          ai_summary?: string | null
          ai_title?: string | null
          assessment_id?: string | null
          budget_hours?: number | null
          copied_from_path_id?: string | null
          created_at?: string
          goal: string
          id?: string
          is_public?: boolean
          personalized_at?: string | null
          share_slug?: string
          summary?: string | null
          title: string
          user_id: string
        }
        Update: {
          ai_adjustments?: Json | null
          ai_summary?: string | null
          ai_title?: string | null
          assessment_id?: string | null
          budget_hours?: number | null
          copied_from_path_id?: string | null
          created_at?: string
          goal?: string
          id?: string
          is_public?: boolean
          personalized_at?: string | null
          share_slug?: string
          summary?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_paths_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_paths_copied_from_path_id_fkey"
            columns: ["copied_from_path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      path_steps: {
        Row: {
          ai_reason: string | null
          completed_at: string | null
          course_id: number
          created_at: string
          depends_on: string[]
          discard_reason: string | null
          id: string
          origin: string
          path_id: string
          position: number
          reason: string
          source_program_id: number | null
          stage: number
          status: Database["public"]["Enums"]["path_step_status"]
        }
        Insert: {
          ai_reason?: string | null
          completed_at?: string | null
          course_id: number
          created_at?: string
          depends_on?: string[]
          discard_reason?: string | null
          id?: string
          origin: string
          path_id: string
          position: number
          reason: string
          source_program_id?: number | null
          stage: number
          status?: Database["public"]["Enums"]["path_step_status"]
        }
        Update: {
          ai_reason?: string | null
          completed_at?: string | null
          course_id?: number
          created_at?: string
          depends_on?: string[]
          discard_reason?: string | null
          id?: string
          origin?: string
          path_id?: string
          position?: number
          reason?: string
          source_program_id?: number | null
          stage?: number
          status?: Database["public"]["Enums"]["path_step_status"]
        }
        Relationships: [
          {
            foreignKeyName: "path_steps_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "path_steps_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "path_steps_source_program_id_fkey"
            columns: ["source_program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          timezone: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          timezone?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          timezone?: string
          username?: string | null
        }
        Relationships: []
      }
      program_courses: {
        Row: {
          course_id: number
          id: number
          level: Database["public"]["Enums"]["program_course_level"]
          note: string | null
          position: number
          program_id: number
          stage: number
        }
        Insert: {
          course_id: number
          id?: never
          level: Database["public"]["Enums"]["program_course_level"]
          note?: string | null
          position: number
          program_id: number
          stage: number
        }
        Update: {
          course_id?: number
          id?: never
          level?: Database["public"]["Enums"]["program_course_level"]
          note?: string | null
          position?: number
          program_id?: number
          stage?: number
        }
        Relationships: [
          {
            foreignKeyName: "program_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_courses_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          created_at: string
          id: number
          name: string
          position: number
          slug: string
          source_slug: string
        }
        Insert: {
          created_at?: string
          id?: never
          name: string
          position: number
          slug: string
          source_slug: string
        }
        Update: {
          created_at?: string
          id?: never
          name?: string
          position?: number
          slug?: string
          source_slug?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          activity_date: string
          answers: Json
          correct_count: number
          id: string
          idempotency_key: string
          pass_percentage: number
          passed: boolean
          path_id: string
          path_step_id: string
          quiz_id: string
          score_percentage: number
          started_at: string
          submitted_at: string
          timezone: string
          user_id: string
        }
        Insert: {
          activity_date: string
          answers: Json
          correct_count: number
          id?: string
          idempotency_key: string
          pass_percentage: number
          passed: boolean
          path_id: string
          path_step_id: string
          quiz_id: string
          score_percentage: number
          started_at?: string
          submitted_at?: string
          timezone: string
          user_id: string
        }
        Update: {
          activity_date?: string
          answers?: Json
          correct_count?: number
          id?: string
          idempotency_key?: string
          pass_percentage?: number
          passed?: boolean
          path_id?: string
          path_step_id?: string
          quiz_id?: string
          score_percentage?: number
          started_at?: string
          submitted_at?: string
          timezone?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_path_step_id_fkey"
            columns: ["path_step_id"]
            isOneToOne: false
            referencedRelation: "path_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          course_id: number
          created_at: string
          id: string
          is_active: boolean
          pass_percentage: number
          questions: Json
          updated_at: string
        }
        Insert: {
          course_id: number
          created_at?: string
          id?: string
          is_active?: boolean
          pass_percentage?: number
          questions: Json
          updated_at?: string
        }
        Update: {
          course_id?: number
          created_at?: string
          id?: string
          is_active?: boolean
          pass_percentage?: number
          questions?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: true
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      streak_activities: {
        Row: {
          activity_date: string
          created_at: string
          id: number
          source_attempt_id: string | null
          timezone: string
          user_id: string
        }
        Insert: {
          activity_date: string
          created_at?: string
          id?: never
          source_attempt_id?: string | null
          timezone: string
          user_id: string
        }
        Update: {
          activity_date?: string
          created_at?: string
          id?: never
          source_attempt_id?: string | null
          timezone?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "streak_activities_source_attempt_id_fkey"
            columns: ["source_attempt_id"]
            isOneToOne: true
            referencedRelation: "quiz_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_ai_personalization: {
        Args: {
          p_path_id: string
          p_reasons: Json
          p_summary: string
          p_title: string
        }
        Returns: undefined
      }
      copy_shared_path: {
        Args: {
          p_slug: string
        }
        Returns: string
      }
      get_path_origin: {
        Args: {
          p_path_id: string
        }
        Returns: string
      }
      get_shared_path: {
        Args: {
          p_slug: string
        }
        Returns: Json
      }
      record_step_activity: {
        Args: {
          p_step_id: string
          p_time_zone: string
        }
        Returns: undefined
      }
      submit_quiz_attempt: {
        Args: {
          p_answers: Json
          p_idempotency_key: string
          p_path_id: string
          p_path_step_id: string
          p_quiz_id: string
          p_timezone: string
        }
        Returns: Json
      }
    }
    Enums: {
      course_difficulty: "principiante" | "intermedio" | "avanzado"
      path_step_status: "pending" | "in_progress" | "done" | "discarded"
      program_course_level: "requerido" | "recomendado" | "opcional"
      user_role: "user" | "admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      course_difficulty: ["principiante", "intermedio", "avanzado"],
      path_step_status: ["pending", "in_progress", "done", "discarded"],
      program_course_level: ["requerido", "recomendado", "opcional"],
      user_role: ["user", "admin"],
    },
  },
} as const
