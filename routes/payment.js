const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const crypto = require('crypto');

// Create Order API
router.post(['/createOrder', '/create-order', '/api/create-order'], async (req, res) => {
    const customer_mobile = req.body.customer_mobile || req.query.customer_mobile;
    const user_token = req.body.user_token || req.query.user_token || req.body.token || req.query.token;
    const amount = req.body.amount || req.query.amount;
    const order_id = req.body.order_id || req.query.order_id || req.body.orderId || req.query.orderId;
    const redirect_url = req.body.redirect_url || req.query.redirect_url;
    const remark1 = req.body.remark1 || req.query.remark1;
    const remark2 = req.body.remark2 || req.query.remark2;

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

    // 3. Generate Dashboard-Style Safe ID (TXN + 11 digits)
    const safeTrxId = "TXN" + Math.floor(Math.random() * 90000000000 + 10000000000);

    // 4. Check Duplicate Order (Idempotency check using original order_id in remark2)
    const { data: existingOrder } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .eq('remark2', order_id)
        .single();

    if (existingOrder) {
        if (existingOrder.status === '1') {
            return res.status(400).json({ status: "FAILED", message: "ORDER_ID_ALREADY_EXISTS" });
        }

        // Return existing pending order details
        const { data: merchant } = await supabase.from('merchants').select('*').eq('user_id', user.id).single();
        let upiId = '';
        const method = existingOrder.method;
        if (method === 'PhonePe') upiId = merchant.phonepe_upi_id;
        else if (method === 'Paytm') upiId = merchant.paytm_upi_id;
        else if (method === 'BharatPe') upiId = merchant.bharatpe_upi_id;
        else if (method === 'Google Pay' || method === 'Gpay') upiId = merchant.gpay_upi_id;

        const upiIntent = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(user.name)}&am=${existingOrder.amount}&tn=${encodeURIComponent(existingOrder.trx_id)}&tr=${existingOrder.trx_id}&mc=4722&cu=INR&mode=02&purpose=00`;
        const paytmIntent = `paytmmp://cash_wallet?pa=${upiId}&pn=${encodeURIComponent(user.name)}&am=${existingOrder.amount}&cu=INR&tn=${encodeURIComponent(existingOrder.trx_id)}&tr=${existingOrder.trx_id}&mc=4722&mode=02&purpose=00&&sign=AAuN7izDWN5cb8A5scnUiNME+LkZqI2DWgkXlN1McoP6WZABa/KkFTiLvuPRP6/nWK8BPg/rPhb+u4QMrUEX10UsANTDbJaALcSM9b8Wk218X+55T/zOzb7xoiB+BcX8yYuYayELImXJHIgL/c7nkAnHrwUCmbM97nRbCVVRvU0ku3Tr&featuretype=money_transfer`;
        const phonepeIntent = `phonepe://pay?pa=${upiId}&pn=${encodeURIComponent(user.name)}&am=${existingOrder.amount}&tn=${encodeURIComponent(existingOrder.trx_id)}&tr=${existingOrder.trx_id}&mc=4722&cu=INR&mode=02&purpose=00`;

        return res.status(200).json({
            status: true,
            message: "Order already exists. Returning existing details.",
            result: {
                orderId: order_id,
                payment_url: `https://${req.headers.host}/payment/${existingOrder.payment_id}`,
                upi_intent: upiIntent,
                paytm_intent: paytmIntent,
                phonepe_intent: phonepeIntent
            }
        });
    }

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
            trx_id: safeTrxId,
            customer_mobile: customer_mobile,
            created_on: new Date().toISOString(),
            amount: amount,
            status: '0',
            method: method,
            redirect_url: redirect_url,
            remark1: remark1 || 'API_ORDER',
            remark2: order_id // Store original ID here
        }]);

    if (insertError) {
        console.error("Insert Error:", insertError);
        return res.status(500).json({ status: "FAILED", message: "DATABASE_ERROR", detail: insertError.message });
    }

    // 5. Generate Direct UPI Intent for Mobile Apps
    const { data: merchant } = await supabase.from('merchants').select('*').eq('user_id', user.id).single();
    let upiId = '';
    if (method === 'PhonePe') upiId = merchant.phonepe_upi_id;
    else if (method === 'Paytm') upiId = merchant.paytm_upi_id;
    else if (method === 'BharatPe') upiId = merchant.bharatpe_upi_id;
    else if (method === 'Google Pay' || method === 'Gpay') upiId = merchant.gpay_upi_id;

    const upiIntent = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(user.name)}&am=${amount}&tn=${encodeURIComponent(safeTrxId)}&tr=${safeTrxId}&mc=4722&cu=INR&mode=02&purpose=00`;
    const paytmIntent = `paytmmp://cash_wallet?pa=${upiId}&pn=${encodeURIComponent(user.name)}&am=${amount}&cu=INR&tn=${encodeURIComponent(safeTrxId)}&tr=${safeTrxId}&mc=4722&mode=02&purpose=00&&sign=AAuN7izDWN5cb8A5scnUiNME+LkZqI2DWgkXlN1McoP6WZABa/KkFTiLvuPRP6/nWK8BPg/rPhb+u4QMrUEX10UsANTDbJaALcSM9b8Wk218X+55T/zOzb7xoiB+BcX8yYuYayELImXJHIgL/c7nkAnHrwUCmbM97nRbCVVRvU0ku3Tr&featuretype=money_transfer`;
    const phonepeIntent = `phonepe://pay?pa=${upiId}&pn=${encodeURIComponent(user.name)}&am=${amount}&tn=${encodeURIComponent(safeTrxId)}&tr=${safeTrxId}&mc=4722&cu=INR&mode=02&purpose=00`;
    console.log("Generated UPI Intent:", upiIntent);

    res.status(201).json({
        status: true,
        message: "Order Created Successfully",
        result: {
            orderId: order_id, // Return original ID to user
            payment_url: `https://${req.headers.host}/payment/${paymentId}`,
            upi_intent: upiIntent,
            paytm_intent: paytmIntent,
            phonepe_intent: phonepeIntent
        }
    });
});

