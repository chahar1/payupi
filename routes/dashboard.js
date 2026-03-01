const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// Middleware to check authentication
const isAuth = async (req, res, next) => {
    if (req.cookies.userId) {
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', req.cookies.userId)
            .single();

        if (error || !user) {
            res.clearCookie('userId');
            return res.redirect('/auth/login');
        }

        res.locals.user = user;
        next();
    } else {
        res.redirect('/auth/login');
    }
};

router.get('/dashboard', isAuth, async (req, res) => {
    const userId = req.cookies.userId;

    // 1. Fetch User Data
    const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

    if (userError || !userData) {
        return res.redirect('/auth/logout');
    }

    // 2. Fetch Payments for Today
    const today = new Date().toISOString().split('T')[0];
    const { data: payments, error: payError } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', userId)
        .gte('created_on', today + 'T00:00:00')
        .lte('created_on', today + 'T23:59:59');

    let totalSuccessAmount = 0;
    let totalPendingAmount = 0;
    let totalPaymentsCount = 0;

    if (payments) {
        totalPaymentsCount = payments.length;
        payments.forEach(p => {
            if (p.status == '1' || p.status == 1) {
                totalSuccessAmount += parseFloat(p.amount || 0);
            } else {
                totalPendingAmount += parseFloat(p.amount || 0);
            }
        });
    }

    // 3. Expiry Status
    const expiry = new Date(userData.expiry);
    const isActive = expiry > new Date() ? 'Active' : 'Inactive';

    // 4. Fetch Last 7 Days Analytics
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: analyticsData } = await supabase
        .from('payments')
        .select('amount, created_on')
        .eq('user_id', userId)
        .eq('status', '1')
        .gte('created_on', sevenDaysAgo.toISOString());

    // Process analytics data for Chart.js
    const last7Days = [];
    const chartValues = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        last7Days.push(d.toLocaleDateString('en-US', { weekday: 'short' }));

        const dayStart = new Date(d).setHours(0, 0, 0, 0);
        const dayEnd = new Date(d).setHours(23, 59, 59, 999);

        const dayTotal = analyticsData ? analyticsData.reduce((acc, p) => {
            const pDate = new Date(p.created_on).getTime();
            if (pDate >= dayStart && pDate <= dayEnd) return acc + parseFloat(p.amount || 0);
            return acc;
        }, 0) : 0;

        chartValues.push(dayTotal);
    }

    res.render('auth/dashboard', {
        totalSuccessAmount,
        totalPendingAmount,
        totalPaymentsCount,
        isActive,
        expiry: res.locals.user.expiry,
        currentPage: 'dashboard',
        analyticsLabels: JSON.stringify(last7Days),
        analyticsData: JSON.stringify(chartValues),
        user: userData
    });
});

