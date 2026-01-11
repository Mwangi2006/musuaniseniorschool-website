# Musuani Secondary School - Contact Backend

This project adds a simple Node.js backend to accept contact form submissions from `contact_details.html` and store them in Azure Cosmos DB. If Cosmos DB is not configured (no endpoint/key), submissions are saved locally under `data/` and uploaded files under `uploads/`.

Quick start (local):

1. Copy `.env.example` to `.env` and set `COSMOS_ENDPOINT` and `COSMOS_KEY` if you want to use Azure Cosmos DB. Otherwise leave blank to use local fallback storage.

2. Install dependencies:

```bash
npm install
```

3. Run the server:

```bash
npm start
```

4. Open the contact page in your browser:

http://localhost:3000/contact_details.html

After submission you will be redirected back to the contact page with `?submitted=1`.

Notes:
- The server will attempt to create the database/container in Cosmos automatically if credentials are provided.
- Attachments are stored in `uploads/` (local) and metadata recorded in the DB/local JSON file.
- For production, deploy to Azure App Service and set the environment variables securely in App Settings.
