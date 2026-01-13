import { createClient } from '@supabase/supabase-js'

// GitHub Pages 배포용 - 환경변수가 없으면 직접 값 사용
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://khwzdwewgadvpglptvua.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtod3pkd2V3Z2FkdnBnbHB0dnVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNDIxODAsImV4cCI6MjA4MzgxODE4MH0.EiDPa3pJuEDNzfM-mho7PZ0NR83MGAH2XPf1lvP-9l4'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
