// Supabase 자동 생성 타입 정의
// 이 파일은 Supabase CLI를 통해 자동 생성되거나 수동으로 업데이트됩니다.

export interface Database {
  public: {
    Tables: {
      // 사용자 테이블
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          phone: string | null;
          role: 'customer' | 'driver' | 'restaurant_owner' | 'admin';
          created_at: string;
          updated_at: string;
          last_login: string | null;
          is_active: boolean;
          email_verified: boolean;
          phone_verified: boolean;
        };
        Insert: {
          id?: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          role?: 'customer' | 'driver' | 'restaurant_owner' | 'admin';
          created_at?: string;
          updated_at?: string;
          last_login?: string | null;
          is_active?: boolean;
          email_verified?: boolean;
          phone_verified?: boolean;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          role?: 'customer' | 'driver' | 'restaurant_owner' | 'admin';
          created_at?: string;
          updated_at?: string;
          last_login?: string | null;
          is_active?: boolean;
          email_verified?: boolean;
          phone_verified?: boolean;
        };
        Relationships: [];
      };
      
      // 음식점 테이블
      restaurants: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          description: string | null;
          address: string;
          phone: string;
          email: string | null;
          image_url: string | null;
          cuisine_type: string;
          rating: number;
          review_count: number;
          is_open: boolean;
          is_verified: boolean;
          delivery_fee: number;
          minimum_order: number;
          estimated_delivery_time: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          description?: string | null;
          address: string;
          phone: string;
          email?: string | null;
          image_url?: string | null;
          cuisine_type: string;
          rating?: number;
          review_count?: number;
          is_open?: boolean;
          is_verified?: boolean;
          delivery_fee?: number;
          minimum_order?: number;
          estimated_delivery_time?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          description?: string | null;
          address?: string;
          phone?: string;
          email?: string | null;
          image_url?: string | null;
          cuisine_type?: string;
          rating?: number;
          review_count?: number;
          is_open?: boolean;
          is_verified?: boolean;
          delivery_fee?: number;
          minimum_order?: number;
          estimated_delivery_time?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "restaurants_owner_id_fkey";
            columns: ["owner_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };

      // 메뉴 아이템 테이블
      menu_items: {
        Row: {
          id: string;
          restaurant_id: string;
          name: string;
          description: string | null;
          price: number;
          image_url: string | null;
          category: string;
          is_available: boolean;
          preparation_time: number;
          nutritional_info: any | null;
          allergens: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          name: string;
          description?: string | null;
          price: number;
          image_url?: string | null;
          category: string;
          is_available?: boolean;
          preparation_time?: number;
          nutritional_info?: any | null;
          allergens?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          name?: string;
          description?: string | null;
          price?: number;
          image_url?: string | null;
          category?: string;
          is_available?: boolean;
          preparation_time?: number;
          nutritional_info?: any | null;
          allergens?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "menu_items_restaurant_id_fkey";
            columns: ["restaurant_id"];
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          }
        ];
      };

      // 주문 테이블
      orders: {
        Row: {
          id: string;
          customer_id: string;
          restaurant_id: string;
          driver_id: string | null;
          status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'delivered' | 'cancelled';
          order_number: string;
          total_amount: number;
          delivery_fee: number;
          tip_amount: number;
          delivery_address: string;
          delivery_notes: string | null;
          estimated_delivery_time: string;
          actual_delivery_time: string | null;
          payment_method: string;
          payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          restaurant_id: string;
          driver_id?: string | null;
          status?: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'delivered' | 'cancelled';
          order_number: string;
          total_amount: number;
          delivery_fee?: number;
          tip_amount?: number;
          delivery_address: string;
          delivery_notes?: string | null;
          estimated_delivery_time: string;
          actual_delivery_time?: string | null;
          payment_method: string;
          payment_status?: 'pending' | 'paid' | 'failed' | 'refunded';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          restaurant_id?: string;
          driver_id?: string | null;
          status?: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'delivered' | 'cancelled';
          order_number?: string;
          total_amount?: number;
          delivery_fee?: number;
          tip_amount?: number;
          delivery_address?: string;
          delivery_notes?: string | null;
          estimated_delivery_time?: string;
          actual_delivery_time?: string | null;
          payment_method?: string;
          payment_status?: 'pending' | 'paid' | 'failed' | 'refunded';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey";
            columns: ["customer_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_restaurant_id_fkey";
            columns: ["restaurant_id"];
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_driver_id_fkey";
            columns: ["driver_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: 'customer' | 'driver' | 'restaurant_owner' | 'admin';
      order_status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'delivered' | 'cancelled';
      payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
} 