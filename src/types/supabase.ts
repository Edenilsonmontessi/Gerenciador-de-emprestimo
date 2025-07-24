export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string
          name: string
          email: string
          phone: string
          cpf: string
          address: string
          city: string
          state: string
          zip_code: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          phone: string
          cpf: string
          address: string
          city: string
          state: string
          zip_code: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          phone?: string
          cpf?: string
          address?: string
          city?: string
          state?: string
          zip_code?: string
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      loans: {
        Row: {
          id: string
          client_id: string
          amount: number
          interest_rate: number
          total_amount: number
          installments: number
          installment_amount: number
          due_date: string
          end_date: string
          status: 'active' | 'completed' | 'defaulted'
          notes: string | null
          created_at: string
          payment_type: 'installments' | 'interest_only'
        }
        Insert: {
          id?: string
          client_id: string
          amount: number
          interest_rate: number
          total_amount: number
          installments: number
          installment_amount: number
          due_date: string
          end_date: string
          status: 'active' | 'completed' | 'defaulted'
          notes?: string | null
          created_at?: string
          payment_type: 'installments' | 'interest_only'
        }
        Update: {
          id?: string
          client_id?: string
          amount?: number
          interest_rate?: number
          total_amount?: number
          installments?: number
          installment_amount?: number
          due_date?: string
          end_date?: string
          status?: 'active' | 'completed' | 'defaulted'
          notes?: string | null
          created_at?: string
          payment_type?: 'installments' | 'interest_only'
        }
        Relationships: [
          {
            foreignKeyName: "loans_client_id_fkey"
            columns: ["client_id"]
            referencedRelation: "clients"
            referencedColumns: ["id"]
          }
        ]
      }
      payments: {
        Row: {
          id: string
          loan_id: string
          amount: number
          date: string
          installment_number: number
          receipt_id: string | null
          created_at: string
          type: 'interest_only' | 'full'
        }
        Insert: {
          id?: string
          loan_id: string
          amount: number
          date: string
          installment_number: number
          receipt_id?: string | null
          created_at?: string
          type: 'interest_only' | 'full'
        }
        Update: {
          id?: string
          loan_id?: string
          amount?: number
          date?: string
          installment_number?: number
          receipt_id?: string | null
          created_at?: string
          type?: 'interest_only' | 'full'
        }
        Relationships: [
          {
            foreignKeyName: "payments_loan_id_fkey"
            columns: ["loan_id"]
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_receipt_id_fkey"
            columns: ["receipt_id"]
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          }
        ]
      }
      receipts: {
        Row: {
          id: string
          client_id: string
          loan_id: string
          payment_id: string
          amount: number
          date: string
          due_date: string
          receipt_number: string
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          loan_id: string
          payment_id: string
          amount: number
          date: string
          due_date: string
          receipt_number: string
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          loan_id?: string
          payment_id?: string
          amount?: number
          date?: string
          due_date?: string
          receipt_number?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipts_client_id_fkey"
            columns: ["client_id"]
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_loan_id_fkey"
            columns: ["loan_id"]
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_payment_id_fkey"
            columns: ["payment_id"]
            referencedRelation: "payments"
            referencedColumns: ["id"]
          }
        ]
      }
      pix_keys: {
        Row: {
          id: string
          bank: string
          owner: string
          type: string
          value: string
          instructions: string
        }
        Insert: {
          id?: string
          bank: string
          owner: string
          type: string
          value: string
          instructions: string
        }
        Update: {
          id?: string
          bank?: string
          owner?: string
          type?: string
          value?: string
          instructions?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}