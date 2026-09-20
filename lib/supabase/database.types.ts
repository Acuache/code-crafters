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
          assessment_id: string | null
          budget_hours: number | null
          created_at: string
          goal: string
          id: string
          summary: string | null
          title: string
          user_id: string
        }
        Insert: {
          assessment_id?: string | null
          budget_hours?: number | null
          created_at?: string
          goal: string
          id?: string
          summary?: string | null
          title: string
          user_id: string
        }
        Update: {
          assessment_id?: string | null
          budget_hours?: number | null
          created_at?: string
          goal?: string
          id?: string
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
        ]
      }
      path_steps: {
        Row: {
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
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