const merchantConfigs = {
    "phonepe_connected": {
        "nameDisplay": "Phonepe",
        "number": "phonepe_number",
        "connectedOn": "phonepe_connected_on",
        "status": "is_phonepe_active",
        "verifyAction": "phonepe",
        "verifyField": "phonepe_mobile",
        "deleteCol": "phonepe_connected",
        "deactivateCol": "is_phonepe_active"
    },
    "paytm_connected": {
        "nameDisplay": "Paytm",
        "number": "paytm_number",
        "connectedOn": "paytm_connected_on",
        "status": "is_paytm_active",
        "verifyAction": "paytm",
        "verifyField": "paytm_mobile",
        "deleteCol": "paytm_connected",
        "deactivateCol": "is_paytm_active"
    },
    "bharatpe_connected": {
        "nameDisplay": "Bharatpe",
        "number": "bharatpe_number",
        "connectedOn": "bharatpe_connected_on",
        "status": "is_bharatpe_active",
        "verifyAction": "bharatpe",
        "verifyField": "bharatpe_mobile",
        "deleteCol": "bharatpe_connected",
        "deactivateCol": "is_bharatpe_active"
    },
    "freecharge_connected": {
        "nameDisplay": "Freecharge",
        "number": "freecharge_number",
        "connectedOn": "freecharge_connected_on",
        "status": "is_freecharge_active",
        "verifyAction": "freecharge",
        "verifyField": "freecharge_mobile",
        "deleteCol": "freecharge_connected",
        "deactivateCol": "is_freecharge_active"
    },
    "gpay_connected": {
        "nameDisplay": "Google Pay",
        "number": "gpay_number",
        "connectedOn": "gpay_connected_on",
        "status": "is_gpay_active",
        "verifyAction": "gpay",
        "verifyField": "googlepay_mobile",
        "deleteCol": "gpay_connected",
        "deactivateCol": "is_gpay_active"
    },
    "sbi_connected": {
        "nameDisplay": "SBI",
        "number": "sbi_number",
        "connectedOn": "sbi_connected_on",
        "status": "is_sbi_active",
        "verifyAction": "sbi",
        "verifyField": "sbi_mobile",
        "deleteCol": "sbi_connected",
        "deactivateCol": "is_sbi_active"
    },
    "hdfc_connected": {
        "nameDisplay": "HDFC",
        "number": "hdfc_number",
        "connectedOn": "hdfc_connected_on",
        "status": "is_hdfc_active",
        "verifyAction": "hdfc",
        "verifyField": "hdfc_mobile",
        "deleteCol": "hdfc_connected",
        "deactivateCol": "is_hdfc_active"
    },
    "amazon_connected": {
        "nameDisplay": "Amazon Pay",
        "number": "amazon_number",
        "connectedOn": "amazon_connected_on",
        "status": "is_amazon_active",
        "verifyAction": "amazon",
        "verifyField": "amazon_mobile",
        "deleteCol": "amazon_connected",
        "deactivateCol": "is_amazon_active"
    },
    "mobikwik_connected": {
        "nameDisplay": "Mobikwik",
        "number": "mobikwik_number",
        "connectedOn": "mobikwik_connected_on",
        "status": "is_mobikwik_active",
        "verifyAction": "mobikwik",
        "verifyField": "mobikwik_mobile",
        "deleteCol": "mobikwik_connected",
        "deactivateCol": "is_mobikwik_active"
    }
};

router.get('/connect_merchant', isAuth, async (req, res) => {
    const userId = req.cookies.userId;

    const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

    const { data: merchant, error: merchantError } = await supabase
        .from('merchants')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (userError || !user) {
        return res.redirect('/auth/logout');
    }

    res.render('auth/connect_merchant', {
        merchant,
        merchantConfigs,
        host: req.get('host'),
        currentPage: 'connect_merchant'
    });
});

router.post('/connect_merchant', isAuth, async (req, res) => {
    const userId = req.cookies.userId;
    const { merchant_name, mobile, action } = req.body;

    if (action === 'add' && merchantConfigs[merchant_name]) {
        const config = merchantConfigs[merchant_name];
        const updateData = {};
        updateData[merchant_name] = 'Yes';

        const merchData = {
            user_id: userId,
            [config.connectedOn]: new Date().toISOString(),
            [config.status]: 'Deactive',
            [config.number]: mobile
        };

        await supabase.from('users').update(updateData).eq('id', userId);
        await supabase.from('merchants').upsert(merchData, { onConflict: 'user_id' });
    } else if (action === 'delete') {
        const { colName, deactivateCol } = req.body;
        const updateData = {};
        updateData[colName] = 'No';

        const merchData = {};
        merchData[deactivateCol] = '';

        await supabase.from('users').update(updateData).eq('id', userId);
        await supabase.from('merchants').update(merchData).eq('user_id', userId);
    }

    res.redirect('/auth/connect_merchant');
});

// Profile Page
router.get('/profile', isAuth, async (req, res) => {
    const userId = req.cookies.userId;
    const { data: user, error } = await supabase.from('users').select('*').eq('id', userId).single();
    if (error || !user) return res.redirect('/auth/logout');
    res.render('auth/profile', { currentPage: 'profile' });
});

router.post('/profile', isAuth, async (req, res) => {
    const userId = req.cookies.userId;
    const { name, email, company, location } = req.body;
    await supabase.from('users').update({ name, email, company, location }).eq('id', userId);
    res.redirect('/auth/profile');
});

// Subscription Page
router.get('/subscription', isAuth, async (req, res) => {
    const { data: plans } = await supabase.from('plan').select('*');
    res.render('auth/subscription', { plans, currentPage: 'subscription' });
});

// Transactions Page
router.get('/transactions', isAuth, async (req, res) => {
    const userId = req.cookies.userId;
    const { search } = req.query;

    let query = supabase.from('payments').select('*').eq('user_id', userId).order('id', { ascending: false });

    if (search) {
        query = query.or(`customer_mobile.ilike.%${search}%,method.ilike.%${search}%,utr.ilike.%${search}%`);
    }

    const { data: payments } = await query;
    res.render('auth/transactions', { payments, search, currentPage: 'transactions' });
});

