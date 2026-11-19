# Deploying SetupOps

SetupOps runs as **one container on Google Cloud Run**: the Express server in [`server.ts`](../server.ts) serves the
built SPA from `dist/` and the `/api/diagnose` endpoint. Data lives in **Cloud Firestore**, sign-in uses
**Firebase Authentication**.

```
GitHub (manual "Deploy" workflow) ──► Cloud Build ──► Cloud Run service "setupops"
                                                         │  GEMINI_API_KEY from Secret Manager
Browser ──► Cloud Run URL ──► SPA ──► Firebase Auth / Firestore (security rules)
```

All commands below assume the [gcloud CLI](https://cloud.google.com/sdk/docs/install) and the
[Firebase CLI](https://firebase.google.com/docs/cli) are installed and you are logged in.

```bash
export PROJECT_ID=<your-gcp-project-id>     # same project as in firebase-applet-config.json
export REGION=europe-west3
gcloud config set project "$PROJECT_ID"
```

## 1 · Firestore rules and indexes

```bash
firebase use "$PROJECT_ID"
firebase deploy --only firestore
```

`firebase.json` targets the named Firestore database from `firebase-applet-config.json`. Redeploy whenever
`firestore.rules` changes — the rules are the authorization layer.

## 2 · Gemini API key → Secret Manager

```bash
gcloud services enable secretmanager.googleapis.com run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
printf '%s' "<your-gemini-api-key>" | gcloud secrets create gemini-api-key --data-file=-
```

## 3 · First deploy (from your machine)

```bash
gcloud run deploy setupops \
  --source . \
  --region "$REGION" \
  --allow-unauthenticated \
  --memory 512Mi --max-instances 3 \
  --set-secrets GEMINI_API_KEY=gemini-api-key:latest
```

Grant the Cloud Run runtime service account access to the secret if prompted
(`roles/secretmanager.secretAccessor`). The command prints the service URL.

## 4 · Allow Google sign-in on the new domain

Firebase Console → **Authentication → Settings → Authorized domains** → add the Cloud Run host
(e.g. `setupops-xxxxx.europe-west3.run.app`). Without this, the Google sign-in popup is rejected.

Recommended: Google Cloud Console → **APIs & Services → Credentials** → restrict the browser API key from
`firebase-applet-config.json` to your domains (HTTP referrers).

## 5 · Deploys from GitHub (optional)

[`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) deploys on demand (*Actions → Deploy to Cloud Run →
Run workflow*) using **Workload Identity Federation** — no long-lived service-account keys in GitHub.

```bash
# Service account used by GitHub Actions
gcloud iam service-accounts create github-deployer
SA="github-deployer@$PROJECT_ID.iam.gserviceaccount.com"
for role in roles/run.admin roles/cloudbuild.builds.editor roles/artifactregistry.admin \
            roles/storage.admin roles/iam.serviceAccountUser roles/secretmanager.secretAccessor; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" --member "serviceAccount:$SA" --role "$role"
done

# Workload identity pool + GitHub provider, restricted to your repository
gcloud iam workload-identity-pools create github --location global
gcloud iam workload-identity-pools providers create-oidc github \
  --location global --workload-identity-pool github \
  --issuer-uri https://token.actions.githubusercontent.com \
  --attribute-mapping "google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --attribute-condition "assertion.repository=='aydarusfarah/SetupOps-platform'"
POOL=$(gcloud iam workload-identity-pools describe github --location global --format 'value(name)')
gcloud iam service-accounts add-iam-policy-binding "$SA" \
  --role roles/iam.workloadIdentityUser \
  --member "principalSet://iam.googleapis.com/$POOL/attribute.repository/aydarusfarah/SetupOps-platform"
```

Then add these **repository secrets** (Settings → Secrets and variables → Actions):

| Secret | Value |
| --- | --- |
| `GCP_PROJECT_ID` | your project ID |
| `GCP_SERVICE_ACCOUNT` | `github-deployer@<project>.iam.gserviceaccount.com` |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | output of `gcloud iam workload-identity-pools providers describe github --location global --workload-identity-pool github --format 'value(name)'` |

The workflow runs in the `production` environment, so you can require a manual approval there.

## 6 · First administrator

The first account that signs in becomes Admin automatically. To grant or recover admin rights later:

```bash
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npm run set-admin -- someone@example.com
```

The user has to sign out and in again for the claim to take effect. Never commit the key file
(`service-account*.json` is git-ignored).

## Costs

With `--max-instances 3` and scale-to-zero, a portfolio/demo deployment stays within the Cloud Run and Firestore
free tiers in typical use. Gemini calls are capped per visitor by `DIAGNOSE_RATE_LIMIT`.
