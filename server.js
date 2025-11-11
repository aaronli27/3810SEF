/* 
Controllers - express modules
-----------------------------
express-formiddable: https://www.npmjs.com/package/express-formidable
- express-formidable can basically parse form types, including application/x-www-form-urlencoded, application/json, and multipart/form-data.
-----------------------------
fs/promises: https://nodejs.org/zh-tw/learn/manipulating-files/reading-files-with-nodejs
-----------------------------
*/
const express = require('express');
const app = express();
const fs = require('node:fs/promises');
const formidable = require('express-formidable'); 
app.use(formidable());

/* Model - mongodb modules
mongodb ^6.9: https://www.npmjs.com/package/mongodb
*/
const { MongoClient, ServerApiVersion } = require('mongodb');
const url = 'mongodb+srv://Aaronli:Aaron@cluster0.fwfuo0a.mongodb.net/';  
const client = new MongoClient(url);
const dbName = 'project_PFT';


//collections

const  usersCollection = "users";
const transactionsCollection = "transactions";

// Views
app.set('view engine', 'ejs');

//initialize
const initializeDatabase = async (db) => {

    await db.collection(transactionsCollection).createIndex({ userId: 1, date: -1 });
    await db.collection(transactionsCollection).createIndex({ userId: 1, category: 1 });
    
    // predefined
    const existingUsers = await db.collection(usersCollection).find({}).toArray();
    if (existingUsers.length === 0) {
        const predefinedUsers = [
            {
                username: "Ken",
                email: "Ken@live.hkmu.edu.hk",
                password: "Ken123", // In production, this should be hashed
            },
            {
                username: "John", 
                email: "John@live.hkmu.edu.hk",
                password: "John123",
            },
            {
                username: "Mary",
                email: "Mary@live.hkmu.edu.hk", 
                password: "Mary123",
            }
        ];
        
        await db.collection(usersCollection).insertMany(predefinedUsers);
        console.log("Predefined users inserted successfully");
        
        // Add sample transactions for demo users
        const insertedUsers = await db.collection(usersCollection).find({}).toArray();
        const KenUserId = insertedUsers[0]._id;
        const MaryUserId = insertedUsers[1]._id;
        const sampleTransactions = [
            {
                title: "Monthly Salary",
                amount: 13000,
                type: "Income",
                category: "Salary",
                date: new Date("2024-01-15"),
                description: "Monthly salary from company",
                paymentMethod: "Bank Transfer",
                userId: KenUserId,
                createdAt: new Date()
            },
            {
                title: "Groceries",
                amount: 85.50,
                type: "Expense", 
                category: "Food & Dining",
                date: new Date("2024-01-20"),
                description: "Weekly groceries",
                paymentMethod: "Credit Card",
                userId: KenUserId,
                createdAt: new Date()
            },
            {
                title: "Internet Bill",
                amount: 65.00,
                type: "Expense",
                category: "Utilities", 
                date: new Date("2024-01-05"),
                description: "Monthly internet bill",
                paymentMethod: "Bank Transfer",
                userId: KenUserId,
                createdAt: new Date()
            },
            

       {
                title: "Freelance Work",
                amount: 12000,
                type: "Income",
                category: "Freelance", 
                date: new Date("2024-01-10"),
                description: "Website development project",
                paymentMethod: "Bank Transfer",
                userId: MaryUserId,
                createdAt: new Date()
            }
        ];
        
        await db.collection(transactionsCollection).insertMany(sampleTransactions);
        console.log("Sample transactions inserted successfully");
    }
    console.log("Database collections and indexes initialized successfully");
};


const insertDocument = async (db,collectionName, doc) => {
    const collection = db.collection(collectionName);
    const results = await collection.insertOne(doc);
	console.log("insert one document:" + JSON.stringify(results));
    return results;

}

const findDocument = async (db,collectionName, criteria) => {
	let findResults = [];
	let collection = db.collection(collectionName);
	console.log(`findCriteria: ${JSON.stringify(criteria)}`);
   	findResults = await collection.find(criteria).toArray();
	console.log(`findDocument: ${findResults.length}`);
	console.log(`findResults: ${JSON.stringify(findResults)}`);
	return findResults;
};

const updateDocument = async (db,collectionName, criteria, updateDoc) => {
                let updateResults = [];
	let collection = db.collection(collectionName);
	console.log(`updateCriteria: ${JSON.stringify(criteria)}`);
   	updateResults = await collection.updateOne(criteria,{$set : updateDoc});
	console.log(`updateResults: ${JSON.stringify(updateResults)}`);
	return updateResults;
}

