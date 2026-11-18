export type UserRole = "admin" | "owner" | "tenant";
export type CycleStatus = "draft" | "open" | "closed";
export type TenantStatus = "invited" | "active" | "departed";
export type BillCategory = "internet" | "electricity" | "water" | "other";
export type BillSource = "manual" | "pdf_parsed";
export type FlagStatus = "open" | "under_review" | "resolved" | "dismissed";
export type TransparencyLevel = "full" | "own_share";
export type SubscriptionStatus = "active" | "canceled" | "past_due";
export type PaymentStatus = "owed" | "marked_paid" | "confirmed";

export type OwnerPaymentMethods = {
  owner_id: string;
  payee_name: string | null;
  venmo_handle: string | null;
  cashapp_handle: string | null;
  zelle_contact: string | null;
  paypal_me: string | null;
  instructions: string | null;
  created_at: string;
  updated_at: string;
};

export type CycleNotificationKind = "cycle_ready" | "due_soon" | "overdue" | "owner_digest";
export type CycleNotificationStatus = "pending" | "sent" | "skipped" | "failed";

export type CycleNotification = {
  id: string;
  kind: CycleNotificationKind;
  cycle_id: string | null;
  property_id: string | null;
  property_tenant_id: string | null;
  recipient_id: string | null;
  recipient_email: string;
  digest_date: string | null;
  status: CycleNotificationStatus;
  provider_id: string | null;
  error: string | null;
  sent_at: string;
  created_at: string;
};

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  onboarding_completed: boolean;
  email_reminders?: boolean;
  created_at: string;
  updated_at: string;
};

