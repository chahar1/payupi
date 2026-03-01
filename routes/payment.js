const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const crypto = require('crypto');

// Create Order API
router.post(['/createOrder', '/create-order', '/api/create-order'], async (req, res) => {
    const { customer_mobile, user_token, amount, order_id, redirect_url, remark1, remark2 } = req.body;

    // 1. Validate User
    const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('user_token', user_token)
        .single();

    if (userError || !user) {
        return res.status(400).json({ status: "FAILED", message: "INVALID_USER_TOKEN" });
    }

    // 2. Check Expiry
    if (new Date() > new Date(user.expiry)) {
        return res.status(400).json({ status: "FAILED", message: "PLAN_EXPIRED_PLEASE_RENEW" });
    }

    // 3. Check Duplicate Order
    const { data: existingOrder } = await supabase
        .from('payments')
        .select('id')
        .eq('trx_id', order_id)
        .single();

    if (existingOrder) {
        return res.status(400).json({ status: "FAILED", message: "ORDER_ID_ALREADY_EXISTS" });
    }

    // 4. Create Payment Link
    const paymentId = crypto.randomBytes(16).toString('hex');
    const method = user.phonepe_connected === 'Yes' ? 'PhonePe' : (user.paytm_connected === 'Yes' ? 'Paytm' : 'None');

    if (method === 'None') {
        return res.status(400).json({ status: "FAILED", message: "MERCHANT_NOT_LINKED" });
    }

    const { error: insertError } = await supabase
        .from('payments')
        .insert([{
            user_id: user.id,
            user_token: user_token,
            payment_id: paymentId,
            trx_id: order_id,
            customer_mobile: customer_mobile,
            created_on: new Date().toISOString(),
            amount: amount,
            status: '0',
            method: method,
            redirect_url: redirect_url,
            remark1: remark1 || 'API_ORDER',
            remark2: remark2 || 'PAYMENT_LINK'
        }]);

    if (insertError) {
        return res.status(500).json({ status: "FAILED", message: "DATABASE_ERROR" });
    }

    // 5. Generate Direct UPI Intent for Mobile Apps
    const { data: merchant } = await supabase.from('merchants').select('*').eq('user_id', user.id).single();
    let upiId = '';
    if (method === 'PhonePe') upiId = merchant.phonepe_upi_id;
    else if (method === 'Paytm') upiId = merchant.paytm_upi_id;
    else if (method === 'BharatPe') upiId = merchant.bharatpe_upi_id;
    else if (method === 'Google Pay' || method === 'Gpay') upiId = merchant.gpay_upi_id;

    // Clean and shorten the transaction reference (max 35 chars for UPI)
    const cleanTr = order_id.replace(/[^a-zA-Z0-9]/g, '').substring(0, 30);
    const upiIntent = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(user.name)}&am=${amount}&tr=${cleanTr}&cu=INR`;

    res.status(201).json({
        status: true,
        message: "Order Created Successfully",
        result: {
            orderId: order_id,
            payment_url: `https://${req.headers.host}/payment/${paymentId}`,
            upi_intent: upiIntent
        }
    });
});

// Check Order API
router.post(['/check-order', '/check-status', '/api/check-status'], async (req, res) => {
    const { user_token, order_id } = req.body;

    const { data: user } = await supabase.from('users').select('id').eq('user_token', user_token).single();
    if (!user) return res.status(400).json({ status: "FAILED", message: "INVALID_USER_TOKEN" });

    const { data: payment } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .eq('trx_id', order_id)
        .single();

    if (payment) {
        return res.status(200).json({
            status: payment.status == '1' ? "COMPLETED" : "PENDING",
            message: "Transaction Details",
            result: {
                txnStatus: payment.status == '1' ? "COMPLETED" : "PENDING",
                resultInfo: payment.status == '1' ? "Transaction Success" : "Transaction Pending",
                orderId: payment.trx_id,
                status: payment.status == '1' ? "SUCCESS" : "FAILED",
                amount: payment.amount,
                date: payment.created_on,
                utr: payment.utr || ""
            }
        });
    } else {
        return res.status(400).json({ status: "FAILED", message: "ORDER_ID_NOT_FOUND" });
    }
});

