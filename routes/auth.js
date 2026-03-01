const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// Login Page
router.get('/login', (req, res) => {
    if (req.cookies.userId) {
        return res.redirect('/auth/dashboard');
    }
    res.render('auth/login', { error: null });
});

// Login Action
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({
        email: username, // Assuming mobile/email as login
        password: password,
    });

    if (error) {
        console.error('Login Error:', error.message);
        return res.render('auth/login', { error: error.message });
    }

    // Set session/cookie
    res.cookie('userId', data.user.id, { httpOnly: true });
    res.redirect('/auth/dashboard');
});

// Signup Page
router.get('/register', (req, res) => {
    res.render('auth/register', { error: null });
});

// Signup Action
router.post('/register', async (req, res) => {
    const { name, mobile, email, password, company, aadhaar, pan } = req.body;

    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
            data: {
                full_name: name,
                mobile: mobile,
            }
        }
    });

    if (error) {
        return res.render('auth/register', { error: error.message });
    }

    // Create record in public.users table (trigger or manual)
    const userToken = require('crypto').randomBytes(32).toString('hex');
    const { error: dbError } = await supabase
        .from('users')
        .insert([
            {
                id: data.user.id,
                name,
                mobile,
                email,
                company,
                aadhaar,
                pan,
                user_token: userToken,
                role: 'User'
            }
        ]);

    if (dbError) {
        console.error(dbError);
        return res.render('auth/register', { error: 'Database error' });
    }

    // Initialize merchant record
    const { error: merchError } = await supabase
        .from('merchants')
        .insert([{ user_id: data.user.id }]);

    if (merchError) {
        console.error('Merchant init error:', merchError);
    }

    res.redirect('/auth/login');
});

// Logout
router.get('/logout', (req, res) => {
    res.clearCookie('userId');
    res.redirect('/auth/login');
});

module.exports = router;
