const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Middleware to check authentication
router.use((req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    next();
});

// Dashboard
router.get('/dashboard', (req, res) => {
    const userId = req.session.userId;

    // Fetching budget summary
    db.query('SELECT SUM(amount) AS totalBudget FROM Budget WHERE user_id = ?', [userId], (err, budgetResults) => {
        if (err) throw err;
        const totalBudget = budgetResults[0].totalBudget || 0;

        // Fetching transactions
        db.query('SELECT * FROM Transactions WHERE user_id = ?', [userId], (err, transactions) => {
            if (err) throw err;

            // Fetch categories for dropdown
            db.query('SELECT * FROM Category', (err, categories) => {
                if (err) throw err;
                res.render('dashboard', { totalBudget, transactions, categories });
            });
        });
    });
});

// Add Transaction
router.post('/add-transaction', (req, res) => {
    const { description, amount, type, category_id } = req.body;
    const userId = req.session.userId;

    db.query('INSERT INTO Transactions (user_id, description, amount, type, category_id, date) VALUES (?, ?, ?, ?, ?, NOW())', [userId, description, amount, type, category_id], (err, results) => {
        if (err) throw err;
        res.redirect('/dashboard');
    });
});

// Manage Income and Expenses
router.get('/manage-income-expenses', (req, res) => {
    // Fetch categories for the dropdown
    db.query('SELECT * FROM Category', (err, categories) => {
        if (err) throw err;
        res.render('manage-income-expenses', { categories });
    });
});

// Add Category
router.post('/add-category', (req, res) => {
    const { name } = req.body;

    db.query('INSERT INTO Category (name) VALUES (?)', [name], (err, results) => {
        if (err) throw err;
        res.redirect('/manage-income-expenses');
    });
});

module.exports = router;
