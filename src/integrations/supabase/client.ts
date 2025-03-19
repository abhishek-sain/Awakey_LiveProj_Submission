
// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { getCurrentSchema } from '@/utils/schemaUtils';

const SUPABASE_URL = "https://qvrbjaflrpunkkrdyioc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2cmJqYWZscnB1bmtrcmR5aW9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDExNzMwOTIsImV4cCI6MjA1Njc0OTA5Mn0.fCt7qaX8E9c0uWrfZZf9sQgBFTc_alHlOtWxjh7HNv8";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

// Get the current schema from local storage
const schema = getCurrentSchema();

// The schema property in the Supabase configuration must be 'public', but we can use
// headers to request a specific schema for the PostgreSQL REST API
// This is a workaround for the limitation that 'db.schema' can only be set to 'public'
const safeSchema = ['public', 'dev', 'dev2'].includes(schema) ? schema : 'public';

// Log schema info for debugging
console.log(`Initializing Supabase client with schema: ${safeSchema}`);

// Create the Supabase client with the schema configuration
export const supabase = createClient<Database>(
  SUPABASE_URL, 
  SUPABASE_PUBLISHABLE_KEY,
  {
    db: {
      schema: 'public' // Must be 'public' for the client to work properly
    },
    global: {
      headers: {
        // Use PostgreSQL's ability to set the search_path for a session
        'x-schema-name': safeSchema,
        'X-Postgres-Features': 'multiSchema'
      }
    },
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
);

// Add some error detection on the client
supabase.from('profiles').select('id').limit(1).then(({ error }) => {
  if (error) {
    console.error("Schema access error detected on client initialization:", error);
    
    // If there's a schema error, record the issue
    if (schema !== 'public') {
      localStorage.setItem('schema_access_error', 'true');
      console.log('Schema access error has been recorded in localStorage');
    }
  } else {
    // Clear any previous schema error if this query succeeds
    localStorage.removeItem('schema_access_error');
    console.log('Schema connection validated successfully');
  }
});
