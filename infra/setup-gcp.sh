#!/usr/bin/env bash
#
# The federation's own Google Cloud project for this website, set up from
# nothing. Safe to re-run: every step checks first and skips what exists.
#
# The project belongs to PZSurf (the pzsurf.pl organisation), not to the
# Shoreside platform. The site only READS the platform's public API at build
# time; hosting it is the federation's business. So the project holds exactly
# one thing to serve and one identity to deploy it:
#
#   - Firebase Hosting, the default site (<project>.web.app);
#   - service account `site-deployer`, roles/firebasehosting.admin, nothing else;
#   - a Workload Identity pool that trusts GitHub Actions in THIS repository
#     only, so the deploy workflow needs no key.
#
# No Cloud Run, no database, no billing account: Hosting on Firebase's free
# plan is enough for a static site.
#
# Run by a pzsurf.pl organisation admin, in their own terminal:
#   gcloud auth login            (the pzsurf.pl account)
#   firebase login               (the same account)
#   infra/setup-gcp.sh
# It prints the two values the deploy workflow reads as repository secrets.
set -euo pipefail

PROJECT=${PROJECT:-pzsurf-web}
PROJECT_NAME=${PROJECT_NAME:-"PZSurf web"}
ORG_ID=${ORG_ID:-676764170182}              # pzsurf.pl
REPO=${REPO:-pzsurf/pzsurf-pl}
SA_ID=site-deployer
POOL=github-pool
PROVIDER=github
SA="$SA_ID@$PROJECT.iam.gserviceaccount.com"

say() { echo "==> $*"; }

if ! gcloud projects describe "$PROJECT" >/dev/null 2>&1; then
  say "Creating project $PROJECT in organisation $ORG_ID"
  gcloud projects create "$PROJECT" --organization="$ORG_ID" --name="$PROJECT_NAME"
fi
NUMBER=$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')

say "Enabling the APIs Hosting and keyless deploys need"
gcloud services enable --project "$PROJECT" \
  firebase.googleapis.com firebasehosting.googleapis.com \
  iam.googleapis.com iamcredentials.googleapis.com sts.googleapis.com

# Adding Firebase also creates the default Hosting site, named after the project.
firebase_added() {
  curl -sf -o /dev/null "https://firebase.googleapis.com/v1beta1/projects/$PROJECT" \
    -H "Authorization: Bearer $(gcloud auth print-access-token)" -H "x-goog-user-project: $PROJECT"
}
if ! firebase_added; then
  say "Adding Firebase to $PROJECT"
  firebase projects:addfirebase "$PROJECT"
fi

if ! gcloud iam service-accounts describe "$SA" --project "$PROJECT" >/dev/null 2>&1; then
  say "Creating $SA"
  gcloud iam service-accounts create "$SA_ID" --project "$PROJECT" \
    --display-name="Deploys the website to Firebase Hosting" \
    --description="Used by GitHub Actions in $REPO through Workload Identity. Hosting only."
fi
gcloud projects add-iam-policy-binding "$PROJECT" --condition=None --quiet \
  --member="serviceAccount:$SA" --role=roles/firebasehosting.admin >/dev/null

if ! gcloud iam workload-identity-pools describe "$POOL" --location=global --project "$PROJECT" >/dev/null 2>&1; then
  say "Creating Workload Identity pool $POOL"
  gcloud iam workload-identity-pools create "$POOL" --location=global --project "$PROJECT" \
    --display-name="GitHub Actions"
fi
if ! gcloud iam workload-identity-pools providers describe "$PROVIDER" --location=global \
     --workload-identity-pool="$POOL" --project "$PROJECT" >/dev/null 2>&1; then
  say "Creating provider $PROVIDER, trusting $REPO only"
  # The condition names the repository exactly. Never widen it to the owner
  # (assertion.repository_owner): that would let any repository of the
  # organisation deploy this site.
  gcloud iam workload-identity-pools providers create-oidc "$PROVIDER" --location=global \
    --workload-identity-pool="$POOL" --project "$PROJECT" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
    --attribute-condition="assertion.repository=='$REPO'"
fi
gcloud iam service-accounts add-iam-policy-binding "$SA" --project "$PROJECT" --quiet \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/$NUMBER/locations/global/workloadIdentityPools/$POOL/attribute.repository/$REPO" >/dev/null

cat <<EOF

Done. Repository secrets for $REPO:
  GCP_WORKLOAD_IDENTITY_PROVIDER = projects/$NUMBER/locations/global/workloadIdentityPools/$POOL/providers/$PROVIDER
  GCP_SITE_SERVICE_ACCOUNT       = $SA
The site is https://$PROJECT.web.app — firebase.json's "site" is "$PROJECT".
EOF
