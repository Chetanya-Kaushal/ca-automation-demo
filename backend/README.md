# Ledger Hackers — document intake backend

One Cloudflare Worker that receives client documents from **WhatsApp**, **email** and a **web upload page**, works out which client and document type each file is, files the confident ones automatically and puts the rest in a review queue for the CA team. Every staff confirmation becomes a rule, so the same kind of file is filed automatically next time.

Runs entirely on Cloudflare's free plan: Workers, D1 (database) and KV (file storage). No card needed.

| Path | What it is |
|---|---|
| `/` | Launch site: Next.js + Three.js + GSAP scroll story, built from `../web` into `public/` |
| `/demo?embed=1` | Interactive scripted demo, shown inside the launch site |
| `/app` | Staff dashboard: review queue, all documents, deadlines, clients, staff upload |
| `/upload?t=…` | A client's private upload page (link copied from the Clients tab) |
| `/webhooks/whatsapp` | Meta WhatsApp Cloud API webhook |
| email | Cloudflare Email Routing delivers mail to the Worker's `email()` handler |

## Deadlines, reminders and delivery

In the dashboard's **Deadlines** tab, add a filing (client, name, due date, documents the client must send).

- **Every day at 09:00 IST** (cron in `wrangler.toml`) the Worker checks each open filing against the documents received. If something is missing it sends a WhatsApp reminder: first any time within 7 days of the due date, then at 3 days, 1 day, and daily once due or overdue. Never twice within 20 hours.
- **Escalation**: with a day or less left and a reminder already ignored, the filing is flagged *Escalated* and logged so a CA calls the client.
- **Replies**: when the client sends a file on WhatsApp, the auto-reply lists what's still missing for their open filings.
- **Send reminder now** sends one immediately.
- **Mark filed and send to client**: attach the filed return / acknowledgement; it's sent to the client on WhatsApp as a document.
- Everything sent or failed appears in the **Reminder and delivery log**, with Meta's reason on failure.

### The 24-hour rule (why templates matter)

WhatsApp only lets a business send free-form messages within 24 hours of the client's last message. Reminders and deliveries are usually outside that window, so they need **message templates approved by Meta**. Without them, reminders only reach clients who wrote recently, and the log shows *"Client has not messaged in the last 24 hours"*.

Create two templates in WhatsApp Manager → Message templates (category **Utility**, language **English**):

| Name | Header | Body |
|---|---|---|
| `document_reminder` | none | `Hi {{1}}, a reminder from Ledger Hackers: your {{2}} {{3}}. We still need: {{4}}. Reply here with the files.` |
| `filing_delivered` | **Document** | `Hi {{1}}, your {{2}} has been filed. Acknowledgement: {{3}}. Your copy is attached.` |

Once approved, set them in `wrangler.toml` and redeploy:

```toml
WHATSAPP_REMINDER_TEMPLATE = "document_reminder"
WHATSAPP_DELIVERY_TEMPLATE = "filing_delivered"
```

Use `WHATSAPP_TEMPLATE_LANG` if you created them in a language other than `en`.

## How documents are sorted

No AI. `src/classify.js` uses, in order:

1. **PAN in the filename** that matches a client → 99%.
2. **Learned rule**: a CA confirmed a file with the same name shape before (`ITR_Rajesh_2024.pdf` → `itr_rajesh`) → 97%.
3. **Name in the filename** + **who sent it** (phone, email or upload link, and their family/company group).

85% or more is filed automatically; anything less, ambiguous, or of an unrecognised type goes to review.

## Run locally

```bash
npm install
cp .dev.vars.example .dev.vars   # then set STAFF_TOKEN to any long random string
npm run db:local
npm run dev                      # http://localhost:8787
npm test                         # classifier tests
```

Test email intake locally:

```bash
curl -X POST "http://localhost:8787/cdn-cgi/handler/email?from=a@example.com&to=docs@example.com" --data-binary @mail.eml
```

## Deploy (free)

1. Log in once: `npx wrangler login`
2. Create the database and file store, then paste the printed ids into `wrangler.toml`:
   ```bash
   npx wrangler d1 create ledger-hackers
   npx wrangler kv namespace create FILES
   ```
3. Create the tables: `npm run db:remote`
   (Databases created before deadlines existed: also run `npx wrangler d1 execute ledger-hackers --remote --file migrations-002-filings.sql` once.)
4. Choose the staff password (you'll type it into the dashboard): `npx wrangler secret put STAFF_TOKEN`
5. `npm run deploy` (builds `../web` first, so run `npm install` there once) → prints `https://ledger-hackers.<you>.workers.dev`

## Connect WhatsApp

1. At developers.facebook.com create an app → add **WhatsApp**. Meta gives you a free test number.
2. Add the phone numbers you'll test from as recipients (test numbers can only message those).
3. Set the secrets:
   ```bash
   npx wrangler secret put WHATSAPP_TOKEN          # access token (create a permanent System User token for production)
   npx wrangler secret put WHATSAPP_APP_SECRET     # App settings → Basic → App secret
   npx wrangler secret put WHATSAPP_VERIFY_TOKEN   # any random string you choose
   ```
   and put the **Phone number ID** in `wrangler.toml` under `WHATSAPP_PHONE_ID`, then `npm run deploy`.
4. In WhatsApp → Configuration, set the webhook URL to `https://<your worker>/webhooks/whatsapp`, the verify token to the one you chose, and subscribe to **messages**.

Clients' phone numbers in the Clients tab must match the WhatsApp number they send from (last 10 digits are compared).

## Connect email

Needs a domain whose DNS is on Cloudflare.

1. Dashboard → your domain → **Email** → **Email Routing** → enable.
2. **Routing rules** → custom address, e.g. `docs@yourdomain.com` → action **Send to a Worker** → `ledger-hackers`.

Clients' email addresses in the Clients tab are used to match the sender.

## Limits to know

- **Filenames only.** The classifier never reads inside a file. A scan called `IMG_2041.jpg` from a family sender will always need review.
- **KV free tier**: 1,000 file writes per day, 1 GB total, 20 MB per file here. Move to R2 when you outgrow it (needs a card on file, still has a free tier).
- **One shared staff token**, not per-person accounts. Fine for a small team; add Cloudflare Access for named logins.
- Email intake does not send a reply to the client; WhatsApp does. Reminders and deliveries go by WhatsApp only.
- Reminders count documents of the required **types** received in the 120 days before the due date; a wrongly typed file won't tick the box until a CA corrects its type.
- Sample-data only until you've checked this against your firm's data-protection obligations (DPDP Act): files contain PAN and financial data.
