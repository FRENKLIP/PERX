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
      cart_items: {
        Row: {
          created_at: string
          id: string
          offer_id: string
          qty: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          offer_id: string
          qty?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          offer_id?: string
          qty?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          icon: string | null
          name_en: string
          name_sq: string
          slug: string
          sort_order: number
        }
        Insert: {
          icon?: string | null
          name_en: string
          name_sq: string
          slug: string
          sort_order?: number
        }
        Update: {
          icon?: string | null
          name_en?: string
          name_sq?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      companies: {
        Row: {
          address: string | null
          city: string | null
          country: string
          created_at: string
          currency: string
          description: string | null
          hero_image_url: string | null
          id: string
          kind: Database["public"]["Enums"]["company_kind"]
          lat: number | null
          lng: number | null
          logo_url: string | null
          name: string
          neighborhood: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string
          created_at?: string
          currency?: string
          description?: string | null
          hero_image_url?: string | null
          id?: string
          kind: Database["public"]["Enums"]["company_kind"]
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          name: string
          neighborhood?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string
          created_at?: string
          currency?: string
          description?: string | null
          hero_image_url?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["company_kind"]
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          name?: string
          neighborhood?: string | null
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          offer_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          offer_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          offer_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_providers: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          is_owner: boolean
          offer_id: string
          provider_company_id: string
          share_pct: number
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          is_owner?: boolean
          offer_id: string
          provider_company_id: string
          share_pct?: number
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          is_owner?: boolean
          offer_id?: string
          provider_company_id?: string
          share_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "offer_providers_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_providers_provider_company_id_fkey"
            columns: ["provider_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_reviews: {
        Row: {
          body: string | null
          created_at: string
          id: string
          offer_id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          offer_id: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          offer_id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_reviews_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          category_slug: string
          created_at: string
          description: string
          description_sq: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_seasonal: boolean
          location: string | null
          price_all: number
          provider_company_id: string
          tags: string[] | null
          title: string
          title_sq: string | null
        }
        Insert: {
          category_slug: string
          created_at?: string
          description: string
          description_sq?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_seasonal?: boolean
          location?: string | null
          price_all: number
          provider_company_id: string
          tags?: string[] | null
          title: string
          title_sq?: string | null
        }
        Update: {
          category_slug?: string
          created_at?: string
          description?: string
          description_sq?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_seasonal?: boolean
          location?: string | null
          price_all?: number
          provider_company_id?: string
          tags?: string[] | null
          title?: string
          title_sq?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "offers_provider_company_id_fkey"
            columns: ["provider_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          employer_company_id: string | null
          full_name: string | null
          id: string
          locale: string
          monthly_budget_all: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          employer_company_id?: string | null
          full_name?: string | null
          id: string
          locale?: string
          monthly_budget_all?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          employer_company_id?: string | null
          full_name?: string | null
          id?: string
          locale?: string
          monthly_budget_all?: number
        }
        Relationships: [
          {
            foreignKeyName: "profiles_employer_company_id_fkey"
            columns: ["employer_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      request_items: {
        Row: {
          id: string
          offer_id: string
          offer_title: string
          payment_status: string
          price_all: number
          provider_company_id: string
          qty: number
          redemption_code: string | null
          request_id: string
          share_pct_snapshot: number
        }
        Insert: {
          id?: string
          offer_id: string
          offer_title: string
          payment_status?: string
          price_all: number
          provider_company_id: string
          qty?: number
          redemption_code?: string | null
          request_id: string
          share_pct_snapshot?: number
        }
        Update: {
          id?: string
          offer_id?: string
          offer_title?: string
          payment_status?: string
          price_all?: number
          provider_company_id?: string
          qty?: number
          redemption_code?: string | null
          request_id?: string
          share_pct_snapshot?: number
        }
        Relationships: [
          {
            foreignKeyName: "request_items_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_items_provider_company_id_fkey"
            columns: ["provider_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      requests: {
        Row: {
          ai_package_name: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          employee_id: string
          employer_company_id: string
          id: string
          note: string | null
          status: Database["public"]["Enums"]["request_status"]
          total_all: number
        }
        Insert: {
          ai_package_name?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          employee_id: string
          employer_company_id: string
          id?: string
          note?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          total_all: number
        }
        Update: {
          ai_package_name?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          employee_id?: string
          employer_company_id?: string
          id?: string
          note?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          total_all?: number
        }
        Relationships: [
          {
            foreignKeyName: "requests_employer_company_id_fkey"
            columns: ["employer_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_company_role: {
        Args: {
          _company_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      signup_setup_account: {
        Args: {
          p_company_name?: string
          p_full_name?: string
          p_role: Database["public"]["Enums"]["app_role"]
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "employee" | "employer_admin" | "provider_admin"
      company_kind: "employer" | "provider" | "both"
      request_status: "pending" | "approved" | "rejected"
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
      app_role: ["employee", "employer_admin", "provider_admin"],
      company_kind: ["employer", "provider", "both"],
      request_status: ["pending", "approved", "rejected"],
    },
  },
} as const
