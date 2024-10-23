// routes/routes.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Render Register Page
router.get('/register', (req, res) => {
    res.render('register');
});

// Handle User Registration
router.post('/register', (req, res) => {
    const { username, password } = req.body;
    const query = 'INSERT INTO users (username, password) VALUES (?, ?)';
    db.query(query, [username, password], (err, results) => {
        if (err) throw err;
        res.redirect('/login');
    });
});

// Render Login Page
router.get('/login', (req, res) => {
    res.render('login');
});

// Handle User Login
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    const query = 'SELECT * FROM users WHERE username = ? AND password = ?';
    db.query(query, [username, password], (err, results) => {
        if (err) throw err;
        if (results.length > 0) {
            req.session.userId = results[0].id;
            res.redirect('/dashboard');
        } else {
            res.send('Invalid credentials');
        }
    });
});

// Render Dashboard Page
router.get('/dashboard', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    
    // Fetch budgets and transactions for the user
    const userId = req.session.userId;
    const budgetsQuery = 'SELECT * FROM budgets WHERE user_id = ?';
    const transactionsQuery = 'SELECT * FROM transactions WHERE user_id = ?';
    
    db.query(budgetsQuery, [userId], (err, budgets) => {
        if (err) throw err;
        
        db.query(transactionsQuery, [userId], (err, transactions) => {
            if (err) throw err;
            res.render('dashboard', { budgets, transactions });
        });
    });
});

// Add Transaction
router.post('/add-transaction', (req, res) => {
    const { description, amount, type, category_id } = req.body;
    const query = 'INSERT INTO transactions (description, amount, type, category_id, user_id) VALUES (?, ?, ?, ?, ?)';
    db.query(query, [description, amount, type, category_id, req.session.userId], (err, results) => {
        if (err) throw err;
        res.redirect('/dashboard');
    });
});

// Render Income and Expense Management Page
router.get('/manage-income-expenses', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }

    // Fetch categories for the user
    const categoriesQuery = 'SELECT * FROM categories WHERE user_id = ?';
    db.query(categoriesQuery, [req.session.userId], (err, categories) => {
        if (err) throw err;
        res.render('manage-income-expenses', { categories });
    });
});

// Add Category
router.post('/add-category', (req, res) => {
    const { name } = req.body;
    const query = 'INSERT INTO categories (name, user_id) VALUES (?, ?)';
    db.query(query, [name, req.session.userId], (err, results) => {
        if (err) throw err;
        res.redirect('/manage-income-expenses');
    });
});

// Fetch Monthly Reports
router.get('/monthly-report', (req, res) => {
    const query = `SELECT MONTH(date) AS month, SUM(amount) AS total 
                   FROM transactions 
                   WHERE YEAR(date) = YEAR(CURDATE()) AND user_id = ?
                   GROUP BY MONTH(date)`;
    db.query(query, [req.session.userId], (err, results) => {
        if (err) throw err;
        res.json(results);
    });
});

// Export the router
module.exports = router;
