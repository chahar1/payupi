const supabase = require('./config/supabase');
async function run() {
    try {
        const { count: u, error: eu } = await supabase.from('users').select('*', { count: 'exact', head: true });
        const { count: m, error: em } = await supabase.from('merchants').select('*', { count: 'exact', head: true });
        const { count: p, error: ep } = await supabase.from('payments').select('*', { count: 'exact', head: true });
        console.log('Counts:', { users: u, merchants: m, payments: p });
        if (eu || em || ep) console.log('Errors:', { eu, em, ep });
    } catch (e) {
        console.error('Fatal:', e);
    }
}
run();