// Check Order API
router.post(['/check-order', '/check-status', '/api/check-status'], async (req, res) => {
    const user_token = req.body.user_token || req.query.user_token || req.body.token || req.query.token;
    const order_id = req.body.order_id || req.query.order_id || req.body.orderId || req.query.orderId;

    const { data: user } = await supabase.from('users').select('id').eq('user_token', user_token).single();
    if (!user) return res.status(400).json({ status: "FAILED", message: "INVALID_USER_TOKEN" });

    const { data: payment } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .eq('remark2', order_id) // Search by original ID stored in remark2
        .single();

    if (payment) {
        let currentStatus = payment.status;
        let currentUtr = payment.utr || "";
        let paidOn = payment.paid_on;

        // If pending, try verifying from bank
        if (currentStatus == '0') {
            const verifyResult = await verifyInternal(payment);
            if (verifyResult === "SUCCESS") {
                const { data: updatedPayment } = await supabase.from('payments').select('*').eq('id', payment.id).single();
                currentStatus = '1';
                currentUtr = updatedPayment.utr;
                paidOn = updatedPayment.paid_on;
            }
        }

        return res.status(200).json({
            status: currentStatus == '1' ? "COMPLETED" : "PENDING",
            message: "Transaction Details",
            result: {
                txnStatus: currentStatus == '1' ? "COMPLETED" : "PENDING",
                resultInfo: currentStatus == '1' ? "Transaction Success" : "Transaction Pending",
                orderId: payment.trx_id,
                status: currentStatus == '1' ? "SUCCESS" : "FAILED",
                amount: payment.amount,
                date: payment.created_on,
                paidOn: paidOn,
                utr: currentUtr
            }
        });
    } else {
        return res.status(400).json({ status: "FAILED", message: "ORDER_ID_NOT_FOUND" });
    }
});

// Helper to verify status from bank
async function verifyInternal(payment) {
    const { data: merchant } = await supabase.from('merchants').select('*').eq('user_id', payment.user_id).single();
    if (!merchant) return "MERCHANT_NOT_FOUND";

    let result = "PENDING";
    const method = payment.method;
    const trxId = payment.trx_id;

    try {
        const fetch = require('node-fetch');
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
                merchant.phonepe_device_data,
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
    } catch (err) {
        console.error("Internal Verification Error:", err);
        return "ERROR";
    }

    if (result === "SUCCESS") {
        const { data: user } = await supabase.from('users').select('callback_url').eq('id', payment.user_id).single();
        if (user && user.callback_url) {
            const { data: updatedPayment } = await supabase.from('payments').select('*').eq('trx_id', trxId).single();
            const { sendWebhook } = require('../lib/utils');
            await sendWebhook(updatedPayment, user.callback_url);
        }
    }
    return result;
}

// Transaction Verification API
router.post('/verify', async (req, res) => {
    const { trxId } = req.body;
    if (!trxId) return res.status(400).send("TRX_ID_REQUIRED");

    const { data: payment } = await supabase.from('payments').select('*').eq('trx_id', trxId).single();
    if (!payment) return res.status(404).send("NOT_FOUND");
    if (payment.status != '0') return res.send("ALREADY");

    const result = await verifyInternal(payment);
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
