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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      book_stories: {
        Row: {
          book_id: string
          pages: string[]
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          book_id: string
          pages?: string[]
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          book_id?: string
          pages?: string[]
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_stories_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: true
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          author: string
          cover_url: string | null
          created_at: string
          id: string
          level: number
          link_url: string | null
          reading_time: number
          status: Database["public"]["Enums"]["content_status"]
          summary: string
          tags: string[]
          title: string
        }
        Insert: {
          author?: string
          cover_url?: string | null
          created_at?: string
          id?: string
          level: number
          link_url?: string | null
          reading_time?: number
          status?: Database["public"]["Enums"]["content_status"]
          summary?: string
          tags?: string[]
          title: string
        }
        Update: {
          author?: string
          cover_url?: string | null
          created_at?: string
          id?: string
          level?: number
          link_url?: string | null
          reading_time?: number
          status?: Database["public"]["Enums"]["content_status"]
          summary?: string
          tags?: string[]
          title?: string
        }
        Relationships: []
      }
      child_assignments: {
        Row: {
          child_id: string
          volunteer_id: string
        }
        Insert: {
          child_id: string
          volunteer_id: string
        }
        Update: {
          child_id?: string
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "child_assignments_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_assignments_volunteer_id_fkey"
            columns: ["volunteer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      child_level_changes: {
        Row: {
          child_id: string
          created_at: string
          id: string
          new_level: number
          old_level: number
          reason: string
          volunteer_id: string
        }
        Insert: {
          child_id: string
          created_at?: string
          id?: string
          new_level: number
          old_level: number
          reason: string
          volunteer_id: string
        }
        Update: {
          child_id?: string
          created_at?: string
          id?: string
          new_level?: number
          old_level?: number
          reason?: string
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "child_level_changes_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_level_changes_volunteer_id_fkey"
            columns: ["volunteer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      children: {
        Row: {
          age_band: string
          archived: boolean
          communication_notes: string
          created_at: string
          current_level: number
          id: string
          nickname: string
        }
        Insert: {
          age_band: string
          archived?: boolean
          communication_notes?: string
          created_at?: string
          current_level?: number
          id?: string
          nickname: string
        }
        Update: {
          age_band?: string
          archived?: boolean
          communication_notes?: string
          created_at?: string
          current_level?: number
          id?: string
          nickname?: string
        }
        Relationships: []
      }
      discussion_prompts: {
        Row: {
          book_id: string
          crowd_type: string
          id: string
          prompt_text: string
          status: Database["public"]["Enums"]["content_status"]
          story_point: string
        }
        Insert: {
          book_id: string
          crowd_type: string
          id?: string
          prompt_text: string
          status?: Database["public"]["Enums"]["content_status"]
          story_point?: string
        }
        Update: {
          book_id?: string
          crowd_type?: string
          id?: string
          prompt_text?: string
          status?: Database["public"]["Enums"]["content_status"]
          story_point?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_prompts_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      guide_cards: {
        Row: {
          avoid_tip: string
          id: string
          sort_order: number
          steps: string[]
          title: string
        }
        Insert: {
          avoid_tip?: string
          id?: string
          sort_order?: number
          steps?: string[]
          title: string
        }
        Update: {
          avoid_tip?: string
          id?: string
          sort_order?: number
          steps?: string[]
          title?: string
        }
        Relationships: []
      }
      guide_quiz_questions: {
        Row: {
          correct_index: number
          guide_card_id: string | null
          id: string
          options: string[]
          question: string
          sort_order: number
        }
        Insert: {
          correct_index: number
          guide_card_id?: string | null
          id?: string
          options: string[]
          question: string
          sort_order?: number
        }
        Update: {
          correct_index?: number
          guide_card_id?: string | null
          id?: string
          options?: string[]
          question?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "guide_quiz_questions_guide_card_id_fkey"
            columns: ["guide_card_id"]
            isOneToOne: false
            referencedRelation: "guide_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      handover_feedback: {
        Row: {
          confidence: number
          created_at: string
          engagement: number
          finished_book: string
          id: string
          level_fit: string
          notes: string
          session_id: string
          try_next: string
          worked_well: string
        }
        Insert: {
          confidence: number
          created_at?: string
          engagement: number
          finished_book: string
          id?: string
          level_fit: string
          notes?: string
          session_id: string
          try_next?: string
          worked_well?: string
        }
        Update: {
          confidence?: number
          created_at?: string
          engagement?: number
          finished_book?: string
          id?: string
          level_fit?: string
          notes?: string
          session_id?: string
          try_next?: string
          worked_well?: string
        }
        Relationships: [
          {
            foreignKeyName: "handover_feedback_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          deactivated: boolean
          full_name: string
          guide_cards_read: string[]
          guide_progress: number
          id: string
          last_login_at: string | null
          qualified: boolean
          quiz_passed_at: string | null
          requested_role: string
          volunteer_code: string | null
        }
        Insert: {
          created_at?: string
          deactivated?: boolean
          full_name?: string
          guide_cards_read?: string[]
          guide_progress?: number
          id: string
          last_login_at?: string | null
          qualified?: boolean
          quiz_passed_at?: string | null
          requested_role?: string
          volunteer_code?: string | null
        }
        Update: {
          created_at?: string
          deactivated?: boolean
          full_name?: string
          guide_cards_read?: string[]
          guide_progress?: number
          id?: string
          last_login_at?: string | null
          qualified?: boolean
          quiz_passed_at?: string | null
          requested_role?: string
          volunteer_code?: string | null
        }
        Relationships: []
      }
      quiz_results: {
        Row: {
          child_answer: string
          correct_answer: string
          created_at: string
          id: string
          question: string
          session_id: string
          word: string | null
        }
        Insert: {
          child_answer: string
          correct_answer: string
          created_at?: string
          id?: string
          question: string
          session_id: string
          word?: string | null
        }
        Update: {
          child_answer?: string
          correct_answer?: string
          created_at?: string
          id?: string
          question?: string
          session_id?: string
          word?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_results_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      safeguarding_reports: {
        Row: {
          child_id: string | null
          created_at: string
          details: string
          id: string
          reporter_id: string
        }
        Insert: {
          child_id?: string | null
          created_at?: string
          details: string
          id?: string
          reporter_id?: string
        }
        Update: {
          child_id?: string | null
          created_at?: string
          details?: string
          id?: string
          reporter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "safeguarding_reports_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safeguarding_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      session_templates: {
        Row: {
          blocks: Json
          created_at: string
          id: string
          name: string
          owner_id: string | null
          total_minutes: number
        }
        Insert: {
          blocks?: Json
          created_at?: string
          id?: string
          name: string
          owner_id?: string | null
          total_minutes: number
        }
        Update: {
          blocks?: Json
          created_at?: string
          id?: string
          name?: string
          owner_id?: string | null
          total_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "session_templates_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          book_id: string | null
          child_id: string
          created_at: string
          id: string
          scheduled_at: string
          status: string
          template_id: string | null
          volunteer_id: string
        }
        Insert: {
          book_id?: string | null
          child_id: string
          created_at?: string
          id?: string
          scheduled_at?: string
          status?: string
          template_id?: string | null
          volunteer_id: string
        }
        Update: {
          book_id?: string | null
          child_id?: string
          created_at?: string
          id?: string
          scheduled_at?: string
          status?: string
          template_id?: string | null
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "session_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_volunteer_id_fkey"
            columns: ["volunteer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tricky_words: {
        Row: {
          child_id: string
          created_at: string
          id: string
          mastered: boolean
          session_id: string | null
          word: string
        }
        Insert: {
          child_id: string
          created_at?: string
          id?: string
          mastered?: boolean
          session_id?: string | null
          word: string
        }
        Update: {
          child_id?: string
          created_at?: string
          id?: string
          mastered?: boolean
          session_id?: string | null
          word?: string
        }
        Relationships: [
          {
            foreignKeyName: "tricky_words_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tricky_words_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
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
      volunteer_codes: {
        Row: {
          code: string
          created_at: string
          label: string
          reusable: boolean
          role: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          label?: string
          reusable?: boolean
          role?: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          label?: string
          reusable?: boolean
          role?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_codes_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      word_cards: {
        Row: {
          book_id: string
          definition: string
          example_sentence: string
          id: string
          image_url: string | null
          pronunciation: string
          sign_bank_url: string | null
          sort_order: number
          status: Database["public"]["Enums"]["content_status"]
          word: string
        }
        Insert: {
          book_id: string
          definition: string
          example_sentence?: string
          id?: string
          image_url?: string | null
          pronunciation?: string
          sign_bank_url?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          word: string
        }
        Update: {
          book_id?: string
          definition?: string
          example_sentence?: string
          id?: string
          image_url?: string | null
          pronunciation?: string
          sign_bank_url?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          word?: string
        }
        Relationships: [
          {
            foreignKeyName: "word_cards_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_book_story: { Args: { _book_id: string }; Returns: undefined }
      approve_staff: {
        Args: { _approve: boolean; _user_id: string }
        Returns: undefined
      }
      can_access_child: { Args: { _child_id: string }; Returns: boolean }
      can_read_content: { Args: never; Returns: boolean }
      change_child_level: {
        Args: { _child_id: string; _new_level: number; _reason: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_qualified: { Args: { _user_id: string }; Returns: boolean }
      mark_guide_card_read: { Args: { _card_id: string }; Returns: undefined }
      set_admin_role: {
        Args: { _is_admin: boolean; _user_id: string }
        Returns: undefined
      }
      set_volunteer_active: {
        Args: { _active: boolean; _user_id: string }
        Returns: undefined
      }
      set_volunteer_qualified: {
        Args: { _qualified: boolean; _user_id: string }
        Returns: undefined
      }
      submit_guide_quiz: { Args: { _answers: number[] }; Returns: boolean }
      submit_guide_quiz_feedback: {
        Args: { _answers: number[] }
        Returns: Json
      }
      touch_last_login: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "volunteer" | "viewer"
      content_status: "draft" | "approved"
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
      app_role: ["admin", "volunteer", "viewer"],
      content_status: ["draft", "approved"],
    },
  },
} as const