const authenticateUser = async (req, res, next) => {
    try {

        if (req.session.user) {
            req.user = req.session.user;
            return next();
        }
        
        await client.connect();
        const db = client.db(dbName);
        
        const { username, password } = req.fields || req.query || {};
        
        if (!username || !password) {
            return res.status(200).render('login', { 
                error: null,
                Accounts: [
                    { username: "Ken", password: "Ken123" },
                    { username: "John", password: "John123" },
                    { username: "Mary", password: "Mary123" }
                ]
            });
        }
        
        const user = await db.collection(usersCollection).findOne({ username, password });
        
        if (user) {
            req.session.user = {
                _id: user._id,
                username: user.username,
                email: user.email
            };
            req.user = req.session.user;
            next();
        } else {
            res.status(200).render('login', { 
                error: "Invalid username or password",
                Accounts: [
                    { username: "Ken", password: "Ken123" },
                    { username: "John", password: "John123" },
                    { username: "Mary", password: "Mary123" }
                ]
            });
        }
    } catch (error) {
        console.error("Authentication error:", error);
        res.status(500).render('error', { message: "Authentication failed" });
    }
};
app.get('/login', (req, res) => {
    res.status(200).render('login', { 
        error: null,
        Accounts: [
                    { username: "Ken", password: "Ken123" },
                    { username: "John", password: "John123" },
                    { username: "Mary", password: "Mary123" }
        ]
    });
});

app.post('/login', authenticateUser, (req, res) => {
    res.redirect('/dashboard');
});

app.get('/logout', (req, res) => {
    req.session = null; // Destroy session
    res.redirect('/login');
});

app.get('/dashboard', authenticateUser, async (req, res) => {
    try {
        await client.connect();
        const db = client.db(dbName);
        const transactions = await findDocument(db, transactionsCollection, { userId: req.user._id });
       
        const totalIncome = transactions
            .filter(t => t.type === 'Income')
            .reduce((sum, t) => sum + t.amount, 0);
            
        const totalExpenses = transactions
            .filter(t => t.type === 'Expense')
            .reduce((sum, t) => sum + t.amount, 0);
            
        const netBalance = totalIncome - totalExpenses;
        
        res.status(200).render('dashboard', {
            user: req.user,
            totalIncome,
            totalExpenses, 
            netBalance,
            transactionCount: transactions.length
        });
    } catch (error) {
        console.error("Dashboard error:", error);
        res.status(500).render('error', { message: "Failed to load dashboard" });
    } finally {
        await client.close();
    }
});

app.get('/transactions', authenticateUser, async (req, res) => {
    try {
        await client.connect();
        const db = client.db(dbName);
        
        let criteria = { userId: req.user._id };
        
        // Apply filters from query parameters
        if (req.query.type) criteria.type = req.query.type;
        if (req.query.category) criteria.category = req.query.category;
        if (req.query.paymentMethod) criteria.paymentMethod = req.query.paymentMethod;
        if (req.query.search) {
            criteria.$or = [
                { title: { $regex: req.query.search, $options: 'i' } },
                { description: { $regex: req.query.search, $options: 'i' } }
            ];
        }
        
        const transactions = await findDocument(db, transactionsCollection, criteria);
        res.status(200).render('transactions', { 
            user: req.user,
            transactions,
            filters: req.query
        });
    } catch (error) {
        console.error("Transactions error:", error);
        res.status(500).render('error', { message: "Failed to load transactions" });
    } finally {
        await client.close();
    }
});

app.get('/transactions/create', authenticateUser, (req, res) => {
    res.status(200).render('transaction-create', { user: req.user });
});

app.post('/transactions/create', authenticateUser, async (req, res) => {
    try {
        await client.connect();
        const db = client.db(dbName);
        
        const newTransaction = {
            title: req.fields.title,
            amount: parseFloat(req.fields.amount),
            type: req.fields.type,
            category: req.fields.category,
            date: new Date(req.fields.date),
            description: req.fields.description,
            paymentMethod: req.fields.paymentMethod,
            userId: req.user._id,
            createdAt: new Date()
        };
        
        await insertDocument(db, transactionsCollection, newTransaction);
        res.redirect('/transactions');
    } catch (error) {
        console.error("Create transaction error:", error);
        res.status(500).render('error', { message: "Failed to create transaction" });
    } finally {
        await client.close();
    }
});

// Transaction Details
app.get('/transactions/details', authenticateUser, async (req, res) => {
    try {
        await client.connect();
        const db = client.db(dbName);
        
        let criteria = { _id: new ObjectId(req.query._id), userId: req.user._id };
        const transactions = await findDocument(db, transactionsCollection, criteria);
        
        if (transactions.length === 0) {
            return res.status(404).render('error', { message: "Transaction not found" });
        }
        
        res.status(200).render('transaction-details', { 
            transaction: transactions[0],
            user: req.user
        });
    } catch (error) {
        console.error("Transaction details error:", error);
        res.status(500).render('error', { message: "Failed to load transaction details" });
    } finally {
        await client.close();
    }
});

// Edit Transaction
app.get('/transactions/edit', authenticateUser, async (req, res) => {
    try {
        await client.connect();
        const db = client.db(dbName);
        
        let criteria = { _id: new ObjectId(req.query._id), userId: req.user._id };
        const transactions = await findDocument(db, transactionsCollection, criteria);
        
        if (transactions.length === 0) {
            return res.status(404).render('error', { message: "Transaction not found" });
        }
        
        res.status(200).render('transaction-edit', { 
            transaction: transactions[0],
            user: req.user
        });
    } catch (error) {
        console.error("Edit transaction error:", error);
        res.status(500).render('error', { message: "Failed to load transaction for editing" });
    } finally {
        await client.close();
    }
});