// API Details Page
router.get('/apidetails', isAuth, async (req, res) => {
    res.render('auth/apidetails', { host: req.get('host'), currentPage: 'apidetails' });
});

router.post('/apidetails', isAuth, async (req, res) => {
    const userId = req.cookies.userId;
    const { action, webhook_url } = req.body;

    if (action === 'generate_token') {
        const token = require('crypto').randomBytes(32).toString('hex');
        await supabase.from('users').update({ user_token: token }).eq('id', userId);
    } else if (action === 'update_webhook') {
        await supabase.from('users').update({ callback_url: webhook_url }).eq('id', userId);
    }
    res.redirect('/auth/apidetails');
});

// Docs Page
router.get('/docs', isAuth, async (req, res) => {
    res.render('auth/docs', { host: req.get('host'), currentPage: 'docs' });
});

// Sample Code Page
router.get('/sample_code', isAuth, async (req, res) => {
    res.render('auth/sample_code', { host: req.get('host'), currentPage: 'sample_code' });
});

// Payment Link Page
router.get('/payment_link', isAuth, async (req, res) => {
    const userId = req.cookies.userId;
    const { data: user } = await supabase.from('users').select('*').eq('id', userId).single();
    const { data: payments } = await supabase.from('payments')
        .select('*')
        .eq('user_id', userId)
        .order('id', { ascending: false });

    res.render('auth/payment_link', { user, payments, currentPage: 'payment_link', paymentlink: null });
});

router.post('/payment_link', isAuth, async (req, res) => {
    const userId = req.cookies.userId;
    const { name, amount, mobile, remark } = req.body;
    const { data: user } = await supabase.from('users').select('*').eq('id', userId).single();

    const orderId = "TXN" + Math.floor(Math.random() * 90000000000 + 10000000000);
    const paymentId = require('crypto').randomBytes(16).toString('hex');

    // Choose a default method from connected gateways
    let method = 'None';
    if (user.phonepe_connected === 'Yes') method = 'PhonePe';
    else if (user.paytm_connected === 'Yes') method = 'Paytm';
    else if (user.bharatpe_connected === 'Yes') method = 'BharatPe';
    else if (user.gpay_connected === 'Yes') method = 'Google Pay';
    else if (user.sbi_connected === 'Yes') method = 'SBI';
    else if (user.hdfc_connected === 'Yes') method = 'HDFC';
    else if (user.amazon_connected === 'Yes') method = 'Amazon Pay';
    else if (user.mobikwik_connected === 'Yes') method = 'Mobikwik';
    else if (user.freecharge_connected === 'Yes') method = 'Freecharge';

    await supabase.from('payments').insert([{
        user_id: userId,
        user_token: user.user_token,
        amount: amount,
        trx_id: orderId,
        payment_id: paymentId,
        customer_mobile: mobile,
        method: method,
        remark1: remark || 'PAYMENT_LINK',
        remark2: 'PAYMENT_LINK',
        status: '0',
        created_on: new Date().toISOString()
    }]);

    const paymentlink = `https://${req.get('host')}/payment/${paymentId}`;

    const { data: payments } = await supabase.from('payments')
        .select('*')
        .eq('user_id', userId)
        .order('id', { ascending: false });

    res.render('auth/payment_link', { payments, currentPage: 'payment_link', paymentlink });
});

