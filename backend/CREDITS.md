# Daily AI credits

Authenticated users share **5 AI completion credits per day** across stay searches and itinerary actions. One backend completion reserves one credit atomically. Failed provider requests refund the reservation. Manual input and saved-data views cost nothing. Reset is midnight Asia/Kolkata; today's extra grants expire at reset.

The verified `sayantani.1001@gmail.com` account is unlimited. Only that verified identity can list Firebase Authentication users and grant an individual user +5 credits. The UI is not the authorization boundary.

## Server setup required

Set `GOOGLE_APPLICATION_CREDENTIALS` to the path of a Firebase service-account JSON file (use Render secret files in production). Never put this JSON in the frontend or commit it. Alternatively use Google Application Default Credentials on a supported host. Set `FIREBASE_PROJECT_ID=travelwithus-73db1`.

The server identity needs Firestore read/write access and Firebase Authentication user-list/user-read permissions. The daily counters live in `ai_credit_accounts/{uid}/days/{IST-date}`; request receipts are nested below that document, and grants are audited in `ai_credit_grants`.

**Do not grant clients writes** to `ai_credit_accounts` or `ai_credit_grants`. Merge `security/credits.firestore.rules.fragment` into your Firestore rules and remove overlapping broad write rules. All browser credit requests go through authenticated backend endpoints.

Endpoints: GET `/api/credits`; admin-only GET `/api/admin/users?page_token=...`; admin-only POST `/api/admin/users/{uid}/credits` with `{ "amount": 5 }`. User pagination is 50 accounts per page.

The current implementation does not run a daily job: each date gets a new counter document. A worker crash during provider execution can leave a reserved credit charged for that day; administrators can compensate with a grant. Configure retention/TTL for old request receipts if desired. Daily allowances supplement provider-wide rate limits and concurrency limits; they do not replace them.

## Local development

Local development can use an `authorized_user` ADC file from an existing, explicitly authorized Firebase CLI session. The local file is stored under `.secrets/`, which is ignored by Git, and referenced from `backend/.env`. Do not deploy personal refresh credentials to Render; use a dedicated service account in production.
