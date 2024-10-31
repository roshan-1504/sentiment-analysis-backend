const express = require('express');
const cors = require('cors');
const session = require('express-session');
const crypto = require('crypto');
const path = require('path');
const axios = require('axios');
const xss = require('xss');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(
    session({
        secret: crypto.randomBytes(32).toString('hex'),
        resave: false,
        saveUninitialized: false,
    })
);

// Model endpoints configuration
const modelEndpoints = {
    'logistic_regression': 'https://sentiment-analysis-service-378060679348.us-central1.run.app/predict',  // Replace with your URL
    'cnn': 'https://cnn-xxxxx-uc.a.run.app/predict',  // Replace with your URL
    // Add other model endpoints here
};

// Authentication routes
app.post('/login', async (req, res) => {
    const username = req.body.username;
    try {
        const sanitizedUsername = xss(username);
        if (sanitizedUsername === "NLP") {
            req.session.username = sanitizedUsername;
            res.status(200).send({ message: 'Login successful' });
        } else {
            res.status(401).json({ message: 'Unauthorized: Invalid username' });
        }
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get available models
app.get('/models', (req, res) => {
    const models = Object.keys(modelEndpoints).map(key => ({
        id: key,
        name: key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    }));
    res.json(models);
});

// Main prediction endpoint
app.post('/analyze', async (req, res) => {
    const { text, model } = req.body;

    if (!text || !model) {
        return res.status(400).json({ error: 'Text and model selection are required' });
    }

    try {
        // Get the endpoint URL for the selected model
        const modelUrl = modelEndpoints[model];
        if (!modelUrl) {
            return res.status(400).json({ error: 'Invalid model selection' });
        }

        // Make prediction request to the selected model's endpoint
        const response = await axios.post(modelUrl, { text });
        
        // Return the prediction results
        res.json({
            sentiment: response.data.sentiment,
            confidence: response.data.confidence,
            model: model
        });
    } catch (error) {
        console.error('Error processing prediction:', error.message);
        res.status(500).json({ 
            error: 'Failed to get prediction',
            details: error.message 
        });
    }
});

// Protected route check
app.use((req, res, next) => {
    if (req.path !== '/login' && !req.session.username) {
        return res.status(401).json({ message: 'Authentication required' });
    }
    next();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});