# Deploying SetupOps

SetupOps runs as **one container on Google Cloud Run**: the Express server in [`server.ts`](../server.ts) serves the
built SPA from `dist/` and the `/api/diagnose` endpoint. Data lives in **Cloud Firestore**, sign-in uses
**Firebase Authentication**.

```
GitHub (manual "Deploy" workflow) ──► Cloud Build ──► Cloud Run service "setupops"
                                                         │  runs as service account setupops-run
                                                         └─► Gemini on Vertex AI (no API key)
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

## 2 · Service account for the app (keyless Gemini)

The server calls Gemini through **Vertex AI** with the identity of a dedicated service account — there is no
API key to store, rotate or leak. (New Google Cloud organizations block API-key creation by default; this
approach works with that policy.)

```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com aiplatform.googleapis.com
gcloud iam service-accounts create setupops-run --display-name "SetupOps Cloud Run runtime"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member "serviceAccount:setupops-run@$PROJECT_ID.iam.gserviceaccount.com" \
  --role roles/aiplatform.user
```

**New Google Cloud accounts:** organizations created with secure-by-default policies no longer give the default
compute service account (used by Cloud Build for `--source` deploys) any roles. Grant it the builder role once:

```bash
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format 'value(projectNumber)')
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member "serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role roles/run.builder
```

The runtime account gets only `roles/aiplatform.user`. Firestore access happens in the browser with the signed-in
user's identity and is governed by the security rules, so the server needs no database rights.

## 3 · Deploy (from your machine)

```bash
gcloud run deploy setupops \
  --source . \
  --region "$REGION" \
  --service-account "setupops-run@$PROJECT_ID.iam.gserviceaccount.com" \
  --set-env-vars "VERTEX_PROJECT=$PROJECT_ID,VERTEX_LOCATION=global" \
  --allow-unauthenticated \
  --memory 512Mi --max-instances 3
```

The command builds the Dockerfile with Cloud Build and prints the service URL. Alternatively set
`GEMINI_API_KEY` (e.g. via `--set-secrets`) to use the Gemini Developer API with a key instead.

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
            roles/storage.admin roles/iam.serviceAccountUser; do
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
free tiers in typical use. Gemini calls (billed through Vertex AI) are capped per visitor by `DIAGNOSE_RATE_LIMIT`.
