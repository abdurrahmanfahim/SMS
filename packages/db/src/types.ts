export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      academic_years: {
        Row: {
          calendar: string;
          created_at: string;
          created_by: string | null;
          ends_on: string;
          id: string;
          institution_id: string;
          is_current: boolean;
          name_bn: string | null;
          name_en: string | null;
          starts_on: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          calendar?: string;
          created_at?: string;
          created_by?: string | null;
          ends_on: string;
          id?: string;
          institution_id: string;
          is_current?: boolean;
          name_bn?: string | null;
          name_en?: string | null;
          starts_on: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          calendar?: string;
          created_at?: string;
          created_by?: string | null;
          ends_on?: string;
          id?: string;
          institution_id?: string;
          is_current?: boolean;
          name_bn?: string | null;
          name_en?: string | null;
          starts_on?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "academic_years_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_log: {
        Row: {
          action: string;
          actor_profile_id: string | null;
          actor_role: string;
          after: Json | null;
          before: Json | null;
          created_at: string;
          entity_id: string | null;
          entity_type: string;
          id: number;
          institution_id: string | null;
          meta: Json;
        };
        Insert: {
          action: string;
          actor_profile_id?: string | null;
          actor_role: string;
          after?: Json | null;
          before?: Json | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type: string;
          id?: never;
          institution_id?: string | null;
          meta?: Json;
        };
        Update: {
          action?: string;
          actor_profile_id?: string | null;
          actor_role?: string;
          after?: Json | null;
          before?: Json | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string;
          id?: never;
          institution_id?: string | null;
          meta?: Json;
        };
        Relationships: [];
      };
      class_levels: {
        Row: {
          category: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          institution_id: string;
          name_bn: string | null;
          name_en: string | null;
          sort_order: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          category?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          institution_id: string;
          name_bn?: string | null;
          name_en?: string | null;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          category?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          institution_id?: string;
          name_bn?: string | null;
          name_en?: string | null;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "class_levels_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
        ];
      };
      class_subjects: {
        Row: {
          academic_year_id: string;
          class_level_id: string;
          created_at: string;
          created_by: string | null;
          id: string;
          institution_id: string;
          is_optional: boolean;
          sort_order: number;
          subject_id: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          academic_year_id: string;
          class_level_id: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          institution_id: string;
          is_optional?: boolean;
          sort_order?: number;
          subject_id: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          academic_year_id?: string;
          class_level_id?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          institution_id?: string;
          is_optional?: boolean;
          sort_order?: number;
          subject_id?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "class_subjects_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "class_subjects_level_fk";
            columns: ["institution_id", "class_level_id"];
            isOneToOne: false;
            referencedRelation: "class_levels";
            referencedColumns: ["institution_id", "id"];
          },
          {
            foreignKeyName: "class_subjects_subject_fk";
            columns: ["institution_id", "subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["institution_id", "id"];
          },
          {
            foreignKeyName: "class_subjects_year_fk";
            columns: ["institution_id", "academic_year_id"];
            isOneToOne: false;
            referencedRelation: "academic_years";
            referencedColumns: ["institution_id", "id"];
          },
        ];
      };
      institution_settings: {
        Row: {
          academic_year_style: string;
          attendance_edit_window_days: number;
          created_at: string;
          created_by: string | null;
          default_grade_scheme_id: string | null;
          institution_id: string;
          letterhead: Json;
          updated_at: string;
          updated_by: string | null;
          use_bangla_digits: boolean;
          weekly_holidays: number[];
        };
        Insert: {
          academic_year_style?: string;
          attendance_edit_window_days?: number;
          created_at?: string;
          created_by?: string | null;
          default_grade_scheme_id?: string | null;
          institution_id: string;
          letterhead?: Json;
          updated_at?: string;
          updated_by?: string | null;
          use_bangla_digits?: boolean;
          weekly_holidays?: number[];
        };
        Update: {
          academic_year_style?: string;
          attendance_edit_window_days?: number;
          created_at?: string;
          created_by?: string | null;
          default_grade_scheme_id?: string | null;
          institution_id?: string;
          letterhead?: Json;
          updated_at?: string;
          updated_by?: string | null;
          use_bangla_digits?: boolean;
          weekly_holidays?: number[];
        };
        Relationships: [
          {
            foreignKeyName: "institution_settings_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: true;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
        ];
      };
      institutions: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          name_bn: string | null;
          name_en: string | null;
          slug: string;
          status: string;
          type: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name_bn?: string | null;
          name_en?: string | null;
          slug: string;
          status?: string;
          type?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name_bn?: string | null;
          name_en?: string | null;
          slug?: string;
          status?: string;
          type?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      memberships: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          institution_id: string;
          invited_by: string | null;
          profile_id: string;
          role: string;
          status: string;
          updated_at: string;
          updated_by: string | null;
          username: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          institution_id: string;
          invited_by?: string | null;
          profile_id: string;
          role: string;
          status?: string;
          updated_at?: string;
          updated_by?: string | null;
          username?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          institution_id?: string;
          invited_by?: string | null;
          profile_id?: string;
          role?: string;
          status?: string;
          updated_at?: string;
          updated_by?: string | null;
          username?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "memberships_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "memberships_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "memberships_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      platform_admins: {
        Row: {
          created_at: string;
          created_by: string | null;
          profile_id: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          profile_id: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          profile_id?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "platform_admins_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          created_by: string | null;
          full_name: string;
          id: string;
          locale: string;
          must_change_password: boolean;
          phone_e164: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          full_name: string;
          id: string;
          locale?: string;
          must_change_password?: boolean;
          phone_e164?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          full_name?: string;
          id?: string;
          locale?: string;
          must_change_password?: boolean;
          phone_e164?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      sections: {
        Row: {
          academic_year_id: string;
          capacity: number | null;
          class_level_id: string;
          class_teacher_membership_id: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          institution_id: string;
          name: string;
          shift: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          academic_year_id: string;
          capacity?: number | null;
          class_level_id: string;
          class_teacher_membership_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          institution_id: string;
          name: string;
          shift?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          academic_year_id?: string;
          capacity?: number | null;
          class_level_id?: string;
          class_teacher_membership_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          institution_id?: string;
          name?: string;
          shift?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "sections_class_teacher_fk";
            columns: ["institution_id", "class_teacher_membership_id"];
            isOneToOne: false;
            referencedRelation: "memberships";
            referencedColumns: ["institution_id", "id"];
          },
          {
            foreignKeyName: "sections_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sections_level_fk";
            columns: ["institution_id", "class_level_id"];
            isOneToOne: false;
            referencedRelation: "class_levels";
            referencedColumns: ["institution_id", "id"];
          },
          {
            foreignKeyName: "sections_year_fk";
            columns: ["institution_id", "academic_year_id"];
            isOneToOne: false;
            referencedRelation: "academic_years";
            referencedColumns: ["institution_id", "id"];
          },
        ];
      };
      subjects: {
        Row: {
          code: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          institution_id: string;
          name_bn: string | null;
          name_en: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          code?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          institution_id: string;
          name_bn?: string | null;
          name_en?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          code?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          institution_id?: string;
          name_bn?: string | null;
          name_en?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "subjects_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
        ];
      };
      teacher_assignments: {
        Row: {
          academic_year_id: string;
          created_at: string;
          created_by: string | null;
          id: string;
          institution_id: string;
          membership_id: string;
          role: string;
          section_id: string;
          subject_id: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          academic_year_id: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          institution_id: string;
          membership_id: string;
          role: string;
          section_id: string;
          subject_id?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          academic_year_id?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          institution_id?: string;
          membership_id?: string;
          role?: string;
          section_id?: string;
          subject_id?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "teacher_assignments_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "teacher_assignments_membership_fk";
            columns: ["institution_id", "membership_id"];
            isOneToOne: false;
            referencedRelation: "memberships";
            referencedColumns: ["institution_id", "id"];
          },
          {
            foreignKeyName: "teacher_assignments_section_fk";
            columns: ["institution_id", "academic_year_id", "section_id"];
            isOneToOne: false;
            referencedRelation: "sections";
            referencedColumns: ["institution_id", "academic_year_id", "id"];
          },
          {
            foreignKeyName: "teacher_assignments_subject_fk";
            columns: ["institution_id", "subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["institution_id", "id"];
          },
          {
            foreignKeyName: "teacher_assignments_year_fk";
            columns: ["institution_id", "academic_year_id"];
            isOneToOne: false;
            referencedRelation: "academic_years";
            referencedColumns: ["institution_id", "id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      set_current_academic_year: {
        Args: { p_year_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
