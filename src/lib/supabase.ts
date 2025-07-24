import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://vdkbwhmsigcsxovsxbuj.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZka2J3aG1zaWdjc3hvdnN4YnVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4NDM5ODUsImV4cCI6MjA2NDQxOTk4NX0.GEseFFc6H9MGfOuFS_gCbfUpOIpDFb2NNx_WzoSG4aU";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);