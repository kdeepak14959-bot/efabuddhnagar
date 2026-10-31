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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      attendance_records: {
        Row: {
          attendance_date: string
          created_at: string
          id: string
          marked_by: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          attendance_date?: string
          created_at?: string
          id?: string
          marked_by?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          attendance_date?: string
          created_at?: string
          id?: string
          marked_by?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string
          grade: string
          id: string
          name: string
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          grade: string
          id?: string
          name: string
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          grade?: string
          id?: string
          name?: string
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_payments: {
        Row: {
          amount: number
          created_at: string
          fee_record_id: string
          id: string
          payment_date: string
          payment_method: string
          receipt_number: string
          recorded_by: string | null
          reference_number: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          fee_record_id: string
          id?: string
          payment_date?: string
          payment_method: string
          receipt_number: string
          recorded_by?: string | null
          reference_number?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          fee_record_id?: string
          id?: string
          payment_date?: string
          payment_method?: string
          receipt_number?: string
          recorded_by?: string | null
          reference_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_payments_fee_record_id_fkey"
            columns: ["fee_record_id"]
            isOneToOne: false
            referencedRelation: "student_fee_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_structures: {
        Row: {
          academic_session: string
          admission_fee: number
          class_id: string
          created_at: string
          due_day: number
          examination_fee: number
          id: string
          other_charges: number
          transport_fee_monthly: number
          tuition_fee_monthly: number
          updated_at: string
        }
        Insert: {
          academic_session: string
          admission_fee?: number
          class_id: string
          created_at?: string
          due_day?: number
          examination_fee?: number
          id?: string
          other_charges?: number
          transport_fee_monthly?: number
          tuition_fee_monthly?: number
          updated_at?: string
        }
        Update: {
          academic_session?: string
          admission_fee?: number
          class_id?: string
          created_at?: string
          due_day?: number
          examination_fee?: number
          id?: string
          other_charges?: number
          transport_fee_monthly?: number
          tuition_fee_monthly?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_structures_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      notices: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          id: string
          published_at: string
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          published_at?: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          published_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_students: {
        Row: {
          created_at: string
          parent_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          parent_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          parent_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_students_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      school_settings: {
        Row: {
          academic_session: string
          address: string
          affiliation_board: string
          closing_time: string
          email: string
          id: string
          logo_url: string | null
          opening_time: string
          phone: string
          principal_name: string
          school_name: string
          theme_color: string
          updated_at: string
          updated_by: string | null
          working_days: string[]
        }
        Insert: {
          academic_session?: string
          address?: string
          affiliation_board?: string
          closing_time?: string
          email?: string
          id?: string
          logo_url?: string | null
          opening_time?: string
          phone?: string
          principal_name?: string
          school_name?: string
          theme_color?: string
          updated_at?: string
          updated_by?: string | null
          working_days?: string[]
        }
        Update: {
          academic_session?: string
          address?: string
          affiliation_board?: string
          closing_time?: string
          email?: string
          id?: string
          logo_url?: string | null
          opening_time?: string
          phone?: string
          principal_name?: string
          school_name?: string
          theme_color?: string
          updated_at?: string
          updated_by?: string | null
          working_days?: string[]
        }
        Relationships: []
      }
      student_fee_records: {
        Row: {
          academic_session: string
          admission_fee: number
          created_at: string
          due_date: string
          examination_fee: number
          fee_structure_id: string | null
          id: string
          notes: string | null
          other_charges: number
          student_id: string
          transport_fee: number
          tuition_fee: number
          updated_at: string
        }
        Insert: {
          academic_session: string
          admission_fee?: number
          created_at?: string
          due_date: string
          examination_fee?: number
          fee_structure_id?: string | null
          id?: string
          notes?: string | null
          other_charges?: number
          student_id: string
          transport_fee?: number
          tuition_fee?: number
          updated_at?: string
        }
        Update: {
          academic_session?: string
          admission_fee?: number
          created_at?: string
          due_date?: string
          examination_fee?: number
          fee_structure_id?: string | null
          id?: string
          notes?: string | null
          other_charges?: number
          student_id?: string
          transport_fee?: number
          tuition_fee?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_fee_records_fee_structure_id_fkey"
            columns: ["fee_structure_id"]
            isOneToOne: false
            referencedRelation: "fee_structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_fee_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          address_district: string | null
          address_pin_code: string | null
          address_post_office: string | null
          address_state: string | null
          address_village: string | null
          admission_date: string | null
          admission_number: string
          alternate_mobile: string | null
          class_id: string | null
          created_at: string
          date_of_birth: string | null
          emergency_contact_number: string | null
          enrollment_status: string
          father_name: string | null
          full_name: string
          gender: string | null
          guardian_email: string | null
          guardian_name: string | null
          id: string
          mother_name: string | null
          photo_path: string | null
          previous_school_name: string | null
          primary_mobile: string | null
          roll_number: number | null
          updated_at: string
        }
        Insert: {
          address_district?: string | null
          address_pin_code?: string | null
          address_post_office?: string | null
          address_state?: string | null
          address_village?: string | null
          admission_date?: string | null
          admission_number: string
          alternate_mobile?: string | null
          class_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          emergency_contact_number?: string | null
          enrollment_status?: string
          father_name?: string | null
          full_name: string
          gender?: string | null
          guardian_email?: string | null
          guardian_name?: string | null
          id?: string
          mother_name?: string | null
          photo_path?: string | null
          previous_school_name?: string | null
          primary_mobile?: string | null
          roll_number?: number | null
          updated_at?: string
        }
        Update: {
          address_district?: string | null
          address_pin_code?: string | null
          address_post_office?: string | null
          address_state?: string | null
          address_village?: string | null
          admission_date?: string | null
          admission_number?: string
          alternate_mobile?: string | null
          class_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          emergency_contact_number?: string | null
          enrollment_status?: string
          father_name?: string | null
          full_name?: string
          gender?: string | null
          guardian_email?: string | null
          guardian_name?: string | null
          id?: string
          mother_name?: string | null
          photo_path?: string | null
          previous_school_name?: string | null
          primary_mobile?: string | null
          roll_number?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_entries: {
        Row: {
          class_id: string
          created_at: string
          end_time: string
          id: string
          room: string | null
          start_time: string
          subject: string
          updated_at: string
          weekday: number
        }
        Insert: {
          class_id: string
          created_at?: string
          end_time: string
          id?: string
          room?: string | null
          start_time: string
          subject: string
          updated_at?: string
          weekday: number
        }
        Update: {
          class_id?: string
          created_at?: string
          end_time?: string
          id?: string
          room?: string | null
          start_time?: string
          subject?: string
          updated_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "timetable_entries_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_fee_records_for_class: {
        Args: {
          _academic_session: string
          _class_id: string
          _due_date: string
        }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_assigned_teacher: { Args: { class_uuid: string }; Returns: boolean }
      owns_student: { Args: { student_uuid: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "teacher" | "parent"
      attendance_status: "present" | "absent" | "late"
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
      app_role: ["admin", "teacher", "parent"],
      attendance_status: ["present", "absent", "late"],
    },
  },
} as const
