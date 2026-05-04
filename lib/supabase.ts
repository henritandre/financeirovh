import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vhazhoawfovzhmcwsyhf.supabase.co' //process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = 'sb_publishable_RHXO95k4jKULSV_33DGJnQ_17h7NhSj' //process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)