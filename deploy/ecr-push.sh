#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# SPECTRAL — Build and push Docker image to AWS ECR (ap-southeast-2)
#
# Usage:
#   ./deploy/ecr-push.sh [TAG]
#
# Examples:
#   ./deploy/ecr-push.sh                   # uses git short SHA as tag
#   ./deploy/ecr-push.sh v1.2.3            # explicit tag
#   TAG=v1.2.3 ./deploy/ecr-push.sh        # env var
#
# Prerequisites:
#   - aws CLI configured with credentials that have ECR push permissions
#   - Docker running
#   - ECR_REPO set below OR as env var
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

AWS_REGION="${AWS_REGION:-ap-southeast-2}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query Account --output text)}"
ECR_REPO="${ECR_REPO:-spectral-operations}"
TAG="${1:-${TAG:-$(git rev-parse --short HEAD)}}"

ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}"
FULL_TAG="${ECR_URI}:${TAG}"
LATEST_TAG="${ECR_URI}:latest"

echo "────────────────────────────────────────────────────────────"
echo "  SPECTRAL ECR push"
echo "  Account : ${AWS_ACCOUNT_ID}"
echo "  Region  : ${AWS_REGION}"
echo "  Repo    : ${ECR_REPO}"
echo "  Tag     : ${TAG}"
echo "────────────────────────────────────────────────────────────"

# 1. Authenticate Docker with ECR
echo "→ Authenticating with ECR..."
aws ecr get-login-password --region "${AWS_REGION}" \
  | docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# 2. Create repo if it doesn't exist
echo "→ Ensuring ECR repository exists..."
aws ecr describe-repositories --repository-names "${ECR_REPO}" --region "${AWS_REGION}" \
  > /dev/null 2>&1 || \
  aws ecr create-repository \
    --repository-name "${ECR_REPO}" \
    --region "${AWS_REGION}" \
    --image-scanning-configuration scanOnPush=true \
    --encryption-configuration encryptionType=AES256 \
    > /dev/null

# 3. Build (from repo root)
cd "$(git rev-parse --show-toplevel)"
echo "→ Building Docker image..."
docker build \
  --file Dockerfile \
  --tag "${FULL_TAG}" \
  --tag "${LATEST_TAG}" \
  --platform linux/amd64 \
  .

# 4. Push both tags
echo "→ Pushing ${TAG}..."
docker push "${FULL_TAG}"
echo "→ Pushing latest..."
docker push "${LATEST_TAG}"

echo ""
echo "✓ Pushed: ${FULL_TAG}"
echo ""
echo "To deploy with Helm (update image tag):"
echo "  helm upgrade spectral ./deploy/helm/spectral-operations \\"
echo "    --values ./deploy/helm/spectral-operations/values-aws.yaml \\"
echo "    --set image.repository=${ECR_URI} \\"
echo "    --set image.tag=${TAG}"
