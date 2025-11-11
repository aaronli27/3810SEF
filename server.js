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
    let findResults = [];
    let collection = db.collection(collectionName);
    console.log(`findCriteria: ${JSON.stringify(criteria)}`);
    findResults = await collection.find(criteria).toArray();
    console.log(`findDocument: ${findResults.length}`);
    console.log(`findResults: ${JSON.stringify(findResults)}`);
    return findResults;
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
    res.redirect('/dashboard');
});

app.get('/logout', (req, res) => {
    req.session = null;
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

// ... (keep all your other routes - they look correct)

const PORT = process.env.PORT || 3000;

// REMOVED duplicate client.connect() - only keep this one:
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

