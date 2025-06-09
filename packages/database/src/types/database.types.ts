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

      // 리뷰 테이블
      reviews: {
        Row: {
          id: string;
          order_id: string;
          customer_id: string;
          restaurant_id: string;
          driver_id: string | null;
          restaurant_rating: number; // 1-5 별점
          delivery_rating: number | null; // 1-5 별점 (배달이 있는 경우)
          food_rating: number; // 1-5 별점
          service_rating: number; // 1-5 별점
          overall_rating: number; // 전체 평균 별점
          comment: string | null;
          images: string[] | null; // 리뷰 이미지 URL 배열
          is_anonymous: boolean;
          is_visible: boolean; // 점주가 숨길 수 있음
          helpful_count: number; // 도움이 됨 카운트
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          customer_id: string;
          restaurant_id: string;
          driver_id?: string | null;
          restaurant_rating: number;
          delivery_rating?: number | null;
          food_rating: number;
          service_rating: number;
          overall_rating: number;
          comment?: string | null;
          images?: string[] | null;
          is_anonymous?: boolean;
          is_visible?: boolean;
          helpful_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          customer_id?: string;
          restaurant_id?: string;
          driver_id?: string | null;
          restaurant_rating?: number;
          delivery_rating?: number | null;
          food_rating?: number;
          service_rating?: number;
          overall_rating?: number;
          comment?: string | null;
          images?: string[] | null;
          is_anonymous?: boolean;
          is_visible?: boolean;
          helpful_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey";
            columns: ["order_id"];
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_customer_id_fkey";
            columns: ["customer_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_restaurant_id_fkey";
            columns: ["restaurant_id"];
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_driver_id_fkey";
            columns: ["driver_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };

      // 리뷰 응답 테이블 (점주/배달기사가 리뷰에 답변)
      review_responses: {
        Row: {
          id: string;
          review_id: string;
          responder_id: string; // 점주 또는 배달기사 ID
          responder_type: 'restaurant_owner' | 'driver';
          response_text: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          review_id: string;
          responder_id: string;
          responder_type: 'restaurant_owner' | 'driver';
          response_text: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          review_id?: string;
          responder_id?: string;
          responder_type?: 'restaurant_owner' | 'driver';
          response_text?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "review_responses_review_id_fkey";
            columns: ["review_id"];
            referencedRelation: "reviews";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "review_responses_responder_id_fkey";
            columns: ["responder_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };

      // 리뷰 도움됨 테이블 (사용자가 리뷰에 도움이 됨 표시)
      review_helpful: {
        Row: {
          id: string;
          review_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          review_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          review_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "review_helpful_review_id_fkey";
            columns: ["review_id"];
            referencedRelation: "reviews";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "review_helpful_user_id_fkey";
            columns: ["user_id"];
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
      responder_type: 'restaurant_owner' | 'driver';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
} 