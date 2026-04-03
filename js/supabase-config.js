/**
 * supabase-config.js
 * Centralized Supabase initialization to avoid multiple GoTrue instances.
 */

const SUPABASE_URL = 'https://lmtjqneyfebhnzvgdwui.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtdGpxbmV5ZmViaG56dmdkd3VpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNDkzNzEsImV4cCI6MjA4OTYyNTM3MX0._gemg7d30T3uFDXRJ2We9itBFncioGkQ93rQElqU2lM';

// Singleton pattern for Supabase client
if (window.supabase && !window.supabaseClient) {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('[Supabase] Client initialized successfully.');
} else if (!window.supabase) {
    console.error('[Supabase] SDK not found. Please ensure the Supabase library is loaded before this script.');
}
