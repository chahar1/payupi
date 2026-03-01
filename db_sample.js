const supabase = require('./config/supabase');
async function run() {
    const { data: p } = await supabase.from('payments').select('id, user_id, user_token, trx_id').limit(5);
    console.log('Payments sample:', p);
}
run();
