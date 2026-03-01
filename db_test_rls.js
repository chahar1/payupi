const supabase = require('./config/supabase');
async function run() {
    const { data: u, error } = await supabase.from('users').select('*').eq('id', 'b67e4186-48f4-4e62-a932-09240b2e6aac').single();
    if (error) {
        console.log('Supabase Error:', error.message);
    } else if (!u) {
        console.log('No user found (likely RLS blockage if ID exists)');
    } else {
        console.log('User found:', u.id, u.email);
    }
}
run();
