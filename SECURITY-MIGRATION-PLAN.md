# GCP Security Migration Plan
## Default Compute Service Account Remediation

**Date**: 2025-12-21
**Status**: Phase 1 Complete ✅
**Risk Level**: 🔴 HIGH (Default compute SA has Editor role)

---

## Executive Summary

During the security audit of the "Whispers of the Wildwood" GCP project, we identified **3 services still using the default compute service account** with overly permissive Editor role. This document outlines the migration plan to fix this security vulnerability.

---

## Services Affected

The following Cloud Run services are using the default compute service account (`50477513015-compute@developer.gserviceaccount.com`) with **Editor role**:

1. **swiss-naturalization-quiz** (europe-north1)
2. **wildwood-backend** (europe-north2)
3. **wildwood-frontend** (europe-north2)

**Risk**: If any of these services are compromised, the attacker gains Editor-level access to the entire GCP project, allowing them to:
- Create/delete/modify all GCP resources
- Access all storage buckets
- Modify IAM policies
- Delete production services
- Access secrets

---

## What Was Fixed (Phase 1 Complete ✅)

### AI Top Trumps Card Generator
- ✅ Already using dedicated service account: `github-actions@whispers-of-the-wildwood.iam.gserviceaccount.com`
- ✅ Storage permissions reduced from `storage.admin` → `storage.objectCreator` + `storage.objectViewer`
- ✅ Removed redundant `artifactregistry.admin` role
- ✅ Scoped secret access to only required secrets
- ✅ Tested in UAT and deployed to production
- ✅ All functionality working with reduced permissions

**Result**: AI Top Trumps now follows least-privilege security model ✅

---

## Migration Plan for Remaining Services

### Recommended Approach: Create Dedicated Service Accounts

Each service should have its own dedicated service account with ONLY the permissions it needs.

### Step 1: Identify Required Permissions

For each service, determine what GCP services it actually uses:

#### swiss-naturalization-quiz
**Likely Permissions Needed**:
- `roles/run.invoker` - To invoke other Cloud Run services (if needed)
- `roles/storage.objectViewer` - If it reads from Cloud Storage
- `roles/storage.objectCreator` - If it writes to Cloud Storage
- `roles/secretmanager.secretAccessor` - To access secrets
- `roles/cloudtrace.agent` - For tracing (optional)
- `roles/logging.logWriter` - For logging

**Investigation Needed**:
```bash
# Check what the service actually does
gcloud run services describe swiss-naturalization-quiz --region=europe-north1 --format=yaml

# Check logs for permission usage
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="swiss-naturalization-quiz"' \
  --limit=100 --format=json | grep -i "permission\|access\|denied"
```

#### wildwood-backend
**Likely Permissions Needed**:
- `roles/storage.objectAdmin` - For backend storage operations
- `roles/secretmanager.secretAccessor` - To access secrets
- `roles/run.invoker` - If it calls other services
- Database permissions (if using Cloud SQL, Firestore, etc.)

**Investigation Needed**: Same as above, replace service name

