import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://zbnnctvggpupdnjmydcu.supabase.co'
const supabaseKey = 'sb_publishable__Uc7k0lfdHFzBjWT-3o36w_ydCDXOT8'
const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
    const { data, error } = await supabase.from('staff_users').select('*')
    if (error) console.error('Error:', error)
    else console.log('Data:', data)
}

test()
