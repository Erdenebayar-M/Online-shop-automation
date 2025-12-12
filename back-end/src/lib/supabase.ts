import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_KEY!;
if (!url || !key) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set");
}

export const supabaseAdmin = createClient(url, key, {
  auth: { persistSession: false },
});
