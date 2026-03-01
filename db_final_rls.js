const supabase = require('./config/supabase');
async function run() {
    const { data: u, error: eu } = await supabase.from('users').select('id');
    const { data: p, error: ep } = await supabase.from('payments').select('id');
    console.log('Users found:', u ? u.length : 0);
    console.log('Payments found:', p ? p.length : 0);
    if (eu) console.log('User Error:', eu.message);
}
run();
