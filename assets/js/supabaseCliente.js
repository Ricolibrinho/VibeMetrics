// assets/js/supabaseClient.js
const SUPABASE_URL = "https://psryntzjdguzcvxmpsod.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzcnludHpqZGd1emN2eG1wc29kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NDE1MDEsImV4cCI6MjA4NDMxNzUwMX0.ODe3tVTDPdCyqqupstP68GGFYZOyu1foxlRnRJQ6pVk";

window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: localStorage,
  },
});

// Para debug e para evitar hardcode em outros lugares
window.__SUPABASE_URL__ = SUPABASE_URL;
window.__SUPABASE_ANON__ = SUPABASE_ANON_KEY;



/// https://psryntzjdguzcvxmpsod.supabase.co
/// sb_publishable_a3tL4VVEC7hMSI_TzdfB_A_OHrVjHfZ