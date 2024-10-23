// Variables to hold budget and expense values
let totalBudgetsValue = 0;
let totalExpensesValue = 0;
let totalIncomeValue = 0; // Declare totalIncomeValue globally

document.addEventListener('DOMContentLoaded', () => {
    fetchTotalExpenses();
    fetchTotalBudgets();
    fetchIncomeExpenseData();
});

// Function to fetch total income (now calculated as total budget - total expenses)
function calculateTotalIncome() {
    totalIncomeValue = totalBudgetsValue - totalExpensesValue; // Subtract expenses from budget
    document.getElementById('totalIncome').innerText = `Nu. ${totalIncomeValue.toLocaleString()}`; // Display the result with commas
    checkBudgetExceed(); // Now check if budget is exceeded after income is calculated
}

// Function to fetch total expenses
function fetchTotalExpenses() {
    fetch('/get-total-expenses')
        .then(response => response.json())
        .then(data => {
            totalExpensesValue = data.total || 0; // Store total expenses
            document.getElementById('totalExpenses').innerText = `Nu. ${totalExpensesValue.toLocaleString()}`; 
            if (totalBudgetsValue !== 0) { // Only calculate income when budget is fetched
                calculateTotalIncome();
            }
        })
        .catch(error => console.error('Error fetching total expenses:', error));
}

// Function to fetch total budgets
function fetchTotalBudgets() {
    fetch('/get-total-income') // Assuming total income is treated as total budgets
        .then(response => response.json())
        .then(data => {
            totalBudgetsValue = data.total || 0; // Store total budgets
            document.getElementById('totalBudgets').innerText = `Nu. ${totalBudgetsValue.toLocaleString()}`; 
            if (totalExpensesValue !== 0) { // Only calculate income when expenses are fetched
                calculateTotalIncome();
            }
        })
        .catch(error => console.error('Error fetching total budgets:', error));
}

// Function to check if expenses exceed the total budget
function checkBudgetExceed() {
    const exceedMessageElement = document.getElementById('exccedtotalbudget');

    if (totalExpensesValue > totalBudgetsValue) {
        exceedMessageElement.innerText = `Your expenses exceed the total budget of Nu. ${totalBudgetsValue.toLocaleString()}!`; // Display total budget with commas
        exceedMessageElement.style.color = 'red'; 
    } else {
        exceedMessageElement.innerText = `You have an available budget of Nu. ${totalIncomeValue.toLocaleString()}.`; // Display available budget with commas
        exceedMessageElement.style.color = 'green'; 
    }
}

// Function to fetch income and items data for the table
function fetchIncomeExpenseData() {
    fetch('/get-expenses')
        .then(response => response.json())
        .then(expenses => {
            const income = [];
            const expensesData = [];
            const labels = [];
            const tableData = {};

            expenses.forEach(expense => {
                // Parse date correctly and ensure consistency
                const date = new Date(expense.date);
                const dateLabel = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; // Format as 'YYYY-MM-DD'

                // Log date and other expense data to check if it's being processed correctly
                console.log(`Processing: ${dateLabel}, Category: ${expense.category}, Amount: ${expense.amount}`);

                // Check if the date already exists in labels and tableData
                if (!labels.includes(dateLabel)) {
                    labels.push(dateLabel);
                    tableData[dateLabel] = { income: 0, expense: 0 }; // Initialize income and expense for the date
                }

                // Separate expenses and income
                if (expense.category === 'expense') {
                    expensesData.push(expense.amount);
                    income.push(0); // Income is 0 for expense rows
                    tableData[dateLabel].expense += expense.amount; // Accumulate expense for this date
                } else {
                    income.push(expense.amount);
                    expensesData.push(0); // Expense is 0 for income rows
                    tableData[dateLabel].income += expense.amount; // Accumulate income for this date
                }
            });

            // Log the final tableData to ensure dates and amounts are being correctly stored
            console.log('Final Table Data:', tableData);

            // Populate the table with new data
            const tbody = document.getElementById('incomeExpenseTable').querySelector('tbody');
            tbody.innerHTML = ''; // Clear existing rows

            // Loop through tableData and create rows for each date
            Object.keys(tableData).forEach(date => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${date}</td>
                    <td>Nu. ${tableData[date].income.toLocaleString()}</td> 
                    <td>Nu. ${tableData[date].expense.toLocaleString()}</td> 
                `;
                tbody.appendChild(row);
            });
        })
        .catch(error => console.error('Error fetching income/expense data:', error));
}
