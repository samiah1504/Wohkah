export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      access_events: {
        Row: {
          action: string;
          company_id: string;
          created_at: string;
          id: number;
          resource_id: string | null;
          resource_type: string;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          company_id: string;
          created_at?: string;
          id?: never;
          resource_id?: string | null;
          resource_type: string;
          user_id?: string | null;
        };
        Update: {
          action?: string;
          company_id?: string;
          created_at?: string;
          id?: never;
          resource_id?: string | null;
          resource_type?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          action: string;
          actor_type: string;
          actor_user_id: string | null;
          changes: Json | null;
          company_id: string | null;
          created_at: string;
          entity_id: string | null;
          entity_type: string;
          id: number;
          ip: unknown;
          metadata: Json | null;
          user_agent: string | null;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor_type: string;
          actor_user_id?: string | null;
          changes?: Json | null;
          company_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type: string;
          id?: never;
          ip?: unknown;
          metadata?: Json | null;
          user_agent?: string | null;
        };
        Update: {
          action?: string;
          actor_type?: string;
          actor_user_id?: string | null;
          changes?: Json | null;
          company_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string;
          id?: never;
          ip?: unknown;
          metadata?: Json | null;
          user_agent?: string | null;
        };
        Relationships: [];
      };
      branches: {
        Row: {
          address: NonNullable<Json>;
          archived_at: string | null;
          code: string | null;
          company_id: string;
          created_at: string;
          id: string;
          is_headquarters: boolean;
          name: string;
          phone: string | null;
          timezone: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          address?: NonNullable<Json>;
          archived_at?: string | null;
          code?: string | null;
          company_id: string;
          created_at?: string;
          id?: string;
          is_headquarters?: boolean;
          name: string;
          phone?: string | null;
          timezone?: string | null;
          updated_at?: string;
        };
        Update: {
          address?: NonNullable<Json>;
          archived_at?: string | null;
          code?: string | null;
          company_id?: string;
          created_at?: string;
          id?: string;
          is_headquarters?: boolean;
          name?: string;
          phone?: string | null;
          timezone?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "branches_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      companies: {
        Row: {
          address: NonNullable<Json>;
          business_email: string | null;
          country_code: string;
          created_at: string;
          created_by: string | null;
          currency: string;
          id: string;
          industry: string | null;
          legal_name: string | null;
          logo_path: string | null;
          name: string;
          phone: string | null;
          size_band: string | null;
          slug: string;
          status: Database["public"]["Enums"]["company_status"];
          timezone: string;
          updated_at: string;
          website: string | null;
          work_end: string;
          work_start: string;
          working_days: number[];
        };
        ComputedFields: never;
        Insert: {
          address?: NonNullable<Json>;
          business_email?: string | null;
          country_code?: string;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          id?: string;
          industry?: string | null;
          legal_name?: string | null;
          logo_path?: string | null;
          name: string;
          phone?: string | null;
          size_band?: string | null;
          slug: string;
          status?: Database["public"]["Enums"]["company_status"];
          timezone?: string;
          updated_at?: string;
          website?: string | null;
          work_end?: string;
          work_start?: string;
          working_days?: number[];
        };
        Update: {
          address?: NonNullable<Json>;
          business_email?: string | null;
          country_code?: string;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          id?: string;
          industry?: string | null;
          legal_name?: string | null;
          logo_path?: string | null;
          name?: string;
          phone?: string | null;
          size_band?: string | null;
          slug?: string;
          status?: Database["public"]["Enums"]["company_status"];
          timezone?: string;
          updated_at?: string;
          website?: string | null;
          work_end?: string;
          work_start?: string;
          working_days?: number[];
        };
        Relationships: [];
      };
      company_feature_overrides: {
        Row: {
          company_id: string;
          created_at: string;
          created_by: string | null;
          enabled: boolean;
          expires_at: string | null;
          feature_key: string;
          id: string;
          limit_value: number | null;
          reason: string;
        };
        ComputedFields: never;
        Insert: {
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          enabled?: boolean;
          expires_at?: string | null;
          feature_key: string;
          id?: string;
          limit_value?: number | null;
          reason: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          enabled?: boolean;
          expires_at?: string | null;
          feature_key?: string;
          id?: string;
          limit_value?: number | null;
          reason?: string;
        };
        Relationships: [
          {
            foreignKeyName: "company_feature_overrides_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "company_feature_overrides_feature_key_fkey";
            columns: ["feature_key"];
            isOneToOne: false;
            referencedRelation: "features";
            referencedColumns: ["key"];
          },
        ];
      };
      company_invitations: {
        Row: {
          accepted_at: string | null;
          accepted_by: string | null;
          company_id: string;
          created_at: string;
          email: string;
          expires_at: string;
          id: string;
          invited_by: string | null;
          revoked_at: string | null;
          role_ids: string[];
          status: Database["public"]["Enums"]["invitation_status"];
          token_hash: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          company_id: string;
          created_at?: string;
          email: string;
          expires_at?: string;
          id?: string;
          invited_by?: string | null;
          revoked_at?: string | null;
          role_ids?: string[];
          status?: Database["public"]["Enums"]["invitation_status"];
          token_hash: string;
          updated_at?: string;
        };
        Update: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          company_id?: string;
          created_at?: string;
          email?: string;
          expires_at?: string;
          id?: string;
          invited_by?: string | null;
          revoked_at?: string | null;
          role_ids?: string[];
          status?: Database["public"]["Enums"]["invitation_status"];
          token_hash?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "company_invitations_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      company_members: {
        Row: {
          company_id: string;
          created_at: string;
          id: string;
          invited_by: string | null;
          joined_at: string;
          removed_at: string | null;
          status: Database["public"]["Enums"]["member_status"];
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          company_id: string;
          created_at?: string;
          id?: string;
          invited_by?: string | null;
          joined_at?: string;
          removed_at?: string | null;
          status?: Database["public"]["Enums"]["member_status"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          id?: string;
          invited_by?: string | null;
          joined_at?: string;
          removed_at?: string | null;
          status?: Database["public"]["Enums"]["member_status"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      company_subscriptions: {
        Row: {
          billing_interval: Database["public"]["Enums"]["billing_interval"] | null;
          cancel_at_period_end: boolean;
          company_id: string;
          created_at: string;
          current_period_end: string | null;
          current_period_start: string | null;
          id: string;
          plan_id: string;
          status: Database["public"]["Enums"]["subscription_status"];
          trial_ends_at: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          billing_interval?: Database["public"]["Enums"]["billing_interval"] | null;
          cancel_at_period_end?: boolean;
          company_id: string;
          created_at?: string;
          current_period_end?: string | null;
          current_period_start?: string | null;
          id?: string;
          plan_id: string;
          status?: Database["public"]["Enums"]["subscription_status"];
          trial_ends_at?: string | null;
          updated_at?: string;
        };
        Update: {
          billing_interval?: Database["public"]["Enums"]["billing_interval"] | null;
          cancel_at_period_end?: boolean;
          company_id?: string;
          created_at?: string;
          current_period_end?: string | null;
          current_period_start?: string | null;
          id?: string;
          plan_id?: string;
          status?: Database["public"]["Enums"]["subscription_status"];
          trial_ends_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "company_subscriptions_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: true;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "company_subscriptions_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "subscription_plans";
            referencedColumns: ["id"];
          },
        ];
      };
      departments: {
        Row: {
          archived_at: string | null;
          company_id: string;
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          parent_id: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          archived_at?: string | null;
          company_id: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          parent_id?: string | null;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          company_id?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          parent_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "departments_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "departments_company_id_parent_id_fkey";
            columns: ["company_id", "parent_id"];
            isOneToOne: false;
            referencedRelation: "departments";
            referencedColumns: ["company_id", "id"];
          },
        ];
      };
      features: {
        Row: {
          description: string;
          key: string;
          kind: string;
        };
        ComputedFields: never;
        Insert: {
          description: string;
          key: string;
          kind: string;
        };
        Update: {
          description?: string;
          key?: string;
          kind?: string;
        };
        Relationships: [];
      };
      login_events: {
        Row: {
          created_at: string;
          email_hash: string | null;
          event: string;
          id: number;
          ip: unknown;
          user_agent: string | null;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          email_hash?: string | null;
          event: string;
          id?: never;
          ip?: unknown;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          email_hash?: string | null;
          event?: string;
          id?: never;
          ip?: unknown;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      member_roles: {
        Row: {
          branch_id: string | null;
          company_id: string;
          created_at: string;
          created_by: string | null;
          department_id: string | null;
          id: string;
          member_id: string;
          role_id: string;
          scope_type: Database["public"]["Enums"]["role_scope"];
        };
        ComputedFields: never;
        Insert: {
          branch_id?: string | null;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          department_id?: string | null;
          id?: string;
          member_id: string;
          role_id: string;
          scope_type?: Database["public"]["Enums"]["role_scope"];
        };
        Update: {
          branch_id?: string | null;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          department_id?: string | null;
          id?: string;
          member_id?: string;
          role_id?: string;
          scope_type?: Database["public"]["Enums"]["role_scope"];
        };
        Relationships: [
          {
            foreignKeyName: "member_roles_company_id_branch_id_fkey";
            columns: ["company_id", "branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["company_id", "id"];
          },
          {
            foreignKeyName: "member_roles_company_id_department_id_fkey";
            columns: ["company_id", "department_id"];
            isOneToOne: false;
            referencedRelation: "departments";
            referencedColumns: ["company_id", "id"];
          },
          {
            foreignKeyName: "member_roles_company_id_member_id_fkey";
            columns: ["company_id", "member_id"];
            isOneToOne: false;
            referencedRelation: "company_members";
            referencedColumns: ["company_id", "id"];
          },
          {
            foreignKeyName: "member_roles_company_id_role_id_fkey";
            columns: ["company_id", "role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["company_id", "id"];
          },
        ];
      };
      permissions: {
        Row: {
          description: string;
          is_sensitive: boolean;
          key: string;
          module: string;
          sort_order: number;
        };
        ComputedFields: never;
        Insert: {
          description: string;
          is_sensitive?: boolean;
          key: string;
          module: string;
          sort_order?: number;
        };
        Update: {
          description?: string;
          is_sensitive?: boolean;
          key?: string;
          module?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      plan_features: {
        Row: {
          enabled: boolean;
          feature_key: string;
          limit_value: number | null;
          plan_id: string;
        };
        ComputedFields: never;
        Insert: {
          enabled?: boolean;
          feature_key: string;
          limit_value?: number | null;
          plan_id: string;
        };
        Update: {
          enabled?: boolean;
          feature_key?: string;
          limit_value?: number | null;
          plan_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "plan_features_feature_key_fkey";
            columns: ["feature_key"];
            isOneToOne: false;
            referencedRelation: "features";
            referencedColumns: ["key"];
          },
          {
            foreignKeyName: "plan_features_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "subscription_plans";
            referencedColumns: ["id"];
          },
        ];
      };
      platform_admins: {
        Row: {
          created_at: string;
          created_by: string | null;
          role: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          role: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          role?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_path: string | null;
          created_at: string;
          full_name: string;
          id: string;
          locale: string;
          phone: string | null;
          timezone: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          avatar_path?: string | null;
          created_at?: string;
          full_name?: string;
          id: string;
          locale?: string;
          phone?: string | null;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          avatar_path?: string | null;
          created_at?: string;
          full_name?: string;
          id?: string;
          locale?: string;
          phone?: string | null;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      public_holidays: {
        Row: {
          branch_id: string | null;
          company_id: string;
          created_at: string;
          holiday_date: string;
          id: string;
          name: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          branch_id?: string | null;
          company_id: string;
          created_at?: string;
          holiday_date: string;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          branch_id?: string | null;
          company_id?: string;
          created_at?: string;
          holiday_date?: string;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "public_holidays_company_id_branch_id_fkey";
            columns: ["company_id", "branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["company_id", "id"];
          },
          {
            foreignKeyName: "public_holidays_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      rate_limit_buckets: {
        Row: {
          count: number;
          key: string;
          window_start: string;
        };
        ComputedFields: never;
        Insert: {
          count?: number;
          key: string;
          window_start: string;
        };
        Update: {
          count?: number;
          key?: string;
          window_start?: string;
        };
        Relationships: [];
      };
      role_permissions: {
        Row: {
          company_id: string;
          created_at: string;
          permission_key: string;
          role_id: string;
        };
        ComputedFields: never;
        Insert: {
          company_id: string;
          created_at?: string;
          permission_key: string;
          role_id: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          permission_key?: string;
          role_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "role_permissions_company_id_role_id_fkey";
            columns: ["company_id", "role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["company_id", "id"];
          },
          {
            foreignKeyName: "role_permissions_permission_key_fkey";
            columns: ["permission_key"];
            isOneToOne: false;
            referencedRelation: "permissions";
            referencedColumns: ["key"];
          },
        ];
      };
      role_templates: {
        Row: {
          permission_key: string;
          system_key: string;
        };
        ComputedFields: never;
        Insert: {
          permission_key: string;
          system_key: string;
        };
        Update: {
          permission_key?: string;
          system_key?: string;
        };
        Relationships: [
          {
            foreignKeyName: "role_templates_permission_key_fkey";
            columns: ["permission_key"];
            isOneToOne: false;
            referencedRelation: "permissions";
            referencedColumns: ["key"];
          },
        ];
      };
      roles: {
        Row: {
          company_id: string;
          created_at: string;
          description: string | null;
          id: string;
          is_locked: boolean;
          name: string;
          system_key: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          company_id: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_locked?: boolean;
          name: string;
          system_key?: string | null;
          updated_at?: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_locked?: boolean;
          name?: string;
          system_key?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "roles_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      subscription_plans: {
        Row: {
          annual_price_minor: number | null;
          code: string;
          created_at: string;
          currency: string;
          description: string | null;
          extra_employee_price_minor: number;
          id: string;
          included_employees: number;
          is_active: boolean;
          is_public: boolean;
          monthly_price_minor: number;
          name: string;
          sort_order: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          annual_price_minor?: number | null;
          code: string;
          created_at?: string;
          currency?: string;
          description?: string | null;
          extra_employee_price_minor: number;
          id?: string;
          included_employees: number;
          is_active?: boolean;
          is_public?: boolean;
          monthly_price_minor: number;
          name: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          annual_price_minor?: number | null;
          code?: string;
          created_at?: string;
          currency?: string;
          description?: string | null;
          extra_employee_price_minor?: number;
          id?: string;
          included_employees?: number;
          is_active?: boolean;
          is_public?: boolean;
          monthly_price_minor?: number;
          name?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      support_access_grants: {
        Row: {
          approved_by: string | null;
          company_id: string;
          created_at: string;
          expires_at: string | null;
          granted_to: string;
          id: string;
          reason: string;
          requested_by: string | null;
          revoked_at: string | null;
          starts_at: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          approved_by?: string | null;
          company_id: string;
          created_at?: string;
          expires_at?: string | null;
          granted_to: string;
          id?: string;
          reason: string;
          requested_by?: string | null;
          revoked_at?: string | null;
          starts_at?: string | null;
          updated_at?: string;
        };
        Update: {
          approved_by?: string | null;
          company_id?: string;
          created_at?: string;
          expires_at?: string | null;
          granted_to?: string;
          id?: string;
          reason?: string;
          requested_by?: string | null;
          revoked_at?: string | null;
          starts_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "support_access_grants_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_invitation: { Args: { p_token: string }; Returns: string };
      create_company: {
        Args: {
          p_country_code?: string;
          p_currency?: string;
          p_industry?: string;
          p_name: string;
          p_size_band?: string;
          p_slug: string;
          p_timezone?: string;
        };
        Returns: string;
      };
      invitation_preview: {
        Args: { p_token: string };
        Returns: {
          company_name: string;
          company_slug: string;
          email: string;
          expires_at: string;
        }[];
      };
      is_slug_available: { Args: { p_slug: string }; Returns: boolean };
      rate_limit_hit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number };
        Returns: {
          allowed: boolean;
          remaining: number;
          reset_at: string;
        }[];
      };
      workspace_context: { Args: { p_slug: string }; Returns: Json };
      workspace_member_directory: {
        Args: { p_company: string };
        Returns: {
          email: string;
          full_name: string;
          joined_at: string;
          member_id: string;
          roles: Json;
          status: Database["public"]["Enums"]["member_status"];
          user_id: string;
        }[];
      };
    };
    Enums: {
      billing_interval: "monthly" | "annual";
      company_status: "active" | "suspended" | "closed";
      invitation_status: "pending" | "accepted" | "revoked";
      member_status: "active" | "suspended" | "removed";
      role_scope: "company" | "department" | "branch";
      subscription_status: "trialing" | "active" | "past_due" | "grace" | "canceled" | "expired";
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
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      billing_interval: ["monthly", "annual"],
      company_status: ["active", "suspended", "closed"],
      invitation_status: ["pending", "accepted", "revoked"],
      member_status: ["active", "suspended", "removed"],
      role_scope: ["company", "department", "branch"],
      subscription_status: ["trialing", "active", "past_due", "grace", "canceled", "expired"],
    },
  },
} as const;
