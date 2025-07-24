/*
  # Initial Database Schema

  1. New Tables
    - `clients` - Stores customer information
    - `loans` - Stores loan information
    - `payments` - Stores payment records
    - `receipts` - Stores receipt information
  
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  cpf text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  zip_code text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Loans table
CREATE TABLE IF NOT EXISTS loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id),
  amount decimal NOT NULL,
  interest_rate decimal NOT NULL,
  total_amount decimal NOT NULL,
  installments integer NOT NULL,
  installment_amount decimal NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'completed', 'defaulted')),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid NOT NULL REFERENCES loans(id),
  amount decimal NOT NULL,
  date timestamptz NOT NULL,
  installment_number integer NOT NULL,
  receipt_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Receipts table
CREATE TABLE IF NOT EXISTS receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id),
  loan_id uuid NOT NULL REFERENCES loans(id),
  payment_id uuid NOT NULL,
  amount decimal NOT NULL,
  date timestamptz NOT NULL,
  receipt_number text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add foreign key constraint for receipt_id in payments table
ALTER TABLE payments 
ADD CONSTRAINT payments_receipt_id_fkey 
FOREIGN KEY (receipt_id) REFERENCES receipts(id);

-- Enable Row Level Security
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users to perform CRUD operations
CREATE POLICY "Authenticated users can perform all actions on clients"
ON clients FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can perform all actions on loans"
ON loans FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can perform all actions on payments"
ON payments FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can perform all actions on receipts"
ON receipts FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- Create indices for better performance
CREATE INDEX clients_name_idx ON clients (name);
CREATE INDEX clients_cpf_idx ON clients (cpf);
CREATE INDEX loans_client_id_idx ON loans (client_id);
CREATE INDEX loans_status_idx ON loans (status);
CREATE INDEX payments_loan_id_idx ON payments (loan_id);
CREATE INDEX receipts_client_id_idx ON receipts (client_id);
CREATE INDEX receipts_loan_id_idx ON receipts (loan_id);