// Admin: Merchant List
router.get('/merchant_list', isAuth, async (req, res) => {
    const { search } = req.query;
    let query = supabase.from('users').select('*').order('id', { ascending: false });
    if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,mobile.ilike.%${search}%,company.ilike.%${search}%`);
    }
    const { data: merchants } = await query;
    res.render('auth/merchant_list', { merchants, search, currentPage: 'merchant_list' });
});

// Admin: Add User
router.get('/add_user', isAuth, (req, res) => {
    res.render('auth/add_user', { error: null, currentPage: 'merchant_list' });
});

router.post('/add_user', isAuth, async (req, res) => {
    const { name, mobile, email, password, role, company, aadhaar, pan, location } = req.body;

    // Check if user exists in auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name, mobile } }
    });

    if (authError) return res.render('auth/add_user', { error: authError.message, currentPage: 'merchant_list' });

    const userToken = require('crypto').randomBytes(32).toString('hex');
    const today = new Date();
    today.setDate(today.getDate() + 1);

    await supabase.from('users').insert([{
        id: authData.user.id,
        name, mobile, email, role, company, aadhaar, pan, location,
        user_token: userToken,
        expiry: today.toISOString().split('T')[0]
    }]);

    await supabase.from('merchants').insert([{ user_id: authData.user.id }]);
    res.redirect('/auth/merchant_list');
});

// Admin: Edit User
router.get('/edituser', isAuth, async (req, res) => {
    const { mobile } = req.query;
    const { data: editingUser } = await supabase.from('users').select('*').eq('mobile', mobile).single();
    res.render('auth/edituser', { editingUser, currentPage: 'merchant_list' });
});

router.post('/edituser', isAuth, async (req, res) => {
    const { id, name, mobile, email, company, pin, pan, aadhaar, expiry, location } = req.body;
    await supabase.from('users').update({ name, mobile, email, company, pin, pan, aadhaar, expiry, location }).eq('id', id);
    res.redirect('/auth/merchant_list');
});

// Admin: Manage Subscription
router.get('/manage_subscription', isAuth, async (req, res) => {
    const { add, srno, delete: deleteId } = req.query;

    if (deleteId) {
        await supabase.from('plan').delete().eq('id', deleteId);
        return res.redirect('/auth/manage_subscription');
    }

    const { data: plans } = await supabase.from('plan').select('*').order('id', { ascending: true });
    let editPlan = null;
    if (srno) {
        editPlan = plans.find(p => p.id == srno);
    }

    res.render('auth/manage_subscription', { plans, editPlan, add: !!add, currentPage: 'manage_subscription' });
});

router.post('/manage_subscription', isAuth, async (req, res) => {
    const { action, srno, plan_name, amount, expiry, features } = req.body;

    if (action === 'add') {
        await supabase.from('plan').insert([{ plan_name, amount, expiry, features, status: 'active' }]);
    } else if (action === 'update') {
        await supabase.from('plan').update({ plan_name, amount, expiry, features }).eq('id', srno);
    }
    res.redirect('/auth/manage_subscription');
});

// Admin: Site Settings
router.get('/sitesetting', isAuth, async (req, res) => {
    const { data: settings } = await supabase.from('site_settings').select('*').eq('id', 1).single();
    res.render('auth/sitesetting', { settings, currentPage: 'sitesetting' });
});

router.post('/sitesetting', isAuth, async (req, res) => {
    const { brand_name, logo_url, site_link, whatsapp_number, copyright_text } = req.body;
    await supabase.from('site_settings').update({ brand_name, logo_url, site_link, whatsapp_number, copyright_text }).eq('id', 1);
    res.redirect('/auth/sitesetting');
});

// Admin: Email API Settings
router.get('/add_api', isAuth, async (req, res) => {
    const { data: mail } = await supabase.from('mail').select('*').single();
    res.render('auth/add_api', { mail, currentPage: 'add_api' });
});

router.post('/add_api', isAuth, async (req, res) => {
    const { host, port, sender_email, pass, sender_name } = req.body;
    await supabase.from('mail').update({ host, port, sender_email, pass, sender_name }).eq('id', 1);
    res.redirect('/auth/add_api');
});

// Merchant Link: PhonePe
router.get('/phonepe', isAuth, async (req, res) => {
    const { data: merchant } = await supabase.from('merchants').select('*').eq('user_id', req.cookies.userId).single();
    if (merchant && merchant.is_phonepe_active === 'Active') {
        return res.render('auth/phonepe', { alreadyActive: true, currentPage: 'connect_merchant', merchant });
    }
    res.render('auth/phonepe', { alreadyActive: false, currentPage: 'connect_merchant', error: null, merchant });
});

router.post('/phonepe', isAuth, async (req, res) => {
    const { phonepe_mobile } = req.body;
    const phonepe = require('../lib/phonepe');
    const result = await phonepe.sendOtp(phonepe_mobile);

    if (result.status === 'SUCCESS') {
        res.render('auth/phonepe_otp', {
            number: phonepe_mobile,
            token: result.token,
            device: result.device,
            currentPage: 'connect_merchant'
        });
    } else {
        res.render('auth/phonepe', {
            alreadyActive: false,
            currentPage: 'connect_merchant',
            error: 'Failed to send OTP. Please try again.'
        });
    }
});

router.post('/phonepe_verify', isAuth, async (req, res) => {
    const { otp, upi, number, token, device } = req.body;
    const phonepe = require('../lib/phonepe');
    const result = await phonepe.verifyOtp(number, otp, token, device);

    if (result.status === 'SUCCESS') {
        const config = merchantConfigs['phonepe_connected'];
        await supabase.from('merchants').upsert({
            user_id: req.cookies.userId,
            phonepe_upi_id: upi,
            phonepe_token: result.token,
            phonepe_refresh_token: result.refreshToken,
            phonepe_device_data: device,
            phonepe_group_id: result.groupId,
            phonepe_group_value: result.groupValue,
            phonepe_number: number,
            [config.connectedOn]: new Date().toISOString(),
            is_phonepe_active: 'Active'
        }, { onConflict: 'user_id' });

        await supabase.from('users').update({ phonepe_connected: 'Yes' }).eq('id', req.cookies.userId);
        res.redirect('/auth/connect_merchant');
    } else {
        res.render('auth/phonepe', {
            alreadyActive: false,
            currentPage: 'connect_merchant',
            error: 'Invalid OTP or verification failed.'
        });
    }
});

// Merchant Link: Paytm
router.get('/paytm', isAuth, async (req, res) => {
    const { data: merchant } = await supabase.from('merchants').select('*').eq('user_id', req.cookies.userId).single();
    res.render('auth/paytm', { merchant, currentPage: 'connect_merchant', error: null });
});

router.post('/paytm', isAuth, async (req, res) => {
    const { MID, UPI, number } = req.body;
    const config = merchantConfigs['paytm_connected'];

    await supabase.from('merchants').upsert({
        user_id: req.cookies.userId,
        paytm_merchant_id: MID,
        paytm_upi_id: UPI,
        paytm_number: number,
        [config.connectedOn]: new Date().toISOString(),
        is_paytm_active: 'Active'
    }, { onConflict: 'user_id' });

    await supabase.from('users').update({ paytm_connected: 'Yes' }).eq('id', req.cookies.userId);
    res.redirect('/auth/connect_merchant');
});

// Merchant Link: BharatPe
router.get('/bharatpe', isAuth, async (req, res) => {
    const { data: merchant } = await supabase.from('merchants').select('*').eq('user_id', req.cookies.userId).single();
    res.render('auth/bharatpe', { merchant, currentPage: 'connect_merchant', error: null });
});

router.post('/bharatpe', isAuth, async (req, res) => {
    const { MID, upiid, token, cookie, number } = req.body;
    const config = merchantConfigs['bharatpe_connected'];

    await supabase.from('merchants').upsert({
        user_id: req.cookies.userId,
        bharatpe_upi_id: upiid,
        bharatpe_merchant_id: MID,
        bharatpe_token: token,
        bharatpe_cookie: cookie,
        bharatpe_number: number,
        [config.connectedOn]: new Date().toISOString(),
        is_bharatpe_active: 'Active'
    }, { onConflict: 'user_id' });

    await supabase.from('users').update({ bharatpe_connected: 'Yes' }).eq('id', req.cookies.userId);
    res.redirect('/auth/connect_merchant');
});

// Merchant Link: Freecharge
router.get('/freecharge', isAuth, async (req, res) => {
    const { data: merchant } = await supabase.from('merchants').select('*').eq('user_id', req.cookies.userId).single();
    res.render('auth/freecharge', { merchant, currentPage: 'connect_merchant', error: null });
});

router.post('/freecharge', isAuth, async (req, res) => {
    const { MID, UPI, Number } = req.body;
    const config = merchantConfigs['freecharge_connected'];

    await supabase.from('merchants').upsert({
        user_id: req.cookies.userId,
        freecharge_upi_id: UPI,
        freecharge_app_fc: MID,
        freecharge_number: Number,
        [config.connectedOn]: new Date().toISOString(),
        is_freecharge_active: 'Active'
    }, { onConflict: 'user_id' });

    await supabase.from('users').update({ freecharge_connected: 'Yes' }).eq('id', req.cookies.userId);
    res.redirect('/auth/connect_merchant');
});

// Merchant Link: Google Pay
router.get('/gpay', isAuth, async (req, res) => {
    const { data: merchant } = await supabase.from('merchants').select('*').eq('user_id', req.cookies.userId).single();
    res.render('auth/gpay', { merchant, currentPage: 'connect_merchant', error: null });
});

router.post('/gpay', isAuth, async (req, res) => {
    const { UPI, number } = req.body;
    const config = merchantConfigs['gpay_connected'];

    await supabase.from('merchants').upsert({
        user_id: req.cookies.userId,
        gpay_upi_id: UPI,
        gpay_number: number,
        [config.connectedOn]: new Date().toISOString(),
        is_gpay_active: 'Active'
    }, { onConflict: 'user_id' });

    await supabase.from('users').update({ gpay_connected: 'Yes' }).eq('id', req.cookies.userId);
    res.redirect('/auth/connect_merchant');
});

// Merchant Link: SBI
router.get('/sbi', isAuth, async (req, res) => {
    const { data: merchant } = await supabase.from('merchants').select('*').eq('user_id', req.cookies.userId).single();
    res.render('auth/sbi', { merchant, currentPage: 'connect_merchant', error: null });
});

router.post('/sbi', isAuth, async (req, res) => {
    const { merchant_username, password, sbi_number } = req.body;
    const config = merchantConfigs['sbi_connected'];
    // For now, we'll simulate the hitachi payments connection or implement logic later
    const upi = `SBIPMOPAD.SIMULATED-TID@SBIPAY`;

    await supabase.from('merchants').upsert({
        user_id: req.cookies.userId,
        sbi_upi_id: upi,
        sbi_merchant_id: merchant_username,
        sbi_number: sbi_number,
        [config.connectedOn]: new Date().toISOString(),
        is_sbi_active: 'Active'
    }, { onConflict: 'user_id' });

    await supabase.from('users').update({ sbi_connected: 'Yes' }).eq('id', req.cookies.userId);
    res.redirect('/auth/connect_merchant');
});

// Merchant Link: HDFC
router.get('/hdfc', isAuth, async (req, res) => {
    const { data: merchant } = await supabase.from('merchants').select('*').eq('user_id', req.cookies.userId).single();
    res.render('auth/hdfc', { merchant, currentPage: 'connect_merchant', error: null });
});

router.post('/hdfc', isAuth, async (req, res) => {
    const { OTP, PIN, number, upi } = req.body;
    const config = merchantConfigs['hdfc_connected'];
    // Simulate HDFC connection
    const finalUpi = upi || 'merchant@hdfcbank';

    await supabase.from('merchants').upsert({
        user_id: req.cookies.userId,
        hdfc_upi_id: finalUpi,
        hdfc_number: number,
        [config.connectedOn]: new Date().toISOString(),
        is_hdfc_active: 'Active'
    }, { onConflict: 'user_id' });

    await supabase.from('users').update({ hdfc_connected: 'Yes' }).eq('id', req.cookies.userId);
    res.redirect('/auth/connect_merchant');
});

// Merchant Link: Amazon Pay
router.get('/amazon', isAuth, async (req, res) => {
    const { data: merchant } = await supabase.from('merchants').select('*').eq('user_id', req.cookies.userId).single();
    res.render('auth/amazon', { merchant, currentPage: 'connect_merchant', error: null });
});

router.post('/amazon', isAuth, async (req, res) => {
    const { upi, cookie, number } = req.body;
    const config = merchantConfigs['amazon_connected'];

    await supabase.from('merchants').upsert({
        user_id: req.cookies.userId,
        amazon_upi_id: upi,
        amazon_cookie: cookie,
        amazon_number: number,
        [config.connectedOn]: new Date().toISOString(),
        is_amazon_active: 'Active'
    }, { onConflict: 'user_id' });

    await supabase.from('users').update({ amazon_connected: 'Yes' }).eq('id', req.cookies.userId);
    res.redirect('/auth/connect_merchant');
});

// Merchant Link: Mobikwik
router.get('/mobikwik', isAuth, async (req, res) => {
    const { data: merchant } = await supabase.from('merchants').select('*').eq('user_id', req.cookies.userId).single();
    res.render('auth/mobikwik', { merchant, currentPage: 'connect_merchant', error: null });
});

router.post('/mobikwik', isAuth, async (req, res) => {
    const { auth, UPI, number } = req.body;
    const config = merchantConfigs['mobikwik_connected'];

    await supabase.from('merchants').upsert({
        user_id: req.cookies.userId,
        mobikwik_upi_id: UPI,
        mobikwik_token: auth,
        mobikwik_number: number,
        [config.connectedOn]: new Date().toISOString(),
        is_mobikwik_active: 'Active'
    }, { onConflict: 'user_id' });

    await supabase.from('users').update({ mobikwik_connected: 'Yes' }).eq('id', req.cookies.userId);
    res.redirect('/auth/connect_merchant');
});

module.exports = router;
