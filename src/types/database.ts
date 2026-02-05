export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      analyses: {
        Row: {
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          project_id: string
          type: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          project_id: string
          type: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          project_id?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analyses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      credits: {
        Row: {
          balance: number
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      credits_history: {
        Row: {
          action: string
          amount: number
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          action: string
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credits_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deployments: {
        Row: {
          build_logs: string | null
          created_at: string | null
          deployment_url: string | null
          error_message: string | null
          github_repo_url: string | null
          id: string
          project_id: string
          status: string | null
          updated_at: string | null
          vercel_project_id: string | null
        }
        Insert: {
          build_logs?: string | null
          created_at?: string | null
          deployment_url?: string | null
          error_message?: string | null
          github_repo_url?: string | null
          id?: string
          project_id: string
          status?: string | null
          updated_at?: string | null
          vercel_project_id?: string | null
        }
        Update: {
          build_logs?: string | null
          created_at?: string | null
          deployment_url?: string | null
          error_message?: string | null
          github_repo_url?: string | null
          id?: string
          project_id?: string
          status?: string | null
          updated_at?: string | null
          vercel_project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deployments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          project_id: string
          role: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          project_id: string
          role: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          project_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      mvp_plans: {
        Row: {
          content: string
          created_at: string | null
          id: string
          project_id: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          project_id: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          project_id?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mvp_plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string | null
          credits_monthly: number
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          name: string
          price_monthly: number
          stripe_price_id: string | null
        }
        Insert: {
          created_at?: string | null
          credits_monthly: number
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          price_monthly: number
          stripe_price_id?: string | null
        }
        Update: {
          created_at?: string | null
          credits_monthly?: number
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          price_monthly?: number
          stripe_price_id?: string | null
        }
        Relationships: []
      }
      prds: {
        Row: {
          content: string
          created_at: string | null
          docx_url: string | null
          id: string
          pdf_url: string | null
          project_id: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          content: string
          created_at?: string | null
          docx_url?: string | null
          id?: string
          pdf_url?: string | null
          project_id: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          content?: string
          created_at?: string | null
          docx_url?: string | null
          id?: string
          pdf_url?: string | null
          project_id?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prds_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          stripe_customer_id: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          stripe_customer_id?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          stripe_customer_id?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          category: string | null
          created_at: string | null
          description: string
          id: string
          name: string
          settings: Json | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description: string
          id?: string
          name: string
          settings?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string
          id?: string
          name?: string
          settings?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_id: string | null
          status: string
          stripe_subscription_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string | null
          status?: string
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string | null
          status?: string
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tech_specs: {
        Row: {
          content: string
          created_at: string | null
          id: string
          project_id: string
          tech_stack: Json | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          project_id: string
          tech_stack?: Json | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          project_id?: string
          tech_stack?: Json | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tech_specs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_credits: {
        Args: {
          p_action: string
          p_amount: number
          p_description?: string
          p_metadata?: Json
          p_user_id: string
        }
        Returns: number
      }
      consume_credits: {
        Args: {
          p_action: string
          p_amount: number
          p_description?: string
          p_metadata?: Json
          p_user_id: string
        }
        Returns: boolean
      }
      get_credit_balance: { Args: { p_user_id: string }; Returns: number }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
