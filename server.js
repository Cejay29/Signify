const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const supabase = require('./supabaseClient');
require('dotenv').config();

const app = express();
const PORT = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 🔐 Signup Route
app.post('/signup', async (req, res) => {
    const { username, email, password, birthday, gender } = req.body;

    const { data: existingUser } = await supabase
        .from('users')
        .select('email')
        .eq('email', email)
        .single();

    if (existingUser) {
        return res.send('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { error } = await supabase.from('users').insert([
        {
            username,
            email,
            password: hashedPassword,
            birthday, // e.g., '2004-03-15'
            gender,   // e.g., 'Male'
            xp: 0,
            gems: 0,
        },
    ]);

    if (error) {
        console.error(error);
        return res.send('Signup failed');
    }

    res.redirect('/login.html');
});


// 🔐 Login Route
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

    if (error || !user) {
        return res.send('User not found');
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
        return res.send('Incorrect password');
    }

    // Success
    res.redirect('/homepage.html');
});

// 🟢 Start server
app.listen(PORT, () => {
    console.log(`Signify backend running at http://localhost:${PORT}`);
});