// Transaction Verification API (Ported from verify/verify.php)
router.post('/verify', async (req, res) => {
    const { trxId } = req.body;
    if (!trxId) return res.status(400).send("TRX_ID_REQUIRED");

    const { data: payment } = await supabase.from('payments').select('*').eq('trx_id', trxId).single();
    if (!payment) return res.status(404).send("NOT_FOUND");
    if (payment.status != '0') return res.send("ALREADY");

    const { data: merchant } = await supabase.from('merchants').select('*').eq('user_id', payment.user_id).single();
    if (!merchant) return res.status(404).send("MERCHANT_NOT_FOUND");

    let result = "PENDING";
    const method = payment.method;

    const fetch = require('node-fetch');

    try {
        if (method === 'Paytm') {
            const mid = merchant.paytm_merchant_id;
            const url = `https://securegw.paytm.in/order/status?JsonData=${encodeURIComponent(JSON.stringify({ MID: mid, ORDERID: trxId }))}`;
            const response = await fetch(url);
            const json = await response.json();

            if (json && json.STATUS === 'TXN_SUCCESS' && parseFloat(json.TXNAMOUNT).toFixed(2) === parseFloat(payment.amount).toFixed(2)) {
                await supabase.from('payments').update({
                    utr: json.BANKTXNID,
                    paid_on: new Date().toISOString(),
                    status: '1'
                }).eq('trx_id', trxId);
                result = "SUCCESS";
            }
        } else if (method === 'PhonePe') {
            const phonepe = require('../lib/phonepe');
            const trxList = await phonepe.fetchTrx(
                merchant.phonepe_token,
                merchant.phonepe_refresh_token,
                merchant.phonepe_device_data, // Assuming we stored this or derived it
                merchant.phonepe_group_value
            );

            const match = trxList.find(t => t.merchantTransactionId === trxId);
            if (match && (match.amount / 100) == payment.amount) {
                await supabase.from('payments').update({
                    utr: match.utr,
                    paid_on: new Date().toISOString(),
                    status: '1'
                }).eq('trx_id', trxId);
                result = "SUCCESS";
            }
        } else if (method === 'BharatPe') {
            const fromDate = new Date().toISOString().split('T')[0];
            const url = `https://payments-tesseract.bharatpe.in/api/v1/merchant/transactions?module=PAYMENT_QR&merchantId=${merchant.bharatpe_merchant_id}&sDate=${fromDate}&eDate=${fromDate}`;
            const response = await fetch(url, {
                headers: {
                    'token': merchant.bharatpe_token,
                    'Cookie': merchant.bharatpe_cookie,
                    'User-Agent': 'Mozilla/5.0'
                }
            });
            const json = await response.json();
            if (json && json.status && json.data.transactions) {
                const match = json.data.transactions.find(t => t.bankReferenceNo === trxId && t.amount == payment.amount && t.status === 'SUCCESS');
                if (match) {
                    await supabase.from('payments').update({
                        utr: match.bankReferenceNo,
                        paid_on: new Date().toISOString(),
                        status: '1'
                    }).eq('trx_id', trxId);
                    result = "SUCCESS";
                }
            }
        }
        // Add other methods (Freecharge, etc) as needed
    } catch (err) {
        console.error("Verification Error:", err);
        return res.status(500).send("ERROR");
    }

    if (result === "SUCCESS") {
        // Trigger Webhook
        const { data: user } = await supabase.from('users').select('callback_url').eq('id', payment.user_id).single();
        if (user && user.callback_url) {
            const { data: updatedPayment } = await supabase.from('payments').select('*').eq('trx_id', trxId).single();
            const { sendWebhook } = require('../lib/utils');
            await sendWebhook(updatedPayment, user.callback_url);
        }
    }

    res.send(result);
});

// Pay Now Page (Full Implementation)
router.get('/payment/:paymentId', async (req, res) => {
    const { paymentId } = req.params;

    const { data: payment, error } = await supabase
        .from('payments')
        .select('*, users(name)')
        .eq('payment_id', paymentId)
        .single();

    if (error || !payment) {
        return res.status(404).send('Payment Not Found');
    }

    if (payment.status == '1') {
        return res.send('Payment Already Done');
    }

    const { data: merchant } = await supabase
        .from('merchants')
        .select('*')
        .eq('user_id', payment.user_id)
        .single();

    let upiId = '';
    const method = payment.method;
    if (method === 'PhonePe') upiId = merchant.phonepe_upi_id;
    else if (method === 'Paytm') upiId = merchant.paytm_upi_id;
    else if (method === 'BharatPe') upiId = merchant.bharatpe_upi_id;
    else if (method === 'Google Pay' || method === 'Gpay') upiId = merchant.gpay_upi_id;
    // ... etc

    res.render('payment/pay_now', { payment, merchant, upiId });
});

// PhonePe Session Refresh Cron
router.get('/cron/phonepe', async (req, res) => {
    const { token } = req.query;
    if (!token) return res.status(400).send("TOKEN_REQUIRED");

    // 1. Find User by Token
    const { data: user } = await supabase.from('users').select('*').eq('user_token', token).single();
    if (!user) return res.status(404).send("INVALID_TOKEN");

    if (user.phonepe_connected !== 'Yes') return res.status(400).send("PHONEPE_NOT_CONNECTED");

    // 2. Get Merchant Details
    const { data: merchant } = await supabase.from('merchants').select('*').eq('user_id', user.id).single();
    if (!merchant) return res.status(404).send("MERCHANT_NOT_FOUND");

    const phonepe = require('../lib/phonepe');

    try {
        const result = await phonepe.updateSession(
            merchant.phonepe_token,
            merchant.phonepe_refresh_token,
            merchant.phonepe_device_data
        );

        if (result.status === 'SUCCESS') {
            await supabase.from('merchants').update({
                phonepe_token: result.token,
                phonepe_refresh_token: result.refresh
            }).eq('user_id', user.id);

            res.send(`SUCCESS: Token Refreshed`);
        } else {
            res.status(401).send(`FAILED: Session Refresh Failed`);
        }
    } catch (err) {
        console.error("Cron Error:", err);
        res.status(500).send("CRON_ERROR");
    }
});

module.exports = router;
