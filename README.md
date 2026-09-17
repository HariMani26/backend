# Backend

## Azure Photo and File Storage

Photos/thumbnails and generic files live in two dedicated **private** Blob
containers on the same storage account. Set these values in the backend
environment and restart the API:

```dotenv
AZURE_STORAGE_ACCOUNT_NAME=<your-storage-account-name>
AZURE_STORAGE_CONTAINER_PHOTOS=photos
AZURE_STORAGE_CONTAINER_FILES=files
```

The local environment already selects `photos` and `files` on the
`materuploads2026` account. The first upload creates each container if it does
not exist. File bytes go to Azure, while MongoDB's `uploadedfiles` collection
stores ownership, category, blob and thumbnail names, original filename, MIME
type, size, verification status, and timestamps. The existing photo/document
upload controls need no frontend changes.

Container routing by upload category:

| Category (`type`) | Container |
| --- | --- |
| `profile-image`, `gallery`, `horoscope` (image), `chat-image` | `photos` |
| `document`, `horoscope` (PDF/DOCX), `temp` | `files` |

### Azure Setup

1. Create a StorageV2 account in your Azure subscription and desired region.
	Use Standard LRS unless your availability requirements need more redundancy.
	Require HTTPS and TLS 1.2 or later, disable anonymous blob access, and
	disable shared-key access so only Entra ID identities can authenticate.
2. Create the two private containers (`photos`, `files`) with public access
	set to `off`.
3. Assign **Storage Blob Data Contributor** at the storage-account scope to
	the backend's managed identity. For local development, assign the role to
	your developer identity and sign in using a supported local Azure credential.
	Account scope is needed to create containers and issue user-delegation keys.
4. Set the three environment variables above. `DefaultAzureCredential` uses the
	local developer identity or the Azure-hosted managed identity — no
	connection string or account key is required or supported when
	`AZURE_STORAGE_ACCOUNT_NAME` is set. Ensure network rules allow your backend
	to access the account.
5. Restart the backend and upload a photo and PDF through the app. Verify their
	blobs in `photos`/`files` and their metadata in MongoDB. Reads use
	short-lived, read-only user-delegation SAS URLs generated per request; never
	make either container public to display photos or documents.

An existing `AZURE_STORAGE_CONNECTION_STRING` remains supported only when
`AZURE_STORAGE_ACCOUNT_NAME` is unset (e.g. Azurite/local emulator). Keep it
only in a private environment or secret store, never in frontend code or
source control. Account-name (managed identity) authentication always takes
precedence over the connection string.

A legacy `AZURE_STORAGE_CONTAINER_NAME` (single shared container) and the
original per-category `AZURE_CONTAINER_*` variables remain supported as
fallbacks, in that priority order, for deployments that have not migrated to
the photos/files split. Do not change any of these container settings for an
account with existing uploads until those blobs have been copied to the new
container with their original blob names — changing it does not migrate blobs
automatically.

Run focused tests from this directory:

```powershell
npx jest src/services/blobStorage.service.spec.ts src/services/upload.integration.spec.ts --runInBand --coverage=false
npm run typecheck
```

Storage tests mock Azure SDK calls. Persistence tests use a temporary MongoDB
instance, not the application database. Live Azure access must be checked after
the subscription, account, identity permissions, and environment are configured.

