const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.REACT_APP_SUPABASE_URL, process.env.REACT_APP_ANON_KEY)

module.exports = supabase;