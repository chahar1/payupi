const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
    res.render('index');
});

// Helper for API error messages
const apiMethods = ['createOrder', 'create-order', 'check-order', 'check-status', 'verify'];
apiMethods.forEach(method => {
    app.get([`/${method}`, `/api/${method}`], (req, res) => {
        res.status(405).json({ status: "FAILED", message: "METHOD_NOT_ALLOWED_USE_POST" });
    });
});

const publicPages = ['pricing', 'changelog', 'about', 'careers', 'blog', 'contact', 'privacy', 'terms', 'refund'];
publicPages.forEach(page => {
    app.get(`/${page}`, (req, res) => {
        res.render(`public/${page}`);
    });
});

// Dedicated API Docs route with necessary variables
const supabase = require('./config/supabase');
app.get('/api-docs', async (req, res) => {
    let user = null;
    if (req.cookies.userId) {
        const { data } = await supabase.from('users').select('*').eq('id', req.cookies.userId).single();
        user = data;
    }
    res.render('public/api-docs', {
        host: req.get('host'),
        user: user
    });
});

// Import and use routes
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const paymentRoutes = require('./routes/payment');
app.use('/auth', authRoutes);
app.use('/auth', dashboardRoutes);
app.use('/', paymentRoutes);

// Only start the server when running locally (not on Vercel serverless)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

// Export for Vercel serverless
module.exports = app;
