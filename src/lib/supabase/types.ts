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
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      dropins: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          course_id: number | null
          course_title: string | null
          created_at: string | null
          day_of_week: string | null
          end_time: string | null
          first_date: string | null
          id: number
          last_date: string | null
          location_id: number | null
          max_age_months: number | null
          metadata: Json | null
          min_age_months: number | null
          season_id: number | null
          section: string | null
          start_time: string | null
          sub_activity: string | null
          updated_at: string | null
        }
        Insert: {
          activity_type?: Database["public"]["Enums"]["activity_type"]
          course_id?: number | null
          course_title?: string | null
          created_at?: string | null
          day_of_week?: string | null
          end_time?: string | null
          first_date?: string | null
          id?: number
          last_date?: string | null
          location_id?: number | null
          max_age_months?: number | null
          metadata?: Json | null
          min_age_months?: number | null
          season_id?: number | null
          section?: string | null
          start_time?: string | null
          sub_activity?: string | null
          updated_at?: string | null
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"]
          course_id?: number | null
          course_title?: string | null
          created_at?: string | null
          day_of_week?: string | null
          end_time?: string | null
          first_date?: string | null
          id?: number
          last_date?: string | null
          location_id?: number | null
          max_age_months?: number | null
          metadata?: Json | null
          min_age_months?: number | null
          season_id?: number | null
          section?: string | null
          start_time?: string | null
          sub_activity?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dropins_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dropins_season_fk"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      facilities: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          created_at: string | null
          facility_name: string | null
          id: number
          location_id: number | null
          metadata: Json | null
          section: string | null
          updated_at: string | null
        }
        Insert: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          created_at?: string | null
          facility_name?: string | null
          id?: number
          location_id?: number | null
          metadata?: Json | null
          section?: string | null
          updated_at?: string | null
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"]
          created_at?: string | null
          facility_name?: string | null
          id?: number
          location_id?: number | null
          metadata?: Json | null
          section?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facilities_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          city: string | null
          community_council: string | null
          coordinates: unknown
          created_at: string | null
          district: string | null
          id: number
          last_synced_at: string | null
          lat: number | null
          lng: number | null
          name: string
          postal_code: string | null
          raw_geometry: Json | null
          updated_at: string | null
          venue_type: string | null
          ward: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          community_council?: string | null
          coordinates?: unknown
          created_at?: string | null
          district?: string | null
          id: number
          last_synced_at?: string | null
          lat?: number | null
          lng?: number | null
          name: string
          postal_code?: string | null
          raw_geometry?: Json | null
          updated_at?: string | null
          venue_type?: string | null
          ward?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          community_council?: string | null
          coordinates?: unknown
          created_at?: string | null
          district?: string | null
          id?: number
          last_synced_at?: string | null
          lat?: number | null
          lng?: number | null
          name?: string
          postal_code?: string | null
          raw_geometry?: Json | null
          updated_at?: string | null
          venue_type?: string | null
          ward?: string | null
        }
        Relationships: []
      }
      programs: {
        Row: {
          activity_title: string | null
          activity_type: Database["public"]["Enums"]["activity_type"]
          activity_url: string | null
          course_id: number | null
          course_title: string | null
          created_at: string | null
          days_of_week: string[] | null
          end_date: string | null
          end_time: string | null
          id: number
          location_id: number | null
          max_age_months: number | null
          metadata: Json | null
          min_age_months: number | null
          program_category: string | null
          registration_date: string | null
          season_id: number | null
          section: string | null
          start_date: string | null
          start_time: string | null
          status: string | null
          sub_activity: string | null
          updated_at: string | null
        }
        Insert: {
          activity_title?: string | null
          activity_type?: Database["public"]["Enums"]["activity_type"]
          activity_url?: string | null
          course_id?: number | null
          course_title?: string | null
          created_at?: string | null
          days_of_week?: string[] | null
          end_date?: string | null
          end_time?: string | null
          id?: number
          location_id?: number | null
          max_age_months?: number | null
          metadata?: Json | null
          min_age_months?: number | null
          program_category?: string | null
          registration_date?: string | null
          season_id?: number | null
          section?: string | null
          start_date?: string | null
          start_time?: string | null
          status?: string | null
          sub_activity?: string | null
          updated_at?: string | null
        }
        Update: {
          activity_title?: string | null
          activity_type?: Database["public"]["Enums"]["activity_type"]
          activity_url?: string | null
          course_id?: number | null
          course_title?: string | null
          created_at?: string | null
          days_of_week?: string[] | null
          end_date?: string | null
          end_time?: string | null
          id?: number
          location_id?: number | null
          max_age_months?: number | null
          metadata?: Json | null
          min_age_months?: number | null
          program_category?: string | null
          registration_date?: string | null
          season_id?: number | null
          section?: string | null
          start_date?: string | null
          start_time?: string | null
          status?: string | null
          sub_activity?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "programs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programs_season_fk"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      rink_live_status: {
        Row: {
          asset_id: number | null
          comments: string | null
          fetched_at: string | null
          id: number
          location_id: number | null
          posted_date: string | null
          reason: string | null
          season_end: string | null
          season_start: string | null
          status: Database["public"]["Enums"]["live_status_code"]
        }
        Insert: {
          asset_id?: number | null
          comments?: string | null
          fetched_at?: string | null
          id?: number
          location_id?: number | null
          posted_date?: string | null
          reason?: string | null
          season_end?: string | null
          season_start?: string | null
          status: Database["public"]["Enums"]["live_status_code"]
        }
        Update: {
          asset_id?: number | null
          comments?: string | null
          fetched_at?: string | null
          id?: number
          location_id?: number | null
          posted_date?: string | null
          reason?: string | null
          season_end?: string | null
          season_start?: string | null
          status?: Database["public"]["Enums"]["live_status_code"]
        }
        Relationships: [
          {
            foreignKeyName: "rink_live_status_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "rinks"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "rink_live_status_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      rinks: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"] | null
          asset_id: number | null
          asset_name: string
          created_at: string | null
          data_source: string | null
          has_boards: boolean | null
          ice_pad_size: string | null
          id: number
          location_id: number | null
          metadata: Json | null
          operated_by: string | null
          pad_length_ft: number | null
          pad_width_ft: number | null
          permit_class: string | null
          public_name: string | null
          rink_type: Database["public"]["Enums"]["rink_type"]
          updated_at: string | null
        }
        Insert: {
          activity_type?: Database["public"]["Enums"]["activity_type"] | null
          asset_id?: number | null
          asset_name: string
          created_at?: string | null
          data_source?: string | null
          has_boards?: boolean | null
          ice_pad_size?: string | null
          id?: number
          location_id?: number | null
          metadata?: Json | null
          operated_by?: string | null
          pad_length_ft?: number | null
          pad_width_ft?: number | null
          permit_class?: string | null
          public_name?: string | null
          rink_type: Database["public"]["Enums"]["rink_type"]
          updated_at?: string | null
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"] | null
          asset_id?: number | null
          asset_name?: string
          created_at?: string | null
          data_source?: string | null
          has_boards?: boolean | null
          ice_pad_size?: string | null
          id?: number
          location_id?: number | null
          metadata?: Json | null
          operated_by?: string | null
          pad_length_ft?: number | null
          pad_width_ft?: number | null
          permit_class?: string | null
          public_name?: string | null
          rink_type?: Database["public"]["Enums"]["rink_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rinks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          detected_at: string | null
          end_date: string
          id: number
          is_current: boolean | null
          notes: string | null
          season_label: string | null
          season_name: string
          start_date: string
        }
        Insert: {
          detected_at?: string | null
          end_date: string
          id?: number
          is_current?: boolean | null
          notes?: string | null
          season_label?: string | null
          season_name: string
          start_date: string
        }
        Update: {
          detected_at?: string | null
          end_date?: string
          id?: number
          is_current?: boolean | null
          notes?: string | null
          season_label?: string | null
          season_name?: string
          start_date?: string
        }
        Relationships: []
      }
      sync_log: {
        Row: {
          error_message: string | null
          finished_at: string | null
          function_name: string
          id: number
          notes: string | null
          rows_upserted: Json | null
          started_at: string | null
          status: Database["public"]["Enums"]["sync_status"]
        }
        Insert: {
          error_message?: string | null
          finished_at?: string | null
          function_name: string
          id?: number
          notes?: string | null
          rows_upserted?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["sync_status"]
        }
        Update: {
          error_message?: string | null
          finished_at?: string | null
          function_name?: string
          id?: number
          notes?: string | null
          rows_upserted?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["sync_status"]
        }
        Relationships: []
      }
      user_dropin_alerts: {
        Row: {
          id: number
          user_id: string
          location_id: number
          course_title: string
          alert_start_time: string
          alert_end_time: string
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          location_id: number
          course_title: string
          alert_start_time?: string
          alert_end_time?: string
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          location_id?: number
          course_title?: string
          alert_start_time?: string
          alert_end_time?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_dropin_alerts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_favourites: {
        Row: {
          created_at: string | null
          id: number
          location_id: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          location_id?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          location_id?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_favourites_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_program_watchlist: {
        Row: {
          id: number
          user_id: string
          course_id: number
          location_id: number
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          course_id: number
          location_id: number
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          course_id?: number
          location_id?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_program_watchlist_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      location_ids_for_activity: {
        Args: { p_activity_type: string; p_sub_activity?: string }
        Returns: number[]
      }
      locations_near: {
        Args: { lat: number; lng: number; radius_m?: number }
        Returns: {
          address: string
          distance_m: number
          district: string
          id: number
          name: string
        }[]
      }
      set_location_coordinates: {
        Args: { lat: number; lng: number; loc_id: number }
        Returns: undefined
      }
    }
    Enums: {
      activity_type:
        | "skating"
        | "fitness"
        | "aquatics"
        | "arts"
        | "sports"
        | "other"
      live_status_code: "open" | "closed" | "service_alert"
      operator_type:
        | "PFR"
        | "Arena Board"
        | "Lakeshore Arena Corporation"
        | "Other"
      rink_type: "indoor" | "outdoor"
      sync_status: "running" | "success" | "failed"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      activity_type: [
        "skating",
        "fitness",
        "aquatics",
        "arts",
        "sports",
        "other",
      ],
      live_status_code: ["open", "closed", "service_alert"],
      operator_type: [
        "PFR",
        "Arena Board",
        "Lakeshore Arena Corporation",
        "Other",
      ],
      rink_type: ["indoor", "outdoor"],
      sync_status: ["running", "success", "failed"],
    },
  },
} as const
