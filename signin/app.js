const express = require('express');
const app = express();
const mysql = require('mysql2');
const session = require('express-session');
const path = require("path");

const port = 5500;

app.use(express.urlencoded({ extended: true }));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

app.use(session({
    secret: 'donordrive_secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'niraj',
    database: 'user_auth'
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL Database');
});

// home route
app.get('/', (req, res) => {
    res.render('home');
});

// signup routes
app.get('/signup', (req, res) => {
    res.render('signup');
});

app.post('/signup', (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.send('All fields are required.');
    }

    const query = `INSERT INTO users (username, email, password) VALUES (?, ?, ?)`;

    db.query(query, [username, email, password], (err) => {
        if (err) {
            console.error('Error inserting data:', err);
            return res.send('Error occurred during signup.');
        }
        res.redirect('/login');
    });
});

// guest route
app.get('/guest', (req, res) => {
    req.session.user = { username: 'Guest', id: null };
    res.render('donation', { username: 'Guest' });
});

// login routes
app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;

    const query = 'SELECT * FROM users WHERE email = ? AND password = ?';

    db.query(query, [email, password], (err, results) => {
        if (err) {
            console.error(err);
            return res.send('Error logging in');
        }

        if (results.length > 0) {
            req.session.user = {
                id: results[0].id,
                username: results[0].username,
                email: results[0].email
            };

            console.log('Logged in as:', req.session.user);

            res.render('donation', { username: req.session.user.username });
        } else {
            res.send('Invalid credentials');
        }
    });
});

// donation route
app.get('/donation', (req, res) => {
    const username = req.session.user ? req.session.user.username : 'Guest';
    res.render('donation', { username });
});

// cloth donation form
app.get('/donate/clothes', (req, res) => {
    const username = req.session.user ? req.session.user.username : 'Guest';
    res.render('clothes', { username });
});

// handle donation form submission
app.post('/donate/clothes', (req, res) => {
    const { item_name, size, quantity, description } = req.body;
    const userId = req.session.user && req.session.user.id ? req.session.user.id : null;

    if (!item_name || !size || !quantity || !description) {
        return res.send('All fields are required.');
    }

    const categoryIdQuery = `SELECT id FROM categories WHERE name = 'Clothes'`;

    db.query(categoryIdQuery, (err, results) => {
        if (err) {
            console.error('Error fetching category ID:', err);
            return res.send('Error occurred');
        }

        const categoryId = results[0].id;

        const donationQuery = `
            INSERT INTO donations (user_id, category_id, item_name, size, quantity, description)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        db.query(donationQuery, [userId, categoryId, item_name, size, quantity, description], (err, result) => {
            if (err) {
                console.error('Error inserting donation:', err);
                return res.send('Error while donating');
            }

            console.log('Donation added successfully');

            const donationId = result.insertId;

            // Redirect to donor details form
            res.redirect(`/donor-details/${donationId}`);
        });
    });
});

// render donor details form with donation ID
app.get('/donor-details/:donationId', (req, res) => {
    const donationId = req.params.donationId;

    if (!donationId) {
        return res.status(400).send('Invalid donation ID');
    }

    const username = req.session.user ? req.session.user.username : 'Guest';
    res.render('donor_details', { 
        username, 
        donationId 
    });
});

// handle donor details form submission with donation ID
app.post('/submit-donor-details', (req, res) => {
    const { donation_id, address, phone, pickup_preference, pickup_date } = req.body;

    if (!donation_id || !address || !phone || !pickup_preference) {
        return res.status(400).send('All fields are required');
    }

    const userId = req.session.user ? req.session.user.id : null;

    const query = `
        INSERT INTO donor_details (user_id, donation_id, address, phone, pickup_preference, pickup_date)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(query, [userId, donation_id, address, phone, pickup_preference, pickup_date || null], (err) => {
        if (err) {
            console.error('Error inserting donor details:', err);
            return res.send('Error while saving donor details');
        }

        console.log('Donor details added successfully');

        // Redirect to the Thank You page
        res.redirect(`/thankyou/${donation_id}`);
    });
});

// thank you page route
app.get('/thankyou/:donationId', (req, res) => {
    const donationId = req.params.donationId;

    if (!donationId || isNaN(donationId)) {
        return res.status(400).send('Invalid donation ID');
    }

    const username = req.session.user ? req.session.user.username : 'Guest';

    const checkQuery = 'SELECT * FROM donations WHERE id = ?';
    db.query(checkQuery, [donationId], (err, results) => {
        if (err) {
            console.error('Error validating donation:', err);
            return res.status(500).send('Server error');
        }

        if (results.length === 0) {
            return res.status(404).send('Donation not found');
        }

        res.render('thankyou', { username, donationId });
    });
});


// Scratch coupon route with images
app.get('/scratch', (req, res) => {
    const query = `SELECT * FROM coupons`;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching coupons:', err);
            return res.send('Error loading coupons');
        }

        if (results.length === 0) {
            return res.send('No coupons available');
        }

        // Select a random coupon from the database
        const randomIndex = Math.floor(Math.random() * results.length);
        const coupon = results[randomIndex];

        res.render('scratch', {
            couponCode: coupon.coupon_code,
            description: coupon.coupon_description,
            imageUrl: coupon.image_url  // Use the URL stored in the database
        });
    });
});

// logout route
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

// start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
