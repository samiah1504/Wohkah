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
      billing_invoices: {
        Row: {
          billing_interval: Database["public"]["Enums"]["billing_interval"];
          company_id: string;
          created_at: string;
          created_by: string | null;
          currency: string;
          extra_staff: number;
          extra_work_locations: number;
          id: string;
          lines: NonNullable<Json>;
          paid_at: string | null;
          plan_id: string;
          provider: string | null;
          reference: string;
          status: string;
          total_minor: number;
        };
        ComputedFields: never;
        Insert: {
          billing_interval: Database["public"]["Enums"]["billing_interval"];
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          extra_staff?: number;
          extra_work_locations?: number;
          id?: string;
          lines: NonNullable<Json>;
          paid_at?: string | null;
          plan_id: string;
          provider?: string | null;
          reference: string;
          status?: string;
          total_minor: number;
        };
        Update: {
          billing_interval?: Database["public"]["Enums"]["billing_interval"];
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          extra_staff?: number;
          extra_work_locations?: number;
          id?: string;
          lines?: NonNullable<Json>;
          paid_at?: string | null;
          plan_id?: string;
          provider?: string | null;
          reference?: string;
          status?: string;
          total_minor?: number;
        };
        Relationships: [
          {
            foreignKeyName: "billing_invoices_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "billing_invoices_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "subscription_plans";
            referencedColumns: ["id"];
          },
        ];
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
          employee_id: string | null;
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
          employee_id?: string | null;
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
          employee_id?: string | null;
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
          {
            foreignKeyName: "company_invitations_employee_fk";
            columns: ["company_id", "employee_id"];
            isOneToOne: false;
            referencedRelation: "employees";
            referencedColumns: ["company_id", "id"];
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
          extra_staff: number;
          extra_work_locations: number;
          id: string;
          pending_change_at: string | null;
          pending_plan_id: string | null;
          plan_id: string;
          staff_selection_required: boolean;
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
          extra_staff?: number;
          extra_work_locations?: number;
          id?: string;
          pending_change_at?: string | null;
          pending_plan_id?: string | null;
          plan_id: string;
          staff_selection_required?: boolean;
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
          extra_staff?: number;
          extra_work_locations?: number;
          id?: string;
          pending_change_at?: string | null;
          pending_plan_id?: string | null;
          plan_id?: string;
          staff_selection_required?: boolean;
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
            foreignKeyName: "company_subscriptions_pending_plan_id_fkey";
            columns: ["pending_plan_id"];
            isOneToOne: false;
            referencedRelation: "subscription_plans";
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
      employee_documents: {
        Row: {
          archived_at: string | null;
          archived_by: string | null;
          category: string;
          company_id: string;
          content_type: string | null;
          created_at: string;
          employee_id: string;
          id: string;
          name: string;
          size_bytes: number;
          storage_path: string;
          uploaded_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          archived_at?: string | null;
          archived_by?: string | null;
          category: string;
          company_id: string;
          content_type?: string | null;
          created_at?: string;
          employee_id: string;
          id?: string;
          name: string;
          size_bytes: number;
          storage_path: string;
          uploaded_by?: string | null;
        };
        Update: {
          archived_at?: string | null;
          archived_by?: string | null;
          category?: string;
          company_id?: string;
          content_type?: string | null;
          created_at?: string;
          employee_id?: string;
          id?: string;
          name?: string;
          size_bytes?: number;
          storage_path?: string;
          uploaded_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "employee_documents_company_id_employee_id_fkey";
            columns: ["company_id", "employee_id"];
            isOneToOne: false;
            referencedRelation: "employees";
            referencedColumns: ["company_id", "id"];
          },
        ];
      };
      employee_history: {
        Row: {
          actor_user_id: string | null;
          company_id: string;
          created_at: string;
          details: NonNullable<Json>;
          employee_id: string;
          event: string;
          id: number;
        };
        ComputedFields: never;
        Insert: {
          actor_user_id?: string | null;
          company_id: string;
          created_at?: string;
          details?: NonNullable<Json>;
          employee_id: string;
          event: string;
          id?: never;
        };
        Update: {
          actor_user_id?: string | null;
          company_id?: string;
          created_at?: string;
          details?: NonNullable<Json>;
          employee_id?: string;
          event?: string;
          id?: never;
        };
        Relationships: [
          {
            foreignKeyName: "employee_history_company_id_employee_id_fkey";
            columns: ["company_id", "employee_id"];
            isOneToOne: false;
            referencedRelation: "employees";
            referencedColumns: ["company_id", "id"];
          },
        ];
      };
      employee_private: {
        Row: {
          bank_account_name: string | null;
          bank_account_number: string | null;
          bank_name: string | null;
          company_id: string;
          created_at: string;
          date_of_birth: string | null;
          emergency_name: string | null;
          emergency_phone: string | null;
          emergency_relationship: string | null;
          employee_id: string;
          gender: string | null;
          home_address: NonNullable<Json>;
          kin_name: string | null;
          kin_phone: string | null;
          kin_relationship: string | null;
          pension_pin: string | null;
          pfa_name: string | null;
          tin: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          bank_account_name?: string | null;
          bank_account_number?: string | null;
          bank_name?: string | null;
          company_id: string;
          created_at?: string;
          date_of_birth?: string | null;
          emergency_name?: string | null;
          emergency_phone?: string | null;
          emergency_relationship?: string | null;
          employee_id: string;
          gender?: string | null;
          home_address?: NonNullable<Json>;
          kin_name?: string | null;
          kin_phone?: string | null;
          kin_relationship?: string | null;
          pension_pin?: string | null;
          pfa_name?: string | null;
          tin?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          bank_account_name?: string | null;
          bank_account_number?: string | null;
          bank_name?: string | null;
          company_id?: string;
          created_at?: string;
          date_of_birth?: string | null;
          emergency_name?: string | null;
          emergency_phone?: string | null;
          emergency_relationship?: string | null;
          employee_id?: string;
          gender?: string | null;
          home_address?: NonNullable<Json>;
          kin_name?: string | null;
          kin_phone?: string | null;
          kin_relationship?: string | null;
          pension_pin?: string | null;
          pfa_name?: string | null;
          tin?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "employee_private_company_id_employee_id_fkey";
            columns: ["company_id", "employee_id"];
            isOneToOne: false;
            referencedRelation: "employees";
            referencedColumns: ["company_id", "id"];
          },
        ];
      };
      employees: {
        Row: {
          branch_id: string | null;
          company_id: string;
          created_at: string;
          created_by: string | null;
          email: string | null;
          employment_type: Database["public"]["Enums"]["employment_type"];
          end_date: string | null;
          first_name: string | null;
          full_name: string;
          id: string;
          job_title: string | null;
          last_name: string | null;
          member_id: string | null;
          phone: string | null;
          plan_suspended_at: string | null;
          reports_to: string | null;
          staff_number: number;
          start_date: string | null;
          status: Database["public"]["Enums"]["staff_status"];
          status_before_plan_suspension: Database["public"]["Enums"]["staff_status"] | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          branch_id?: string | null;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          employment_type?: Database["public"]["Enums"]["employment_type"];
          end_date?: string | null;
          first_name?: string | null;
          full_name: string;
          id?: string;
          job_title?: string | null;
          last_name?: string | null;
          member_id?: string | null;
          phone?: string | null;
          plan_suspended_at?: string | null;
          reports_to?: string | null;
          staff_number?: number;
          start_date?: string | null;
          status?: Database["public"]["Enums"]["staff_status"];
          status_before_plan_suspension?: Database["public"]["Enums"]["staff_status"] | null;
          updated_at?: string;
        };
        Update: {
          branch_id?: string | null;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          employment_type?: Database["public"]["Enums"]["employment_type"];
          end_date?: string | null;
          first_name?: string | null;
          full_name?: string;
          id?: string;
          job_title?: string | null;
          last_name?: string | null;
          member_id?: string | null;
          phone?: string | null;
          plan_suspended_at?: string | null;
          reports_to?: string | null;
          staff_number?: number;
          start_date?: string | null;
          status?: Database["public"]["Enums"]["staff_status"];
          status_before_plan_suspension?: Database["public"]["Enums"]["staff_status"] | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "employees_company_id_branch_id_fkey";
            columns: ["company_id", "branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["company_id", "id"];
          },
          {
            foreignKeyName: "employees_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "employees_company_id_member_id_fkey";
            columns: ["company_id", "member_id"];
            isOneToOne: false;
            referencedRelation: "company_members";
            referencedColumns: ["company_id", "id"];
          },
          {
            foreignKeyName: "employees_reports_to_fk";
            columns: ["company_id", "reports_to"];
            isOneToOne: false;
            referencedRelation: "employees";
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
      notifications: {
        Row: {
          body: string;
          company_id: string;
          created_at: string;
          dedupe_key: string;
          emailed_at: string | null;
          id: number;
          kind: string;
          link: string | null;
          read_at: string | null;
          title: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          body: string;
          company_id: string;
          created_at?: string;
          dedupe_key: string;
          emailed_at?: string | null;
          id?: never;
          kind: string;
          link?: string | null;
          read_at?: string | null;
          title: string;
          user_id: string;
        };
        Update: {
          body?: string;
          company_id?: string;
          created_at?: string;
          dedupe_key?: string;
          emailed_at?: string | null;
          id?: never;
          kind?: string;
          link?: string | null;
          read_at?: string | null;
          title?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_transactions: {
        Row: {
          amount_minor: number;
          company_id: string;
          created_at: string;
          currency: string;
          id: string;
          invoice_id: string;
          provider: string;
          provider_reference: string;
          raw: Json | null;
          status: string;
          verified_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          amount_minor: number;
          company_id: string;
          created_at?: string;
          currency: string;
          id?: string;
          invoice_id: string;
          provider: string;
          provider_reference: string;
          raw?: Json | null;
          status: string;
          verified_at?: string | null;
        };
        Update: {
          amount_minor?: number;
          company_id?: string;
          created_at?: string;
          currency?: string;
          id?: string;
          invoice_id?: string;
          provider?: string;
          provider_reference?: string;
          raw?: Json | null;
          status?: string;
          verified_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payment_transactions_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_transactions_company_id_invoice_id_fkey";
            columns: ["company_id", "invoice_id"];
            isOneToOne: false;
            referencedRelation: "billing_invoices";
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
          first_name: string | null;
          full_name: string;
          id: string;
          last_name: string | null;
          locale: string;
          phone: string | null;
          timezone: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          avatar_path?: string | null;
          created_at?: string;
          first_name?: string | null;
          full_name?: string;
          id: string;
          last_name?: string | null;
          locale?: string;
          phone?: string | null;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          avatar_path?: string | null;
          created_at?: string;
          first_name?: string | null;
          full_name?: string;
          id?: string;
          last_name?: string | null;
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
      subscription_events: {
        Row: {
          actor_user_id: string | null;
          company_id: string;
          created_at: string;
          details: NonNullable<Json>;
          event: string;
          from_plan_id: string | null;
          id: number;
          to_plan_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          actor_user_id?: string | null;
          company_id: string;
          created_at?: string;
          details?: NonNullable<Json>;
          event: string;
          from_plan_id?: string | null;
          id?: never;
          to_plan_id?: string | null;
        };
        Update: {
          actor_user_id?: string | null;
          company_id?: string;
          created_at?: string;
          details?: NonNullable<Json>;
          event?: string;
          from_plan_id?: string | null;
          id?: never;
          to_plan_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "subscription_events_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscription_events_from_plan_id_fkey";
            columns: ["from_plan_id"];
            isOneToOne: false;
            referencedRelation: "subscription_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscription_events_to_plan_id_fkey";
            columns: ["to_plan_id"];
            isOneToOne: false;
            referencedRelation: "subscription_plans";
            referencedColumns: ["id"];
          },
        ];
      };
      subscription_plans: {
        Row: {
          allows_extra_staff: boolean;
          allows_extra_work_locations: boolean;
          annual_price_minor: number | null;
          code: string;
          created_at: string;
          currency: string;
          description: string | null;
          extra_employee_price_minor: number;
          extra_staff_annual_price_minor: number;
          extra_work_location_annual_price_minor: number;
          extra_work_location_price_minor: number;
          id: string;
          included_employees: number;
          is_active: boolean;
          is_public: boolean;
          monthly_price_minor: number;
          name: string;
          report_history_months: number | null;
          sort_order: number;
          support_level: string | null;
          trial_days: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          allows_extra_staff?: boolean;
          allows_extra_work_locations?: boolean;
          annual_price_minor?: number | null;
          code: string;
          created_at?: string;
          currency?: string;
          description?: string | null;
          extra_employee_price_minor: number;
          extra_staff_annual_price_minor?: number;
          extra_work_location_annual_price_minor?: number;
          extra_work_location_price_minor?: number;
          id?: string;
          included_employees: number;
          is_active?: boolean;
          is_public?: boolean;
          monthly_price_minor: number;
          name: string;
          report_history_months?: number | null;
          sort_order?: number;
          support_level?: string | null;
          trial_days?: number;
          updated_at?: string;
        };
        Update: {
          allows_extra_staff?: boolean;
          allows_extra_work_locations?: boolean;
          annual_price_minor?: number | null;
          code?: string;
          created_at?: string;
          currency?: string;
          description?: string | null;
          extra_employee_price_minor?: number;
          extra_staff_annual_price_minor?: number;
          extra_work_location_annual_price_minor?: number;
          extra_work_location_price_minor?: number;
          id?: string;
          included_employees?: number;
          is_active?: boolean;
          is_public?: boolean;
          monthly_price_minor?: number;
          name?: string;
          report_history_months?: number | null;
          sort_order?: number;
          support_level?: string | null;
          trial_days?: number;
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
      trial_grants: {
        Row: {
          company_id: string;
          ended_at: string | null;
          ends_at: string;
          id: string;
          outcome: string;
          owner_user_id: string;
          plan_id: string;
          started_at: string;
        };
        ComputedFields: never;
        Insert: {
          company_id: string;
          ended_at?: string | null;
          ends_at: string;
          id?: string;
          outcome?: string;
          owner_user_id: string;
          plan_id: string;
          started_at?: string;
        };
        Update: {
          company_id?: string;
          ended_at?: string | null;
          ends_at?: string;
          id?: string;
          outcome?: string;
          owner_user_id?: string;
          plan_id?: string;
          started_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trial_grants_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: true;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trial_grants_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "subscription_plans";
            referencedColumns: ["id"];
          },
        ];
      };
      user_registrations: {
        Row: {
          acquisition_detail: string | null;
          acquisition_source: string | null;
          created_at: string;
          marketing_consent: boolean;
          marketing_consent_at: string | null;
          terms_accepted_at: string | null;
          terms_version: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          acquisition_detail?: string | null;
          acquisition_source?: string | null;
          created_at?: string;
          marketing_consent?: boolean;
          marketing_consent_at?: string | null;
          terms_accepted_at?: string | null;
          terms_version?: string | null;
          user_id: string;
        };
        Update: {
          acquisition_detail?: string | null;
          acquisition_source?: string | null;
          created_at?: string;
          marketing_consent?: boolean;
          marketing_consent_at?: string | null;
          terms_accepted_at?: string | null;
          terms_version?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      webhook_events: {
        Row: {
          event_id: string;
          event_type: string | null;
          id: number;
          payload: NonNullable<Json>;
          processed_at: string | null;
          processing_error: string | null;
          provider: string;
          received_at: string;
        };
        ComputedFields: never;
        Insert: {
          event_id: string;
          event_type?: string | null;
          id?: never;
          payload: NonNullable<Json>;
          processed_at?: string | null;
          processing_error?: string | null;
          provider: string;
          received_at?: string;
        };
        Update: {
          event_id?: string;
          event_type?: string | null;
          id?: never;
          payload?: NonNullable<Json>;
          processed_at?: string | null;
          processing_error?: string | null;
          provider?: string;
          received_at?: string;
        };
        Relationships: [];
      };
      work_locations: {
        Row: {
          address: NonNullable<Json>;
          archived_at: string | null;
          branch_id: string | null;
          company_id: string;
          created_at: string;
          id: string;
          latitude: number | null;
          longitude: number | null;
          name: string;
          radius_m: number | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          address?: NonNullable<Json>;
          archived_at?: string | null;
          branch_id?: string | null;
          company_id: string;
          created_at?: string;
          id?: string;
          latitude?: number | null;
          longitude?: number | null;
          name: string;
          radius_m?: number | null;
          updated_at?: string;
        };
        Update: {
          address?: NonNullable<Json>;
          archived_at?: string | null;
          branch_id?: string | null;
          company_id?: string;
          created_at?: string;
          id?: string;
          latitude?: number | null;
          longitude?: number | null;
          name?: string;
          radius_m?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "work_locations_company_id_branch_id_fkey";
            columns: ["company_id", "branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["company_id", "id"];
          },
          {
            foreignKeyName: "work_locations_company_id_fkey";
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
      apply_verified_payment: {
        Args: {
          p_amount_minor: number;
          p_currency: string;
          p_invoice_id: string;
          p_provider: string;
          p_provider_reference: string;
          p_raw: Json;
        };
        Returns: string;
      };
      cancel_scheduled_change: { Args: { p_company: string }; Returns: undefined };
      change_to_lower_plan: { Args: { p_company: string; p_plan_code: string }; Returns: string };
      create_checkout_invoice: {
        Args: {
          p_company: string;
          p_extra_locations: number;
          p_extra_staff: number;
          p_interval: Database["public"]["Enums"]["billing_interval"];
          p_plan_code: string;
        };
        Returns: string;
      };
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
      reactivate_staff: { Args: { p_company: string; p_ids: string[] }; Returns: number };
      refresh_subscription: { Args: { p_company: string }; Returns: undefined };
      refresh_workspace_subscription: { Args: { p_slug: string }; Returns: undefined };
      select_active_staff: {
        Args: { p_company: string; p_for_plan_code?: string; p_keep: string[] };
        Returns: number;
      };
      start_trial: { Args: { p_company: string; p_plan_code: string }; Returns: string };
      subscription_overview: { Args: { p_company: string }; Returns: Json };
      subscription_quote: {
        Args: {
          p_extra_locations: number;
          p_extra_staff: number;
          p_interval: Database["public"]["Enums"]["billing_interval"];
          p_plan_code: string;
        };
        Returns: Json;
      };
      trial_eligibility: {
        Args: { p_company: string };
        Returns: {
          eligible: boolean;
          reason: string;
        }[];
      };
      workspace_allowances: { Args: { p_company: string }; Returns: Json };
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
      employment_type: "full_time" | "part_time" | "contract" | "casual" | "intern";
      invitation_status: "pending" | "accepted" | "revoked";
      member_status: "active" | "suspended" | "removed";
      role_scope: "company" | "branch";
      staff_status:
        | "invited"
        | "onboarding"
        | "active"
        | "on_leave"
        | "suspended"
        | "plan_suspended"
        | "resigned"
        | "terminated"
        | "archived";
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
      employment_type: ["full_time", "part_time", "contract", "casual", "intern"],
      invitation_status: ["pending", "accepted", "revoked"],
      member_status: ["active", "suspended", "removed"],
      role_scope: ["company", "branch"],
      staff_status: [
        "invited",
        "onboarding",
        "active",
        "on_leave",
        "suspended",
        "plan_suspended",
        "resigned",
        "terminated",
        "archived",
      ],
      subscription_status: ["trialing", "active", "past_due", "grace", "canceled", "expired"],
    },
  },
} as const;
