require('dotenv').config();
const express = require('express');
const { CosmosClient } = require('@azure/cosmos');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

// Multer setup for file uploads
const upload = multer({ dest: uploadsDir });

// Cosmos configuration
const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;
const databaseId = process.env.COSMOS_DATABASE_ID || 'SchoolDB';
const containerId = process.env.COSMOS_CONTAINER_ID || 'Contacts';

let container;

async function initCosmos() {
  if (!endpoint || !key) {
    console.warn('COSMOS_ENDPOINT or COSMOS_KEY not set. Cosmos DB operations will be skipped.');
    return;
  }

  const client = new CosmosClient({ endpoint, key });
  // Create database if not exists
  const { database } = await client.databases.createIfNotExists({ id: databaseId });
  // Create container if not exists
  const { container: createdContainer } = await database.containers.createIfNotExists({ id: containerId, partitionKey: { kind: 'Hash', paths: ['/partitionKey'] } });
  container = createdContainer;
  console.log(`Cosmos DB initialized: ${endpoint} -> DB: ${databaseId}, Container: ${containerId}`);
}

initCosmos().catch(err => console.error('Failed to initialize Cosmos:', err));

// Serve static files (site root)
app.use(express.static(__dirname));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Handle form submission
app.post('/submit', upload.single('attachment'), async (req, res) => {
  try {
    const fullName = req.body.fullName || '';
    const subject = req.body.subject || '';
    const message = req.body.message || '';
    // response may be array or single string
    let responsePrefs = req.body.response || [];
    if (!Array.isArray(responsePrefs)) responsePrefs = responsePrefs ? [responsePrefs] : [];
    const consent = req.body.consent === 'on' || req.body.consent === 'true' || req.body.consent === 'yes';

    if (!fullName || !subject || !message || !consent) {
      return res.status(400).send('Please fill required fields and give consent.');
    }

    const id = require('crypto').randomUUID();

    const item = {
      id,
      partitionKey: 'contacts',
      fullName,
      subject,
      message,
      responsePrefs,
      consent,
      createdAt: new Date().toISOString(),
    };

    if (req.file) {
      // Save attachment metadata and original filename
      item.attachment = {
        filename: req.file.filename, // stored name on disk
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        path: path.relative(__dirname, req.file.path).replace(/\\/g, '/'),
      };
    }

    if (container) {
      await container.items.create(item);
      console.log('Saved contact submission to Cosmos DB:', id);
    } else {
      // Fallback: save to local JSON file if Cosmos not configured
      const fallbackDir = path.join(__dirname, 'data');
      if (!fs.existsSync(fallbackDir)) fs.mkdirSync(fallbackDir);
      const filePath = path.join(fallbackDir, `${id}.json`);
      fs.writeFileSync(filePath, JSON.stringify(item, null, 2));
      console.log('Cosmos not configured. Saved submission locally:', filePath);
    }

    // Redirect back with a query param or send a simple message
    res.redirect('/contact_details.html?submitted=1');
  } catch (err) {
    console.error('Error saving submission:', err);
    res.status(500).send('Server error saving submission.');
  }
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
