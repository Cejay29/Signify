const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const cors = require('cors');
require('dotenv').config();

const supabase = require('./supabaseClient');
const app = express();
const PORT = 5500;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔐 Send OTP
// 🔐 Send OTP
app.post('/send-otp', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).send('Email is required');

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const { error } = await supabase.from('otps').upsert([
        {
            email,
            code: otp,
            expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        }
    ]);

    if (error) {
        console.error('❌ Supabase OTP Insert Error:', error);
        return res.status(500).send(error.message || 'Failed to store OTP');
    }

    console.log(`✅ OTP ${otp} generated for: ${email}`);

    // ✅ Send a success response back to the client
    res.status(200).send('OTP successfully stored and sent (check console/email)');
});

// ✅ Verify OTP
app.post('/verify-otp', async (req, res) => {
    const { email, otp } = req.body;
    const { data, error } = await supabase
        .from('otps')
        .select('code, expires_at')
        .eq('email', email)
        .single();

    if (error || !data) return res.status(400).send('OTP not found');

    const now = new Date();
    const expiration = new Date(data.expires_at);
    if (now > expiration) return res.status(401).send('OTP expired');

    if (otp !== data.code) return res.status(401).send('Invalid OTP');

    await supabase.from('otps').delete().eq('email', email);
    res.send('OTP verified');
});

// 📝 Signup
app.post('/signup', async (req, res) => {
    const { username, email, password, birthday, gender } = req.body;

    const { data: existingUser } = await supabase
        .from('users')
        .select('email')
        .eq('email', email)
        .single();

    if (existingUser) return res.status(400).send('User already exists');

    const hashedPassword = await bcrypt.hash(password, 10);

    const { error } = await supabase.from('users').insert([
        { username, email, password: hashedPassword, birthday, gender, xp: 0, gems: 0 }
    ]);

    if (error) return res.status(500).send('Signup failed');
    res.send('Signup successful');
});

// 🔐 Login (if you’re using it)
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

    if (error || !user) return res.status(404).send('User not found');

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).send('Incorrect password');

    res.redirect('/homepage.html');
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

// 🌐 Serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));

// 🟢 Start the server
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