export type Property = {
  id: string;
  owner_id: string;
  name: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  timezone: string;
  transparency_level: TransparencyLevel;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type PropertyTenant = {
  invite_expires_at?: string | null;
  id: string;
  property_id: string;
  tenant_id: string | null;
  email: string;
  display_name: string;
  join_date: string;
  leave_date: string | null;
  status: TenantStatus;
  invite_token: string;
  invited_at: string;
  claimed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BillingCycle = {
  due_date?: string | null;
  published_at?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  id: string;
  property_id: string;
  label: string;
  status: CycleStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type Bill = {
  id: string;
  cycle_id: string;
  property_id: string;
  category: BillCategory;
  provider: string;
  amount_cents: number;
  service_start: string;
  service_end: string;
  source: BillSource;
  pdf_storage_path: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type BillSplit = {
  id: string;
  bill_id: string;
  property_id: string;
  tenant_id: string;
  person_days: number;
  total_person_days: number;
  amount_cents: number;
  payment_status?: PaymentStatus;
  marked_paid_at?: string | null;
  confirmed_at?: string | null;
  confirmed_by?: string | null;
  payment_note?: string | null;
  created_at: string;
  updated_at: string;
};

export type BillFlag = {
  id: string;
  bill_id: string;
  property_id: string;
  tenant_id: string;
  flagged_by: string;
  reason: string;
  suggested_amount_cents: number | null;
  resolved_amount_cents: number | null;
  status: FlagStatus;
  resolution_note: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  metadata: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
};

export type AuditLogEntry = {
  id: string;
  user_id: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
};

export type SubscriptionPlan = {
  id: string;
  name: string;
  max_properties: number;
  max_tenants_per_property: number;
  max_bills_per_month: number;
  price_cents: number;
  stripe_price_id: string | null;
  is_active: boolean;
  created_at: string;
};

export type UserSubscription = {
  comp_until?: string | null;
  comp_note?: string | null;
  id: string;
  user_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
};

export type AppHeartbeat = {
  id: number;
  last_cron_at: string | null;
  last_ping_at: string | null;
};

// Database type for Supabase client
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at" | "updated_at">;
        Update: Partial<Omit<Profile, "id" | "created_at">>;
        Relationships: [];
      };
      properties: {
        Row: Property;
        Insert: Omit<Property, "id" | "created_at" | "updated_at" | "deleted_at">;
        Update: Partial<Omit<Property, "id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "properties_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      property_tenants: {
        Row: PropertyTenant;
        Insert: Omit<PropertyTenant, "id" | "invite_token" | "invited_at" | "claimed_at" | "created_at" | "updated_at">;
        Update: Partial<Omit<PropertyTenant, "id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "property_tenants_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "property_tenants_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      billing_cycles: {
        Row: BillingCycle;
        Insert: Omit<BillingCycle, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<BillingCycle, "id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "billing_cycles_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "billing_cycles_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      bills: {
        Row: Bill;
        Insert: Omit<Bill, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Bill, "id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "bills_cycle_id_fkey";
            columns: ["cycle_id"];
            isOneToOne: false;
            referencedRelation: "billing_cycles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bills_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bills_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      bill_splits: {
        Row: BillSplit;
        Insert: Omit<BillSplit, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<BillSplit, "id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "bill_splits_bill_id_fkey";
            columns: ["bill_id"];
            isOneToOne: false;
            referencedRelation: "bills";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bill_splits_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bill_splits_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "property_tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      bill_flags: {
        Row: BillFlag;
        Insert: Omit<BillFlag, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<BillFlag, "id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "bill_flags_bill_id_fkey";
            columns: ["bill_id"];
            isOneToOne: false;
            referencedRelation: "bills";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bill_flags_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bill_flags_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "property_tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, "id" | "created_at">;
        Update: Partial<Omit<Notification, "id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      audit_log: {
        Row: AuditLogEntry;
        Insert: Omit<AuditLogEntry, "id" | "created_at">;
        Update: never;
        Relationships: [];
      };
      subscription_plans: {
        Row: SubscriptionPlan;
        Insert: Omit<SubscriptionPlan, "id" | "created_at">;
        Update: Partial<Omit<SubscriptionPlan, "id" | "created_at">>;
        Relationships: [];
      };
      user_subscriptions: {
        Row: UserSubscription;
        Insert: Omit<UserSubscription, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<UserSubscription, "id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "subscription_plans";
            referencedColumns: ["id"];
          }
        ];
      };
      app_heartbeat: {
        Row: AppHeartbeat;
        Insert: Partial<AppHeartbeat>;
        Update: Partial<AppHeartbeat>;
        Relationships: [];
      };
      cycle_notifications: {
        Row: CycleNotification;
        Insert: Partial<Omit<CycleNotification, "kind" | "recipient_email">> &
          Pick<CycleNotification, "kind" | "recipient_email">;
        Update: Partial<Omit<CycleNotification, "id" | "created_at">>;
        Relationships: [];
      };
      owner_payment_methods: {
        Row: OwnerPaymentMethods;
        Insert: Omit<OwnerPaymentMethods, "created_at" | "updated_at">;
        Update: Partial<Omit<OwnerPaymentMethods, "owner_id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "owner_payment_methods_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_invite: {
        Args: { p_token: string };
        Returns: {
          property_name: string;
          display_name: string;
          email: string;
          invite_status: "valid" | "claimed" | "expired" | "invalid";
        }[];
      };
      claim_invite: {
        Args: { p_token: string };
        Returns: string;
      };
      ping: {
        Args: Record<string, never>;
        Returns: string;
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      mark_cycle_paid: {
        Args: { p_cycle_id: string; p_note?: string | null };
        Returns: number;
      };
      unmark_cycle_paid: {
        Args: { p_cycle_id: string };
        Returns: number;
      };
      confirm_tenant_cycle_payment: {
        Args: { p_cycle_id: string; p_property_tenant_id: string };
        Returns: number;
      };
      reopen_tenant_cycle_payment: {
        Args: { p_cycle_id: string; p_property_tenant_id: string };
        Returns: number;
      };
      is_tenant_of_owner: {
        Args: { p_owner_id: string };
        Returns: boolean;
      };
      recalculate_bill_splits: {
        Args: { p_bill_id: string };
        Returns: number;
      };
      recalculate_property_splits: {
        Args: { p_property_id: string; p_from?: string | null };
        Returns: number;
      };
      soft_delete_property: {
        Args: { p_property_id: string };
        Returns: undefined;
      };
      can_manage_property_splits: {
        Args: { p_property_id: string };
        Returns: boolean;
      };
      become_owner: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
