const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const cors = require('cors');
require('dotenv').config();

const supabase = require('./supabaseClient');
const app = express();
const PORT = 5500;

const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    }
});


// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Send OTP
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

    // Send Email using nodemailer
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Your Signify OTP Code',
        text: `Your OTP code is: ${otp}. It will expire in 5 minutes.`,
    };

    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            console.error('❌ Email Send Error:', err);
            return res.status(500).send('Failed to send OTP email');
        }

        console.log('✅ Email sent:', info.response);
        res.status(200).send('OTP sent successfully!');
    });
});

// Verify-OTP
app.post('/verify-otp', async (req, res) => {
    const { email, otp } = req.body;
    console.log('📥 OTP Verify Request:', { email, otp });

    if (!email || !otp) {
        console.log('❌ Missing email or otp');
        return res.status(400).send('Missing email or OTP');
    }

    const { data, error } = await supabase
        .from('otps')
        .select('code, expires_at')
        .eq('email', email)
        .order('expires_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.log('❌ Supabase Error:', error.message);
        return res.status(500).send('Supabase error');
    }

    if (!data) {
        console.log('❌ No OTP found for:', email);
        return res.status(400).send('OTP not found');
    }

    console.log('✅ OTP record found:', data);

    const now = new Date();
    const expiration = new Date(data.expires_at);
    if (now > expiration) {
        console.log('❌ OTP expired');
        return res.status(401).send('OTP expired');
    }

    if (otp !== data.code) {
        console.log('❌ OTP mismatch:', otp, '!==', data.code);
        return res.status(401).send('Invalid OTP');
    }

    await supabase.from('otps').delete().eq('email', email);
    console.log('✅ OTP verified and deleted');
    res.send('OTP verified');
});

// Signup
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

// Login (if you’re using it)
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
    res.sendFile(path.join(__dirname, 'public', 'landing.html'));
});

// Serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
