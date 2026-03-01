export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          username: string;
          role: "admin" | "user";
          created_at: string;
        };
        Insert: {
          id?: string;
          username: string;
          role?: "admin" | "user";
          created_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          role?: "admin" | "user";
          created_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          name: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      expenses: {
        Row: {
          id: string;
          user_id: string;
          description: string;
          category_id: string;
          amount: number;
          currency: "HNL" | "USD";
          expense_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          description: string;
          category_id: string;
          amount: number;
          currency?: "HNL" | "USD";
          expense_date: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          description?: string;
          category_id?: string;
          amount?: number;
          currency?: "HNL" | "USD";
          expense_date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "expenses_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
