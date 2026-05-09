import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zbnnctvggpupdnjmydcu.supabase.co'
const supabaseKey = 'sb_publishable__Uc7k0lfdHFzBjWT-3o36w_ydCDXOT8'
const supabase = createClient(supabaseUrl, supabaseKey)

async function testFetch() {
    const { data, error } = await supabase.from('orders').select('*').limit(5)
    if (error) {
        console.error('Error:', error)
    } else {
        console.log('Data:', JSON.stringify(data, null, 2))
    }
}

testFetch()
