const supabase = require('./config/supabase');

async function checkUsers() {
    const { data, error } = await supabase.from('users').select('id, email, user_token');
    if (error) {
        console.error('Error fetching users:', error);
    } else {
        console.log('Users found:', data);
    }
}

checkUsers();
