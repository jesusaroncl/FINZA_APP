import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://kpisgldrdpqspdxieuws.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwaXNnbGRyZHBxc3BkeGlldXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MzM5NDUsImV4cCI6MjA5NDIwOTk0NX0.f-__Ao-wtQ1EAOIpCRaqt1jpazlOb8toWKKywf5W_M8'
)

async function check() {
  const { data, error } = await supabase.from('fixed_expenses').insert([{}]).select()
  console.log("Insert error to infer schema:", error)
}

check()
