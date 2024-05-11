const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const geoip = require('geoip-lite');

const app = express();
const PORT = process.env.PORT || 3000;

// Static token for authentication
const authToken = '1234';

// Middleware to authenticate requests using a Bearer token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token || token !== authToken) {
        return res.sendStatus(401);
    }
    next();
};

// Middleware to log IP location
const logIP = (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const geo = geoip.lookup(ip);
    console.log('IP:', ip);
    console.log('Location:', geo);
    next();
};

// CORS middleware
app.use(cors());

// IP location logging middleware
app.use(logIP);

// Define a route to fetch and parse product information from various e-commerce websites
app.get('/product', authenticateToken, async (req, res) => {
    try {
        const productUrl = req.query.url;
        const location = req.query.location; // Location parameter
        console.log('Received request for product URL:', productUrl);
        console.log('Location:', location);

        // Extract domain from the URL
        const match = productUrl.match(/https?:\/\/(?:www\.)?([^\/]+)/i);
        if (!match) {
            console.error('Invalid product URL:', productUrl);
            return res.status(400).json({ error: 'Invalid product URL' });
        }
        const domain = match[1];
        console.log('Extracted domain:', domain);

        // Set the Accept-Language header based on the location
        let acceptLanguage;
        switch (location) {
            case 'us':
                acceptLanguage = 'en-US,en;q=0.9'; // Set to US English
                break;
            case 'au':
                acceptLanguage = 'en-AU,en;q=0.9'; // Set to Australian English
                break;
            default:
                acceptLanguage = 'en-US,en;q=0.9'; // Default to US English
                break;
        }

        // Fetch HTML content of the product page
        const response = await axios.get(productUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
                'Accept-Language': acceptLanguage
            }
        });
        console.log('Fetched HTML content from:', productUrl);
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for 5 seconds (adjust as needed)
        const html = response.data;

        // Parse the HTML using Cheerio
        const $ = cheerio.load(html);

        let title, price, image, details;

        // Extract product information based on the domain
        switch (domain) {
            case 'amazon.com':
                title = $('#productTitle').text().trim();
                price = $('#corePriceDisplay_desktop_feature_div > div.a-section.a-spacing-none.aok-align-center.aok-relative > span.a-price.aok-align-center.reinventPricePriceToPayMargin.priceToPay > span:nth-child(2)').text().trim();
                image = $('#landingImage').attr('src');
                details = $('#feature-bullets').text().trim();
                break;
            case 'amazon.in':
                title = $('#productTitle').text().trim();
                price = $('#corePrice_feature_div > div > div > span.a-price.aok-align-center > span.a-offscreen').text().trim();
                image = $('#landingImage').attr('src');
                break;
            case 'amazon.ca':
                title = $('#productTitle').text().trim();
                price = $('#corePrice_feature_div > div > div > span.a-price.aok-align-center > span.a-offscreen').text().trim();
                image = $('#landingImage').attr('src');
                break;
            case 'amazon.es':
                title = $('#productTitle').text().trim();
                price = $('#corePrice_feature_div > div > div > span.a-price.aok-align-center > span.a-offscreen').text().trim();
                image = $('#landingImage').attr('src');
                break;
            // Add cases for other e-commerce websites as needed
            default:
                console.error('Unsupported website:', domain);
                return res.status(400).json({ error: 'Unsupported website' });
        }

        // Construct a payload with the extracted information
        const payload = {
            title,
            price,
            image,
            details,
            url: productUrl
        };

        // Post the payload to the webhook
        // await axios.post('https://n8n.vosaryai.com/webhook/cba727ad-8e07-4900-937d-794371ee96fa', payload);

        // Construct a response object with the extracted information
        const productInfo = {
            title,
            price,
            image,
            details
        };

        // Set cache control headers
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate'); // HTTP 1.1.
        res.setHeader('Pragma', 'no-cache'); // HTTP 1.0.
        res.setHeader('Expires', '0'); // Proxies.

        // Send the response
        console.log('Sending product information:', productInfo);
        res.json(productInfo);
    } catch (error) {
        console.error('Error fetching/parsing product:', error);
        res.status(500).json({ error: 'Failed to fetch/parse product information' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
