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
const cookieSession = require('cookie-session');

app.use(cookieSession({
    name: 'session',
    keys: ['your-secret-key-here'],
    maxAge: 24 * 60 * 60 * 1000
}));
app.use(formidable());

/* Model - mongodb modules
mongodb ^6.9: https://www.npmjs.com/package/mongodb
*/
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const url = 'mongodb+srv://Aaronli:Aaron@cluster0.fwfuo0a.mongodb.net/';  
const client = new MongoClient(url, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
}); // FIXED: Removed extra parenthesis

const dbName = 'project_PFT';

// collections
const usersCollection = "users";
const transactionsCollection = "transactions";

// Views
app.set('view engine', 'ejs');

// initialize
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
                password: "Ken123",
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
        const MaryUserId = insertedUsers[2]._id; // FIXED: Mary is 3rd user (index 2)
        
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
                category: "Food",
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

const insertDocument = async (db, collectionName, doc) => {
    const collection = db.collection(collectionName);
    const results = await collection.insertOne(doc);
    console.log("insert one document:" + JSON.stringify(results));
    return results;
}

const findDocument = async (db, collectionName, criteria) => {
    try {
        console.log(`Searching in ${collectionName} with criteria:`, criteria);
        const collection = db.collection(collectionName);
        const findResults = await collection.find(criteria).toArray();
        console.log(`Found ${findResults.length} documents in ${collectionName}`);
        return findResults;
    } catch (error) {
        console.error('Error in findDocument:', error);
        return [];
    }
};

const updateDocument = async (db, collectionName, criteria, updateDoc) => {
    let updateResults = [];
    let collection = db.collection(collectionName);
    console.log(`updateCriteria: ${JSON.stringify(criteria)}`);
    updateResults = await collection.updateOne(criteria, {$set : updateDoc});
    console.log(`updateResults: ${JSON.stringify(updateResults)}`);
    return updateResults;
}

const deleteDocument = async (db, collectionName, criteria) => { // ADDED missing function
    const collection = db.collection(collectionName);
    const deleteResults = await collection.deleteOne(criteria);
    console.log(`Delete results: ${JSON.stringify(deleteResults)}`);
    return deleteResults;
};

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

// Routes
app.get('/', (req, res) => {
    res.redirect('/login');
});

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
    res.redirect('/transactions');
});

app.get('/signup', (req, res) => {
    res.status(200).render('signup', { 
        error: null,
        user: null
    });
});

app.post('/signup', async (req, res) => {
    try {
        await client.connect();
        const db = client.db(dbName);
        
        const { username, email, password, confirmPassword } = req.fields;
        
        // Validation
        if (!username || !email || !password || !confirmPassword) {
            return res.status(200).render('signup', { 
                error: "All fields are required",
                user: null
            });
        }
        
        if (password !== confirmPassword) {
            return res.status(200).render('signup', { 
                error: "Passwords do not match",
                user: null
            });
        }
        
        if (password.length < 6) {
            return res.status(200).render('signup', { 
                error: "Password must be at least 6 characters",
                user: null
            });
        }
        
        // Check if user already exists
        const existingUser = await db.collection(usersCollection).findOne({
            $or: [
                { username: username },
                { email: email }
            ]
        });
        
        if (existingUser) {
            return res.status(200).render('signup', { 
                error: "Username or email already exists",
                user: null
            });
        }
        
        // Create new user
        const newUser = {
            username: username,
            email: email,
            password: password, // In production, hash this!
            createdAt: new Date()
        };
        
        const result = await insertDocument(db, usersCollection, newUser);

        req.session = null;
        res.redirect('/login');
        
    } catch (error) {
        console.error("Signup error:", error);
        res.status(500).render('error', { message: "Signup failed" });
    } finally {
        await client.close();
    }
});

app.get('/logout', (req, res) => {
    req.session = null;
    res.redirect('/login');
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



const PORT = process.env.PORT || 3000;

client.connect().then(async () => {
    const db = client.db(dbName);
    await initializeDatabase(db);
    console.log("Database initialized successfully");
    
    app.listen(PORT, () => {
        console.log(`✅ Server running on http://localhost:${PORT}`);
    });
}).catch(error => {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
});