// Update Transaction
app.post('/transactions/update', authenticateUser, async (req, res) => {
    try {
        await client.connect();
        const db = client.db(dbName);
        
        const criteria = { _id: new ObjectId(req.fields._id), userId: req.user._id };
        const updateDoc = {
            title: req.fields.title,
            amount: parseFloat(req.fields.amount),
            type: req.fields.type,
            category: req.fields.category,
            date: new Date(req.fields.date),
            description: req.fields.description,
            paymentMethod: req.fields.paymentMethod,
            updatedAt: new Date()
        };
        
        const result = await updateDocument(db, transactionsCollection, criteria, updateDoc);
        
        if (result.modifiedCount === 0) {
            return res.status(404).render('error', { message: "Transaction not found or no changes made" });
        }
        
        res.redirect('/transactions');
    } catch (error) {
        console.error("Update transaction error:", error);
        res.status(500).render('error', { message: "Failed to update transaction" });
    } finally {
        await client.close();
    }
});

// Delete Transaction
app.post('/transactions/delete', authenticateUser, async (req, res) => {
    try {
        await client.connect();
        const db = client.db(dbName);
        
        const criteria = { _id: new ObjectId(req.fields._id), userId: req.user._id };
        const result = await deleteDocument(db, transactionsCollection, criteria);
        
        if (result.deletedCount === 0) {
            return res.status(404).render('error', { message: "Transaction not found" });
        }
        
        res.redirect('/transactions');
    } catch (error) {
        console.error("Delete transaction error:", error);
        res.status(500).render('error', { message: "Failed to delete transaction" });
    } finally {
        await client.close();
    }
});

// RESTful APIs (No authentication required as per requirements)
app.get('/api/transactions', async (req, res) => {
    try {
        await client.connect();
        const db = client.db(dbName);
        
        let criteria = {};
        
        // Support query parameters for filtering
        if (req.query.type) criteria.type = req.query.type;
        if (req.query.category) criteria.category = req.query.category;
        if (req.query.paymentMethod) criteria.paymentMethod = req.query.paymentMethod;
        if (req.query.search) {
            criteria.$or = [
                { title: { $regex: req.query.search, $options: 'i' } },
                { description: { $regex: req.query.search, $options: 'i' } }
            ];
        }
        
        const transactions = await findDocument(db, transactionsCollection, criteria);
        res.json(transactions);
    } catch (error) {
        console.error("API transactions error:", error);
        res.status(500).json({ error: "Failed to fetch transactions" });
    } finally {
        await client.close();
    }
});

app.post('/api/transactions', async (req, res) => {
    try {
        await client.connect();
        const db = client.db(dbName);
        
        const newTransaction = {
            title: req.fields.title,
            amount: parseFloat(req.fields.amount),
            type: req.fields.type,
            category: req.fields.category,
            date: new Date(req.fields.date),
            description: req.fields.description,
            paymentMethod: req.fields.paymentMethod,
            createdAt: new Date()
        };
        
        const result = await insertDocument(db, transactionsCollection, newTransaction);
        res.json({ success: true, insertedId: result.insertedId });
    } catch (error) {
        console.error("API create transaction error:", error);
        res.status(500).json({ error: "Failed to create transaction" });
    } finally {
        await client.close();
    }
});

app.put('/api/transactions/:id', async (req, res) => {
    try {
        await client.connect();
        const db = client.db(dbName);
        
        const criteria = { _id: new ObjectId(req.params.id) };
        const updateDoc = {
            title: req.fields.title,
            amount: parseFloat(req.fields.amount),
            type: req.fields.type,
            category: req.fields.category,
            date: new Date(req.fields.date),
            description: req.fields.description,
            paymentMethod: req.fields.paymentMethod,
            updatedAt: new Date()
        };
        
        const result = await updateDocument(db, transactionsCollection, criteria, updateDoc);
        res.json({ success: true, modifiedCount: result.modifiedCount });
    } catch (error) {
        console.error("API update transaction error:", error);
        res.status(500).json({ error: "Failed to update transaction" });
    } finally {
        await client.close();
    }
});

app.delete('/api/transactions/:id', async (req, res) => {
    try {
        await client.connect();
        const db = client.db(dbName);
        
        const criteria = { _id: new ObjectId(req.params.id) };
        const result = await deleteDocument(db, transactionsCollection, criteria);
        res.json({ success: true, deletedCount: result.deletedCount });
    } catch (error) {
        console.error("API delete transaction error:", error);
        res.status(500).json({ error: "Failed to delete transaction" });
    } finally {
        await client.close();
    }
});

// Initialize database on startup
client.connect().then(async () => {
    const db = client.db(dbName);
    await initializeDatabase(db);
    console.log("Database initialized successfully");
}).catch(console.error);

// Root redirect
app.get('/', (req, res) => {
    res.redirect('/login');
});

// 404 handler
app.get('/*', (req, res) => {
    res.status(404).render('error', { message: `${req.path} - Page not found!` });
});

app.listen(process.env.PORT || 8099, () => {
    console.log(`Server running on port ${process.env.PORT || 8099}`);
});

