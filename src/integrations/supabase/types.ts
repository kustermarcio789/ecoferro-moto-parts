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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      abandoned_carts: {
        Row: {
          contacted: boolean | null
          created_at: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          items: Json
          notes: string | null
          recovered: boolean | null
          total: number | null
          updated_at: string
        }
        Insert: {
          contacted?: boolean | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          items?: Json
          notes?: string | null
          recovered?: boolean | null
          total?: number | null
          updated_at?: string
        }
        Update: {
          contacted?: boolean | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          items?: Json
          notes?: string | null
          recovered?: boolean | null
          total?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      addresses: {
        Row: {
          city: string
          complement: string | null
          country: string | null
          created_at: string
          customer_id: string
          id: string
          is_default: boolean | null
          label: string | null
          neighborhood: string | null
          number: string | null
          state: string
          street: string
          zip_code: string
        }
        Insert: {
          city: string
          complement?: string | null
          country?: string | null
          created_at?: string
          customer_id: string
          id?: string
          is_default?: boolean | null
          label?: string | null
          neighborhood?: string | null
          number?: string | null
          state: string
          street: string
          zip_code: string
        }
        Update: {
          city?: string
          complement?: string | null
          country?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          is_default?: boolean | null
          label?: string | null
          neighborhood?: string | null
          number?: string | null
          state?: string
          street?: string
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      banners: {
        Row: {
          created_at: string
          ends_at: string | null
          id: string
          image_url: string
          is_active: boolean | null
          link: string | null
          position: string | null
          sort_order: number | null
          starts_at: string | null
          subtitle: string | null
          title: string
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          id?: string
          image_url: string
          is_active?: boolean | null
          link?: string | null
          position?: string | null
          sort_order?: number | null
          starts_at?: string | null
          subtitle?: string | null
          title: string
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          link?: string | null
          position?: string | null
          sort_order?: number | null
          starts_at?: string | null
          subtitle?: string | null
          title?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          parent_id: string | null
          slug: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          paid_at: string | null
          partner_id: string
          period_end: string | null
          period_start: string | null
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          partner_id: string
          period_end?: string | null
          period_start?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          partner_id?: string
          period_end?: string | null
          period_start?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_payments_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          amount: number
          channel: string | null
          created_at: string
          id: string
          is_paid: boolean | null
          order_id: string | null
          paid_at: string | null
          percentage: number
          user_id: string | null
        }
        Insert: {
          amount: number
          channel?: string | null
          created_at?: string
          id?: string
          is_paid?: boolean | null
          order_id?: string | null
          paid_at?: string | null
          percentage: number
          user_id?: string | null
        }
        Update: {
          amount?: number
          channel?: string | null
          created_at?: string
          id?: string
          is_paid?: boolean | null
          order_id?: string | null
          paid_at?: string | null
          percentage?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commissions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "wholesale_orders_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      consents: {
        Row: {
          accepted: boolean
          created_at: string
          email: string | null
          id: string
          ip_address: string | null
          type: string
          user_agent: string | null
        }
        Insert: {
          accepted?: boolean
          created_at?: string
          email?: string | null
          id?: string
          ip_address?: string | null
          type: string
          user_agent?: string | null
        }
        Update: {
          accepted?: boolean
          created_at?: string
          email?: string | null
          id?: string
          ip_address?: string | null
          type?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean | null
          is_first_purchase: boolean | null
          max_uses: number | null
          min_order_value: number | null
          used_count: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value: number
          id?: string
          is_active?: boolean | null
          is_first_purchase?: boolean | null
          max_uses?: number | null
          min_order_value?: number | null
          used_count?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean | null
          is_first_purchase?: boolean | null
          max_uses?: number | null
          min_order_value?: number | null
          used_count?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          company_name: string | null
          cpf_cnpj: string | null
          created_at: string
          email: string | null
          id: string
          is_company: boolean | null
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          company_name?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_company?: boolean | null
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          company_name?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_company?: boolean | null
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      integration_logs: {
        Row: {
          attempts: number
          created_at: string
          destination_system: string
          direction: string
          error_message: string | null
          event_type: string
          external_event_id: string | null
          id: string
          integration_key: string
          operator_name: string | null
          processed_at: string | null
          product_code: string | null
          product_id: string | null
          product_mapping_id: string | null
          quantity: number | null
          request_payload: Json
          response_payload: Json | null
          sku: string | null
          source_reference: string | null
          source_system: string
          stage: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          destination_system?: string
          direction?: string
          error_message?: string | null
          event_type: string
          external_event_id?: string | null
          id?: string
          integration_key: string
          operator_name?: string | null
          processed_at?: string | null
          product_code?: string | null
          product_id?: string | null
          product_mapping_id?: string | null
          quantity?: number | null
          request_payload?: Json
          response_payload?: Json | null
          sku?: string | null
          source_reference?: string | null
          source_system: string
          stage?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          destination_system?: string
          direction?: string
          error_message?: string | null
          event_type?: string
          external_event_id?: string | null
          id?: string
          integration_key?: string
          operator_name?: string | null
          processed_at?: string | null
          product_code?: string | null
          product_id?: string | null
          product_mapping_id?: string | null
          quantity?: number | null
          request_payload?: Json
          response_payload?: Json | null
          sku?: string | null
          source_reference?: string | null
          source_system?: string
          stage?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_logs_product_mapping_id_fkey"
            columns: ["product_mapping_id"]
            isOneToOne: false
            referencedRelation: "product_external_mappings"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_balances: {
        Row: {
          available_quantity: number
          created_at: string
          damaged_quantity: number
          last_movement_at: string | null
          low_stock_threshold: number
          product_id: string
          reserved_quantity: number
          updated_at: string
        }
        Insert: {
          available_quantity?: number
          created_at?: string
          damaged_quantity?: number
          last_movement_at?: string | null
          low_stock_threshold?: number
          product_id: string
          reserved_quantity?: number
          updated_at?: string
        }
        Update: {
          available_quantity?: number
          created_at?: string
          damaged_quantity?: number
          last_movement_at?: string | null
          low_stock_threshold?: number
          product_id?: string
          reserved_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_balances_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          channel: string | null
          created_at: string
          created_by: string | null
          external_event_id: string | null
          id: string
          integration_log_id: string | null
          metadata: Json
          new_reserved: number | null
          new_stock: number | null
          order_id: string | null
          previous_reserved: number | null
          previous_stock: number | null
          product_id: string
          quantity: number
          reason: string | null
          source_reference: string | null
          source_system: string | null
          type: Database["public"]["Enums"]["inventory_movement_type"]
          variation_id: string | null
        }
        Insert: {
          channel?: string | null
          created_at?: string
          created_by?: string | null
          external_event_id?: string | null
          id?: string
          integration_log_id?: string | null
          metadata?: Json
          new_reserved?: number | null
          new_stock?: number | null
          order_id?: string | null
          previous_reserved?: number | null
          previous_stock?: number | null
          product_id: string
          quantity: number
          reason?: string | null
          source_reference?: string | null
          source_system?: string | null
          type: Database["public"]["Enums"]["inventory_movement_type"]
          variation_id?: string | null
        }
        Update: {
          channel?: string | null
          created_at?: string
          created_by?: string | null
          external_event_id?: string | null
          id?: string
          integration_log_id?: string | null
          metadata?: Json
          new_reserved?: number | null
          new_stock?: number | null
          order_id?: string | null
          previous_reserved?: number | null
          previous_stock?: number | null
          product_id?: string
          quantity?: number
          reason?: string | null
          source_reference?: string | null
          source_system?: string | null
          type?: Database["public"]["Enums"]["inventory_movement_type"]
          variation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_integration_log_id_fkey"
            columns: ["integration_log_id"]
            isOneToOne: false
            referencedRelation: "integration_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "wholesale_orders_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "product_variations"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          consent: boolean | null
          created_at: string
          email: string | null
          id: string
          message: string | null
          metadata: Json | null
          name: string | null
          phone: string | null
          source: Database["public"]["Enums"]["lead_source"]
          status: string | null
        }
        Insert: {
          consent?: boolean | null
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          name?: string | null
          phone?: string | null
          source?: Database["public"]["Enums"]["lead_source"]
          status?: string | null
        }
        Update: {
          consent?: boolean | null
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          name?: string | null
          phone?: string | null
          source?: Database["public"]["Enums"]["lead_source"]
          status?: string | null
        }
        Relationships: []
      }
      moq_rules: {
        Row: {
          category_id: string | null
          created_at: string
          customer_type: string | null
          id: string
          is_active: boolean | null
          min_quantity: number
          notes: string | null
          product_id: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          customer_type?: string | null
          id?: string
          is_active?: boolean | null
          min_quantity?: number
          notes?: string | null
          product_id?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          customer_type?: string | null
          id?: string
          is_active?: boolean | null
          min_quantity?: number
          notes?: string | null
          product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moq_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moq_rules_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      moto_models: {
        Row: {
          brand_id: string | null
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          slug: string
          year_end: number | null
          year_start: number | null
        }
        Insert: {
          brand_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          year_end?: number | null
          year_start?: number | null
        }
        Update: {
          brand_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          year_end?: number | null
          year_start?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "moto_models_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          confirmed_quantity: number | null
          created_at: string
          delivered_quantity: number
          discount: number | null
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          sku: string | null
          total: number
          unit_cost: number | null
          unit_price: number
          variation_id: string | null
        }
        Insert: {
          confirmed_quantity?: number | null
          created_at?: string
          delivered_quantity?: number
          discount?: number | null
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          sku?: string | null
          total: number
          unit_cost?: number | null
          unit_price: number
          variation_id?: string | null
        }
        Update: {
          confirmed_quantity?: number | null
          created_at?: string
          delivered_quantity?: number
          discount?: number | null
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          sku?: string | null
          total?: number
          unit_cost?: number | null
          unit_price?: number
          variation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "wholesale_orders_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "product_variations"
            referencedColumns: ["id"]
          },
        ]
      }
      order_production_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          expected_completion_at: string | null
          expected_start_at: string | null
          id: string
          metadata: Json
          notes: string | null
          operator_name: string | null
          order_id: string
          percentage: number
          stage_id: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          expected_completion_at?: string | null
          expected_start_at?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          operator_name?: string | null
          order_id: string
          percentage?: number
          stage_id: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          expected_completion_at?: string | null
          expected_start_at?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          operator_name?: string | null
          order_id?: string
          percentage?: number
          stage_id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_production_progress_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_production_progress_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "wholesale_orders_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_production_progress_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "production_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          atacadista_notes: string | null
          billing_address: Json | null
          cancelled_at: string | null
          coupon_id: string | null
          created_at: string
          customer_id: string | null
          customer_notes: string | null
          delivered_at: string | null
          discount: number | null
          estimated_delivery_at: string | null
          id: string
          internal_notes: string | null
          invoice_key: string | null
          invoice_number: string | null
          invoiced_at: string | null
          order_number: number
          overall_progress_percentage: number
          paid_at: string | null
          partner_id: string | null
          payment_id: string | null
          payment_method: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          priority: string
          production_started_at: string | null
          requested_delivery_date: string | null
          sales_channel: string | null
          shipped_at: string | null
          shipping_address: Json | null
          shipping_carrier: string | null
          shipping_cost: number | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          tracking_code: string | null
          updated_at: string
          wholesale_customer_id: string | null
        }
        Insert: {
          atacadista_notes?: string | null
          billing_address?: Json | null
          cancelled_at?: string | null
          coupon_id?: string | null
          created_at?: string
          customer_id?: string | null
          customer_notes?: string | null
          delivered_at?: string | null
          discount?: number | null
          estimated_delivery_at?: string | null
          id?: string
          internal_notes?: string | null
          invoice_key?: string | null
          invoice_number?: string | null
          invoiced_at?: string | null
          order_number?: number
          overall_progress_percentage?: number
          paid_at?: string | null
          partner_id?: string | null
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          priority?: string
          production_started_at?: string | null
          requested_delivery_date?: string | null
          sales_channel?: string | null
          shipped_at?: string | null
          shipping_address?: Json | null
          shipping_carrier?: string | null
          shipping_cost?: number | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          tracking_code?: string | null
          updated_at?: string
          wholesale_customer_id?: string | null
        }
        Update: {
          atacadista_notes?: string | null
          billing_address?: Json | null
          cancelled_at?: string | null
          coupon_id?: string | null
          created_at?: string
          customer_id?: string | null
          customer_notes?: string | null
          delivered_at?: string | null
          discount?: number | null
          estimated_delivery_at?: string | null
          id?: string
          internal_notes?: string | null
          invoice_key?: string | null
          invoice_number?: string | null
          invoiced_at?: string | null
          order_number?: number
          overall_progress_percentage?: number
          paid_at?: string | null
          partner_id?: string | null
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          priority?: string
          production_started_at?: string | null
          requested_delivery_date?: string | null
          sales_channel?: string | null
          shipped_at?: string | null
          shipping_address?: Json | null
          shipping_carrier?: string | null
          shipping_cost?: number | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          tracking_code?: string | null
          updated_at?: string
          wholesale_customer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_wholesale_customer_id_fkey"
            columns: ["wholesale_customer_id"]
            isOneToOne: false
            referencedRelation: "wholesale_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_stats: {
        Row: {
          clicks: number | null
          commission: number | null
          date: string
          id: string
          leads: number | null
          orders: number | null
          partner_id: string
          revenue: number | null
        }
        Insert: {
          clicks?: number | null
          commission?: number | null
          date?: string
          id?: string
          leads?: number | null
          orders?: number | null
          partner_id: string
          revenue?: number | null
        }
        Update: {
          clicks?: number | null
          commission?: number | null
          date?: string
          id?: string
          leads?: number | null
          orders?: number | null
          partner_id?: string
          revenue?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_stats_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          city: string | null
          cnpj: string | null
          commission_type: string | null
          commission_value: number | null
          company_name: string | null
          contact_name: string
          cookie_days: number | null
          coupon_code: string | null
          created_at: string
          email: string
          id: string
          notes: string | null
          phone: string | null
          referral_code: string | null
          segment: string | null
          state: string | null
          status: string
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          city?: string | null
          cnpj?: string | null
          commission_type?: string | null
          commission_value?: number | null
          company_name?: string | null
          contact_name: string
          cookie_days?: number | null
          coupon_code?: string | null
          created_at?: string
          email: string
          id?: string
          notes?: string | null
          phone?: string | null
          referral_code?: string | null
          segment?: string | null
          state?: string | null
          status?: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          city?: string | null
          cnpj?: string | null
          commission_type?: string | null
          commission_value?: number | null
          company_name?: string | null
          contact_name?: string
          cookie_days?: number | null
          coupon_code?: string | null
          created_at?: string
          email?: string
          id?: string
          notes?: string | null
          phone?: string | null
          referral_code?: string | null
          segment?: string | null
          state?: string | null
          status?: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          gateway: string | null
          gateway_id: string | null
          id: string
          metadata: Json | null
          method: string
          order_id: string
          paid_at: string | null
          status: Database["public"]["Enums"]["payment_status"]
        }
        Insert: {
          amount: number
          created_at?: string
          gateway?: string | null
          gateway_id?: string | null
          id?: string
          metadata?: Json | null
          method: string
          order_id: string
          paid_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Update: {
          amount?: number
          created_at?: string
          gateway?: string | null
          gateway_id?: string | null
          id?: string
          metadata?: Json | null
          method?: string
          order_id?: string
          paid_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "wholesale_orders_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      price_tables: {
        Row: {
          created_at: string
          description: string | null
          discount_percentage: number | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount_percentage?: number | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          discount_percentage?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      product_applications: {
        Row: {
          id: string
          model_id: string
          notes: string | null
          product_id: string
          year_end: number | null
          year_start: number | null
        }
        Insert: {
          id?: string
          model_id: string
          notes?: string | null
          product_id: string
          year_end?: number | null
          year_start?: number | null
        }
        Update: {
          id?: string
          model_id?: string
          notes?: string | null
          product_id?: string
          year_end?: number | null
          year_start?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_applications_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "moto_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_applications_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_external_mappings: {
        Row: {
          created_at: string
          external_code: string | null
          external_product_id: string | null
          external_sku: string | null
          id: string
          is_active: boolean
          metadata: Json
          product_id: string
          source_system: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          external_code?: string | null
          external_product_id?: string | null
          external_sku?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          product_id: string
          source_system: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          external_code?: string | null
          external_product_id?: string | null
          external_sku?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          product_id?: string
          source_system?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_external_mappings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string
          id: string
          is_primary: boolean | null
          product_id: string
          sort_order: number | null
          url: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean | null
          product_id: string
          sort_order?: number | null
          url: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean | null
          product_id?: string
          sort_order?: number | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variations: {
        Row: {
          id: string
          is_active: boolean | null
          name: string
          price: number | null
          product_id: string
          sku: string | null
          stock: number | null
        }
        Insert: {
          id?: string
          is_active?: boolean | null
          name: string
          price?: number | null
          product_id: string
          sku?: string | null
          stock?: number | null
        }
        Update: {
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number | null
          product_id?: string
          sku?: string | null
          stock?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      production_stages: {
        Row: {
          code: string
          color: string | null
          created_at: string
          default_duration_days: number
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
          weight_percentage: number
        }
        Insert: {
          code: string
          color?: string | null
          created_at?: string
          default_duration_days?: number
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
          weight_percentage?: number
        }
        Update: {
          code?: string
          color?: string | null
          created_at?: string
          default_duration_days?: number
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
          weight_percentage?: number
        }
        Relationships: []
      }
      products: {
        Row: {
          available_stock: number
          brand_id: string | null
          category_id: string | null
          cfop: string | null
          cofins_rate: number | null
          cost: number | null
          created_at: string
          description: string | null
          height: number | null
          icms_rate: number | null
          id: string
          internal_code: string | null
          ipi_rate: number | null
          is_active: boolean | null
          is_featured: boolean | null
          is_new: boolean | null
          last_stock_sync_at: string | null
          length: number | null
          meta_description: string | null
          meta_title: string | null
          min_stock: number | null
          ml_id: string | null
          ml_permalink: string | null
          moq: number | null
          name: string
          ncm: string | null
          origin: string | null
          original_price: number | null
          pis_rate: number | null
          price: number
          short_description: string | null
          sku: string | null
          slug: string
          stock: number
          updated_at: string
          weight: number | null
          wholesale_only: boolean | null
          wholesale_price: number | null
          width: number | null
        }
        Insert: {
          available_stock?: number
          brand_id?: string | null
          category_id?: string | null
          cfop?: string | null
          cofins_rate?: number | null
          cost?: number | null
          created_at?: string
          description?: string | null
          height?: number | null
          icms_rate?: number | null
          id?: string
          internal_code?: string | null
          ipi_rate?: number | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_new?: boolean | null
          last_stock_sync_at?: string | null
          length?: number | null
          meta_description?: string | null
          meta_title?: string | null
          min_stock?: number | null
          ml_id?: string | null
          ml_permalink?: string | null
          moq?: number | null
          name: string
          ncm?: string | null
          origin?: string | null
          original_price?: number | null
          pis_rate?: number | null
          price?: number
          short_description?: string | null
          sku?: string | null
          slug: string
          stock?: number
          updated_at?: string
          weight?: number | null
          wholesale_only?: boolean | null
          wholesale_price?: number | null
          width?: number | null
        }
        Update: {
          available_stock?: number
          brand_id?: string | null
          category_id?: string | null
          cfop?: string | null
          cofins_rate?: number | null
          cost?: number | null
          created_at?: string
          description?: string | null
          height?: number | null
          icms_rate?: number | null
          id?: string
          internal_code?: string | null
          ipi_rate?: number | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_new?: boolean | null
          last_stock_sync_at?: string | null
          length?: number | null
          meta_description?: string | null
          meta_title?: string | null
          min_stock?: number | null
          ml_id?: string | null
          ml_permalink?: string | null
          moq?: number | null
          name?: string
          ncm?: string | null
          origin?: string | null
          original_price?: number | null
          pis_rate?: number | null
          price?: number
          short_description?: string | null
          sku?: string | null
          slug?: string
          stock?: number
          updated_at?: string
          weight?: number | null
          wholesale_only?: boolean | null
          wholesale_price?: number | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          admin_notes: string | null
          cnpj: string | null
          company_name: string | null
          contact_name: string
          converted_order_id: string | null
          created_at: string
          email: string
          id: string
          items: Json
          observations: string | null
          phone: string
          quote_number: number
          status: Database["public"]["Enums"]["quote_status"]
          total_estimate: number | null
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          admin_notes?: string | null
          cnpj?: string | null
          company_name?: string | null
          contact_name: string
          converted_order_id?: string | null
          created_at?: string
          email: string
          id?: string
          items?: Json
          observations?: string | null
          phone: string
          quote_number?: number
          status?: Database["public"]["Enums"]["quote_status"]
          total_estimate?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          admin_notes?: string | null
          cnpj?: string | null
          company_name?: string | null
          contact_name?: string
          converted_order_id?: string | null
          created_at?: string
          email?: string
          id?: string
          items?: Json
          observations?: string | null
          phone?: string
          quote_number?: number
          status?: Database["public"]["Enums"]["quote_status"]
          total_estimate?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_converted_order_id_fkey"
            columns: ["converted_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_converted_order_id_fkey"
            columns: ["converted_order_id"]
            isOneToOne: false
            referencedRelation: "wholesale_orders_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          customer_id: string | null
          customer_name: string
          id: string
          is_approved: boolean | null
          is_featured: boolean | null
          product_id: string
          rating: number
          title: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name: string
          id?: string
          is_approved?: boolean | null
          is_featured?: boolean | null
          product_id: string
          rating: number
          title?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          id?: string
          is_approved?: boolean | null
          is_featured?: boolean | null
          product_id?: string
          rating?: number
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      stock_sync_logs: {
        Row: {
          error_message: string | null
          finished_at: string | null
          id: string
          source_url: string | null
          started_at: string
          status: string
          total_skus_not_found: number | null
          total_skus_received: number | null
          total_skus_updated: number | null
        }
        Insert: {
          error_message?: string | null
          finished_at?: string | null
          id?: string
          source_url?: string | null
          started_at?: string
          status?: string
          total_skus_not_found?: number | null
          total_skus_received?: number | null
          total_skus_updated?: number | null
        }
        Update: {
          error_message?: string | null
          finished_at?: string | null
          id?: string
          source_url?: string | null
          started_at?: string
          status?: string
          total_skus_not_found?: number | null
          total_skus_received?: number | null
          total_skus_updated?: number | null
        }
        Relationships: []
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
        Relationships: []
      }
      volume_discounts: {
        Row: {
          category_id: string | null
          created_at: string
          discount_percentage: number
          fixed_price: number | null
          id: string
          is_active: boolean | null
          max_quantity: number | null
          min_quantity: number
          price_table_id: string | null
          product_id: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          discount_percentage?: number
          fixed_price?: number | null
          id?: string
          is_active?: boolean | null
          max_quantity?: number | null
          min_quantity?: number
          price_table_id?: string | null
          product_id?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          discount_percentage?: number
          fixed_price?: number | null
          id?: string
          is_active?: boolean | null
          max_quantity?: number | null
          min_quantity?: number
          price_table_id?: string | null
          product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "volume_discounts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volume_discounts_price_table_id_fkey"
            columns: ["price_table_id"]
            isOneToOne: false
            referencedRelation: "price_tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volume_discounts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      wholesale_customers: {
        Row: {
          access_credentials_delivery: string | null
          access_credentials_sent_at: string | null
          approved_at: string | null
          approved_by: string | null
          city: string | null
          cnpj: string
          contact_name: string
          created_at: string
          customer_id: string | null
          customer_type: string | null
          documents: Json | null
          email: string
          id: string
          inscricao_estadual: string | null
          min_order_value: number | null
          nome_fantasia: string | null
          notes: string | null
          phone: string
          price_table_id: string | null
          razao_social: string
          segment: string | null
          state: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          access_credentials_delivery?: string | null
          access_credentials_sent_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          city?: string | null
          cnpj: string
          contact_name: string
          created_at?: string
          customer_id?: string | null
          customer_type?: string | null
          documents?: Json | null
          email: string
          id?: string
          inscricao_estadual?: string | null
          min_order_value?: number | null
          nome_fantasia?: string | null
          notes?: string | null
          phone: string
          price_table_id?: string | null
          razao_social: string
          segment?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          access_credentials_delivery?: string | null
          access_credentials_sent_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          city?: string | null
          cnpj?: string
          contact_name?: string
          created_at?: string
          customer_id?: string | null
          customer_type?: string | null
          documents?: Json | null
          email?: string
          id?: string
          inscricao_estadual?: string | null
          min_order_value?: number | null
          nome_fantasia?: string | null
          notes?: string | null
          phone?: string
          price_table_id?: string | null
          razao_social?: string
          segment?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wholesale_customers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      wholesale_orders_summary: {
        Row: {
          cnpj: string | null
          created_at: string | null
          estimated_delivery_at: string | null
          id: string | null
          order_number: number | null
          overall_progress_percentage: number | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          production_started_at: string | null
          razao_social: string | null
          requested_delivery_date: string | null
          sales_channel: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          subtotal: number | null
          total: number | null
          wholesale_customer_id: string | null
          wholesale_user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_wholesale_customer_id_fkey"
            columns: ["wholesale_customer_id"]
            isOneToOne: false
            referencedRelation: "wholesale_customers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      advance_order_stage_by_code: {
        Args: { p_operator?: string; p_order_id: string; p_stage_code: string }
        Returns: boolean
      }
      create_wholesale_order:
        | {
            Args: {
              p_atacadista_notes?: string
              p_items: Json
              p_requested_delivery_date?: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_atacadista_notes?: string
              p_items: Json
              p_priority?: string
              p_requested_delivery_date?: string
            }
            Returns: Json
          }
      get_wholesale_email_by_cnpj: { Args: { p_cnpj: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      link_wholesale_to_current_user: {
        Args: { p_email: string }
        Returns: string
      }
      recalculate_order_progress: {
        Args: { p_order_id: string }
        Returns: number
      }
      recalculate_order_totals: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      seed_order_production_progress: {
        Args: { p_order_id: string; p_start_at?: string }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "operator" | "viewer"
      inventory_movement_type:
        | "entry"
        | "exit"
        | "adjustment"
        | "reservation"
        | "return"
        | "entry_from_production"
        | "sale"
        | "manual_adjustment"
        | "damaged_loss"
        | "cancellation_reversal"
        | "release_reservation"
      lead_source:
        | "newsletter"
        | "contact_form"
        | "quote_form"
        | "abandoned_cart"
        | "popup"
        | "whatsapp"
        | "other"
      order_status:
        | "pending"
        | "paid"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "refunded"
      payment_status:
        | "pending"
        | "approved"
        | "rejected"
        | "refunded"
        | "in_analysis"
      quote_status: "new" | "analyzing" | "sent" | "approved" | "rejected"
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
      app_role: ["admin", "manager", "operator", "viewer"],
      inventory_movement_type: [
        "entry",
        "exit",
        "adjustment",
        "reservation",
        "return",
        "entry_from_production",
        "sale",
        "manual_adjustment",
        "damaged_loss",
        "cancellation_reversal",
        "release_reservation",
      ],
      lead_source: [
        "newsletter",
        "contact_form",
        "quote_form",
        "abandoned_cart",
        "popup",
        "whatsapp",
        "other",
      ],
      order_status: [
        "pending",
        "paid",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ],
      payment_status: [
        "pending",
        "approved",
        "rejected",
        "refunded",
        "in_analysis",
      ],
      quote_status: ["new", "analyzing", "sent", "approved", "rejected"],
    },
  },
} as const
