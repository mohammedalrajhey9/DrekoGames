Reindex users for case-insensitive search

This project stores `displayNameLower` and `emailLower` fields to support fast case-insensitive prefix search.

To populate these fields for existing users, run the provided script using the Firebase Admin SDK:

1. Install dependencies (from project root):

```bash
npm install firebase-admin
```

2. Create or obtain a Firebase service account JSON and set the environment variable:

```bash
# Windows (PowerShell)
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\serviceAccount.json"

# macOS / Linux
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccount.json"
```

3. Run the script:

```bash
node scripts/reindexDisplayName.js
```

The script will iterate user documents and write `displayNameLower` and `emailLower`.