References: [Azure JavaScript authentication](https://learn.microsoft.com/azure/developer/javascript/sdk/authentication/overview),
[user-delegation SAS](https://learn.microsoft.com/azure/storage/blobs/storage-blob-create-user-delegation-sas-javascript),
[Blob data roles](https://learn.microsoft.com/azure/storage/blobs/assign-azure-role-data-access).

## Local Screen Test Data

Run from the workspace root:

```powershell
npm --prefix backend run seed:test-users -- --check
npm --prefix backend run seed:test-users -- --quiet
```

The first command validates fixtures without connecting to MongoDB. The second
inserts into **mongodb://127.0.0.1:27017/weour_matrimony** only and requires
development mode (set by the npm script). It makes no real payments and sends no
SMS or emails. Do not use these fictional identities outside local development.

### Test Accounts

All newly created accounts use the local test password `Test@12345678`.
Existing passwords, memberships, and edited profiles are preserved on rerun.
Only missing optional details on the two original test profiles are filled in.

| Scenario | Email | Mobile |
| --- | --- | --- |
| Admin | admin@test.weour.example | 9000000001 |
| Paid member with interests and chats | paid@test.weour.example | 9000000002 |
| Unpaid member with received interests | unpaid@test.weour.example | 9000000003 |
| Paid groom | member001@test.weour.example | 9000010001 |
| Paid bride | member002@test.weour.example | 9000010002 |
| Unpaid groom | member003@test.weour.example | 9000010003 |
| Expired bride | member004@test.weour.example | 9000010004 |
| Unverified | member047@test.weour.example | 9000010047 |
| Rejected | member048@test.weour.example | 9000010048 |
| Suspended | member051@test.weour.example | 9000010051 |
| Refunded | member052@test.weour.example | 9000010052 |
| Pending unpaid quick member | edge-pending-unpaid@test.weour.example | 9000090001 |
| Pending paid member | edge-pending-paid@test.weour.example | 9000090002 |
| Verified unpaid member | edge-verified-unpaid@test.weour.example | 9000090003 |
| Verified expired member | edge-verified-expired@test.weour.example | 9000090004 |
| Rejected paid member | edge-rejected-paid@test.weour.example | 9000090005 |
| Suspended paid member | edge-suspended-paid@test.weour.example | 9000090006 |
| Refunded edge member | edge-refunded@test.weour.example | 9000090007 |
| Hidden photo/contact member | edge-private-member@test.weour.example | 9000090008 |
| Exactly 18 when first seeded | edge-adult-boundary@test.weour.example | 9000090009 |

Generated accounts continue through `member084@test.weour.example`, mobile
`9000010084`. Member login uses the app's existing authentication flow; this seed
does not bypass OTP or change authentication settings.

### Screen Coverage

- 95 members plus one admin, with 44 full-access and 51 unpaid/expired/blocked members.
- 65 public-searchable profiles before viewer-specific filters, including pending verification cases.
- Detailed profiles, 10 districts, 12 kulams, varied ages, careers and family details.
- 95 partner preferences for profile editing and matches.
- 24 married profiles forming 12 couples: eight published, two submitted and two declined stories.
- Stories span three years and include featured, hidden-name and hidden-location cases.
- 349 interests with read/unread states, including incoming interests for the unpaid test account.
- 95 conversations with 570 messages between eligible paid members only.
- 70 synthetic payment records, including active, expired and refunded history.

Refresh the app at http://localhost:4202/search after seeding. Use the paid test
account for conversations and full-access profile testing; unpaid accounts retain
the application's normal restrictions. Unpaid chat screens may correctly be empty.

The script preserves existing fixture records on reruns and does not remove any
users. Counts can differ after manual testing. It does not reset read states,
passwords, story moderation, or membership expiry.

Photos/gallery files are deliberately not seeded: Azure Blob Storage is not
configured locally. Existing UI placeholders remain until real test media is
uploaded through configured storage. Tamil story fields currently contain marked
English demo text, not translated testimonials.

## Admin Manual Creation and Approval

`POST /admin/users` (also under `/api/admin/users`) accepts `{ mobile, profile, consentConfirmed: true, reason }`; profile uses quick-registration fields and a YYYY-MM-DD DOB. New accounts remain normal phone-unverified users; profiles remain identity-unverified and unpaid. Existing mobile numbers are rejected, not overwritten.

Creation and moderation require MongoDB transactions, so configure a replica set or sharded deployment. The currently observed local standalone MongoDB cannot perform these writes. Restart a non-watching backend debug process after route changes.

Run the non-destructive integration suite from this directory:

```powershell
npx jest src/services/admin.integration.spec.ts --runInBand --coverage=false
```

It starts its own temporary replica set on a random port using mongodb-memory-server, checks real persistence/rollback, and shuts it down afterward. It never clears the application database. The first run downloads a MongoDB binary. The workspace manual-test-cases.md contains the full UI/manual checklist and account-state matrix.
