const express = require('express');
const session = require('express-session');
const path = require('path');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse request bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public')); // Serve static files

// Set up session
app.use(session({
    secret: 'your_secret_key', // Replace with your own secret key
    resave: false,
    saveUninitialized: true,
}));

// Database connection
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root', 
    password: '', 
    database: 'budget_app' 
});

// Connect to database
connection.connect(err => {
    if (err) throw err;
    console.log('Connected to the database.');
});

// Define root route
app.get('/', (req, res) => {
    res.redirect('/login'); // Redirect to login page
});

// Middleware to check if the user is logged in
const isAuthenticated = (req, res, next) => {
    if (!req.session.loggedin) {
        return res.status(403).send('Unauthorized');
    }
    next();
};

// User registration route
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/register.html'));
});

// Handle user registration
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    connection.query('SELECT * FROM User WHERE username = ?', [username], (err, results) => {
        if (err) {
            console.error("Database error: ", err);
            return res.status(500).send('Error registering user');
        }

        if (results.length > 0) {
            return res.redirect('/register?error=Username already exists');
        }

        connection.query('INSERT INTO User (username, password) VALUES (?, ?)', [username, hashedPassword], (err) => {
            if (err) {
                console.error("Database error: ", err);
                return res.status(500).send('Error registering user');
            }
            res.redirect('/login');
        });
    });
});

// User login route
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/login.html'));
});

// Handle user login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    connection.query('SELECT * FROM User WHERE username = ?', [username], async (err, results) => {
        if (err) {
            console.error("Database error: ", err);
            return res.status(500).send('Error logging in user');
        }

        if (results.length === 0 || !(await bcrypt.compare(password, results[0].password))) {
            return res.redirect('/login?error=Incorrect username or password');
        }

        // Set session variables
        req.session.loggedin = true;
        req.session.userId = results[0].id; // Set userId in session
        res.redirect('/dashboard');
    });
});

// User logout route
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) throw err;
        res.redirect('/login');
    });
});

// Dashboard route
app.get('/dashboard', (req, res) => {
    if (req.session.loggedin) {
        res.sendFile(path.join(__dirname, 'views/dashboard.html'));
    } else {
        res.redirect('/login');
    }
});

// Manage Income and Expenses route
app.get('/manage-income-expenses', (req, res) => {
    if (req.session.loggedin) {
        res.sendFile(path.join(__dirname, 'views/manage-income-expenses.html'));
    } else {
        res.redirect('/login');
    }
});

// Add a new income/expense
app.post('/add-income-expense', isAuthenticated, (req, res) => {
    const { amount, category, description, date } = req.body;

    if (!amount || !category || !description || !date) {
        return res.status(400).send('All fields are required!');
    }

    const query = 'INSERT INTO budgets (amount, category, description, date, userId) VALUES (?, ?, ?, ?, ?)';
    connection.query(query, [amount, category, description, date, req.session.userId], (err) => {
        if (err) {
            console.error("Database error: ", err);
            return res.status(500).send('Error adding income/expense');
        }
        res.status(200).json({ message: 'Income/Expense added successfully!' });
    });
});

// Get a single expense by ID
app.get('/get-expense/:id', (req, res) => {
    const expenseId = req.params.id;
    const query = 'SELECT id, amount, category, description, date FROM budgets WHERE id = ? AND userId = ?';
    connection.query(query, [expenseId, req.session.userId], (err, results) => {
        if (err) {
            console.error("Database error: ", err);
            return res.status(500).send('Error fetching expense');
        }
        res.json(results[0]); // Send the first result
    });
});

// Get a single expense by ID
app.get('/get-expense/:id', (req, res) => {
    const expenseId = req.params.id;
    const query = 'SELECT id, amount, category, description, date FROM budgets WHERE id = ? AND userId = ?';
    connection.query(query, [expenseId, req.session.userId], (err, results) => {
        if (err) {
            console.error("Database error: ", err);
            return res.status(500).json({ message: 'Database error' });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Expense not found' });
        }
        res.json(results[0]); // Send the first result
    });
});

// Update an existing income/expense
app.put('/update-income-expense/:id', isAuthenticated, (req, res) => {
    const entryId = req.params.id;
    const { amount, category, description, date } = req.body;

    const query = 'UPDATE budgets SET amount = ?, category = ?, description = ?, date = ? WHERE id = ? AND userId = ?';
    connection.query(query, [amount, category, description, date, entryId, req.session.userId], (err, results) => {
        if (err) {
            console.error("Database error: ", err);
            return res.status(500).json({ error: 'Error updating entry' });
        }
        res.json({ message: 'Entry updated successfully!' });
    });
});

// Delete an income/expense
app.delete('/delete-income-expense/:id', isAuthenticated, (req, res) => {
    const expenseId = req.params.id;
    const query = 'DELETE FROM budgets WHERE id = ? AND userId = ?';
    connection.query(query, [expenseId, req.session.userId], (err, results) => {
        if (err) {
            console.error("Database error: ", err);
            return res.status(500).send('Error deleting expense');
        }
        res.json({ message: 'Items deleted successfully!' });
    });
});

// Get all expenses
app.get('/get-expenses', isAuthenticated, (req, res) => {
    const query = 'SELECT id, amount, category, description, date FROM budgets WHERE userId = ?';
    connection.query(query, [req.session.userId], (err, results) => {
        if (err) {
            console.error("Database error: ", err);
            return res.status(500).send('Error fetching expenses');
        }
        res.json(results);
    });
});

// Get total income
app.get('/get-total-income', isAuthenticated, (req, res) => {
    const query = 'SELECT SUM(amount) AS total FROM budgets WHERE userId = ? AND category = "income"';
    connection.query(query, [req.session.userId], (err, results) => {
        if (err) {
            console.error("Database error: ", err);
            return res.status(500).send('Error fetching total income');
        }
        res.json(results[0]); // Send the total income
    });
});

// Get total expenses
app.get('/get-total-expenses', isAuthenticated, (req, res) => {
    const query = 'SELECT SUM(amount) AS total FROM budgets WHERE userId = ? AND category = "expense"';
    connection.query(query, [req.session.userId], (err, results) => {
        if (err) {
            console.error("Database error: ", err);
            return res.status(500).send('Error fetching total expenses');
        }
        res.json(results[0]); // Send the total expenses
    });
});

// Serve the reports page
app.get('/reports', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'reports.html'));
});

// Get monthly report data
app.get('/api/monthly-report', isAuthenticated, (req, res) => {
    const { startDate, endDate } = req.query;

    const sql = `
        SELECT MONTH(date) AS month, 
               SUM(CASE WHEN category = 'income' THEN amount ELSE 0 END) AS total_income, 
               SUM(CASE WHEN category = 'expense' THEN amount ELSE 0 END) AS total_expense 
        FROM budgets 
        WHERE date BETWEEN ? AND ? AND userId = ?
        GROUP BY MONTH(date)
        ORDER BY MONTH(date);
    `;

    connection.query(sql, [startDate, endDate, req.session.userId], (err, results) => {
        if (err) {
            console.error('Error fetching monthly report:', err);
            return res.status(500).send('Error fetching monthly report');
        }
        res.json(results);
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