#### wildwood-frontend
**Likely Permissions Needed**:
- Minimal permissions (frontend usually doesn't need much)
- `roles/run.invoker` - To call backend services
- Possibly no secret access needed if all secrets are in backend

**Investigation Needed**: Same as above, replace service name

---

### Step 2: Create Dedicated Service Accounts

```bash
# For swiss-naturalization-quiz
gcloud iam service-accounts create swiss-quiz-runtime \
  --display-name="Swiss Naturalization Quiz Runtime SA" \
  --project=whispers-of-the-wildwood

# For wildwood-backend
gcloud iam service-accounts create wildwood-backend-runtime \
  --display-name="Wildwood Backend Runtime SA" \
  --project=whispers-of-the-wildwood

# For wildwood-frontend
gcloud iam service-accounts create wildwood-frontend-runtime \
  --display-name="Wildwood Frontend Runtime SA" \
  --project=whispers-of-the-wildwood
```

---

### Step 3: Grant Minimum Required Permissions

**Example for swiss-naturalization-quiz** (adjust based on actual needs):

```bash
SERVICE_ACCOUNT="swiss-quiz-runtime@whispers-of-the-wildwood.iam.gserviceaccount.com"

# Grant storage access (if needed)
gcloud storage buckets add-iam-policy-binding gs://[BUCKET_NAME] \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/storage.objectViewer"

# Grant secret access (specific secrets only)
gcloud secrets add-iam-policy-binding swiss-quiz-session-secret \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/secretmanager.secretAccessor" \
  --project=whispers-of-the-wildwood

gcloud secrets add-iam-policy-binding swiss-quiz-player-tags \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/secretmanager.secretAccessor" \
  --project=whispers-of-the-wildwood

# Grant logging (project level, all services need this)
gcloud projects add-iam-policy-binding whispers-of-the-wildwood \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/logging.logWriter"
```

**Repeat for other services** with their specific requirements.

---

### Step 4: Update Cloud Run Services to Use New Service Accounts

```bash
# swiss-naturalization-quiz
gcloud run services update swiss-naturalization-quiz \
  --service-account=swiss-quiz-runtime@whispers-of-the-wildwood.iam.gserviceaccount.com \
  --region=europe-north1 \
  --project=whispers-of-the-wildwood

# wildwood-backend
gcloud run services update wildwood-backend \
  --service-account=wildwood-backend-runtime@whispers-of-the-wildwood.iam.gserviceaccount.com \
  --region=europe-north2 \
  --project=whispers-of-the-wildwood

# wildwood-frontend
gcloud run services update wildwood-frontend \
  --service-account=wildwood-frontend-runtime@whispers-of-the-wildwood.iam.gserviceaccount.com \
  --region=europe-north2 \
  --project=whispers-of-the-wildwood
```

---

### Step 5: Test Each Service

After updating each service:

```bash
# Test swiss-naturalization-quiz
SERVICE_URL=$(gcloud run services describe swiss-naturalization-quiz --region=europe-north1 --format='value(status.url)')
curl -s "$SERVICE_URL/health" || curl -s "$SERVICE_URL"

# Check logs for permission errors
gcloud run services logs tail swiss-naturalization-quiz --region=europe-north1 --limit=50
```

**Key things to test**:
- ✅ Service starts successfully
- ✅ Health checks pass
- ✅ No "permission denied" errors in logs
- ✅ All functionality works as expected
- ✅ Secret access works
- ✅ Storage operations work

---

### Step 6: Remove Editor Role from Default Compute SA

**⚠️ ONLY AFTER all services are migrated and tested:**

```bash
# Verify no services are using default compute SA
gcloud run services list --project=whispers-of-the-wildwood \
  --format="table(name,region,spec.template.spec.serviceAccountName)" \
  | grep "50477513015-compute@developer.gserviceaccount.com"

# If output is empty (no services using it), proceed to remove Editor role
gcloud projects remove-iam-policy-binding whispers-of-the-wildwood \
  --member="serviceAccount:50477513015-compute@developer.gserviceaccount.com" \
  --role="roles/editor"

# Also remove other excessive roles
gcloud projects remove-iam-policy-binding whispers-of-the-wildwood \
  --member="serviceAccount:50477513015-compute@developer.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

gcloud projects remove-iam-policy-binding whispers-of-the-wildwood \
  --member="serviceAccount:50477513015-compute@developer.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

gcloud projects remove-iam-policy-binding whispers-of-the-wildwood \
  --member="serviceAccount:50477513015-compute@developer.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects remove-iam-policy-binding whispers-of-the-wildwood \
  --member="serviceAccount:50477513015-compute@developer.gserviceaccount.com" \
  --role="roles/logging.logWriter"
```

---

## Risk Assessment

### Before Migration (Current State)
- **Overall Risk**: 🔴 **CRITICAL**
- **Blast Radius**: Entire GCP project
- **Attack Surface**: 3 services with Editor access
- **Compliance**: ❌ Fails least-privilege principle

### After Migration (Target State)
- **Overall Risk**: 🟢 **LOW**
- **Blast Radius**: Limited to individual service needs
- **Attack Surface**: Minimal, scoped permissions only
- **Compliance**: ✅ Follows least-privilege principle

---

## Rollback Plan

If a service breaks after migration:

```bash
# Emergency rollback - revert to default compute SA
gcloud run services update [SERVICE_NAME] \
  --service-account=50477513015-compute@developer.gserviceaccount.com \
  --region=[REGION] \
  --project=whispers-of-the-wildwood

# Check logs to identify missing permission
gcloud run services logs tail [SERVICE_NAME] --region=[REGION]

# Grant the specific missing permission to the new SA
gcloud projects add-iam-policy-binding whispers-of-the-wildwood \
  --member="serviceAccount:[NEW_SA]@whispers-of-the-wildwood.iam.gserviceaccount.com" \
  --role="roles/[REQUIRED_ROLE]"

# Retry migration
gcloud run services update [SERVICE_NAME] \
  --service-account=[NEW_SA]@whispers-of-the-wildwood.iam.gserviceaccount.com \
  --region=[REGION]
```

---

## Implementation Timeline

### Immediate (Completed ✅)
- ✅ AI Top Trumps Card Generator migrated to least-privilege model
- ✅ Storage permissions scoped
- ✅ Redundant admin roles removed
- ✅ Production deployment successful

### Short-term (Next 2 weeks) 🔴
- **Week 1**: Investigate swiss-naturalization-quiz requirements
  - Analyze logs for permission usage
  - Document required permissions
  - Create dedicated service account
  - Test in non-production environment (if available)

- **Week 2**: Migrate swiss-naturalization-quiz
  - Grant scoped permissions
  - Update Cloud Run service
  - Test thoroughly
  - Monitor for 48 hours

### Medium-term (Next 4 weeks) 🟡
- **Week 3**: Investigate wildwood-backend requirements
  - Same process as swiss-quiz
  - Create dedicated service account
  - Test migration

- **Week 4**: Migrate wildwood-backend
  - Grant scoped permissions
  - Update Cloud Run service
  - Test and monitor

### Long-term (Next 6 weeks) 🟢
- **Week 5**: Investigate wildwood-frontend requirements
  - Same process
  - Create dedicated service account

- **Week 6**: Migrate wildwood-frontend
  - Complete migration
  - **Remove Editor role from default compute SA**
  - Final security audit

---

## Success Criteria

The migration is complete when:

- ✅ All 3 services use dedicated service accounts
- ✅ Default compute SA has NO permissions (or minimal read-only)
- ✅ All services function correctly
- ✅ No permission denied errors in logs
- ✅ Security audit shows no Editor roles on service accounts
- ✅ All services independently tested and verified

---

## Monitoring & Validation

After each service migration:

```bash
# Check service account usage
gcloud run services list --project=whispers-of-the-wildwood \
  --format="table(name,region,spec.template.spec.serviceAccountName)"

# Verify permissions
gcloud projects get-iam-policy whispers-of-the-wildwood \
  --format=json | jq '.bindings[] | select(.role=="roles/editor")'

# Monitor logs for errors
gcloud logging read 'severity>=ERROR AND resource.type="cloud_run_revision"' \
  --limit=50 --format=json
```

---

## References

- [GCP Best Practices: Service Account Management](https://cloud.google.com/iam/docs/best-practices-service-accounts)
- [Cloud Run Service Identity](https://cloud.google.com/run/docs/securing/service-identity)
- [Principle of Least Privilege](https://cloud.google.com/iam/docs/using-iam-securely#least_privilege)

---

## Deployment Script Enhancement

**Completed**: Added `--skip-prompts` flag to deploy-prod.sh

```bash
# Usage for automated deployments:
./deploy-prod.sh --skip-prompts
./deploy-prod.sh -y
./deploy-prod.sh --yes

# All three flags bypass the 3 confirmation prompts
```

This enables CI/CD pipelines while maintaining the safety prompts for manual deployments.

---

## Contact & Questions

For questions about this migration plan:
- Review the security assessment plan: `/Users/johnmather/.claude/plans/typed-painting-corbato.md`
- Check Cloud Run logs for permission errors
- Consult GCP IAM documentation for role definitions
