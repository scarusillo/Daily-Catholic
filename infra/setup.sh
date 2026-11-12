#!/usr/bin/env bash
# One-time setup of The Daily Catholic on AWS. Run it in AWS CloudShell (the >_ icon in the AWS console),
# which is already signed in to your account:
#
#   git clone https://github.com/scarusillo/Daily-Catholic && cd Daily-Catholic/infra && bash setup.sh yourdomain.com you@example.com
#
# Safe to run again: it picks up where it left off. Buy the domain in Route 53 first (see DEPLOY.md).
set -euo pipefail
DOMAIN="${1:?usage: bash setup.sh yourdomain.com you@example.com}"
EMAIL="${2:?usage: bash setup.sh yourdomain.com you@example.com}"
REGION="us-east-1"
TF_VERSION="1.9.8"
cd "$(dirname "$0")"

ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
echo "AWS account: $ACCOUNT"

if ! aws route53 list-hosted-zones-by-name --dns-name "$DOMAIN." --query "HostedZones[?Name=='$DOMAIN.'].Id" --output text | grep -q .; then
  echo "No Route 53 hosted zone for $DOMAIN yet. Register the domain in Route 53 first (it can take a few minutes to appear), then run this again."
  exit 1
fi

# Terraform (kept in ~/bin, which CloudShell preserves between visits)
export PATH="$HOME/bin:$PATH"
if ! command -v terraform >/dev/null 2>&1; then
  mkdir -p "$HOME/bin"
  curl -fsSL -o /tmp/terraform.zip "https://releases.hashicorp.com/terraform/${TF_VERSION}/terraform_${TF_VERSION}_linux_amd64.zip"
  unzip -o -q /tmp/terraform.zip terraform -d "$HOME/bin"
fi

# Bucket that remembers what was built
STATE_BUCKET="daily-catholic-tfstate-${ACCOUNT}"
if ! aws s3api head-bucket --bucket "$STATE_BUCKET" 2>/dev/null; then
  aws s3api create-bucket --bucket "$STATE_BUCKET" --region "$REGION" >/dev/null
  aws s3api put-bucket-versioning --bucket "$STATE_BUCKET" --versioning-configuration Status=Enabled
  aws s3api put-public-access-block --bucket "$STATE_BUCKET" --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
fi

# Reuse the GitHub sign-in link if this account already has one
OIDC=true
if aws iam list-open-id-connect-providers --query "OpenIDConnectProviderList[].Arn" --output text | grep -q "token.actions.githubusercontent.com"; then OIDC=false; fi

printf 'domain                      = "%s"\nbudget_email                = "%s"\ncreate_github_oidc_provider = %s\n' "$DOMAIN" "$EMAIL" "$OIDC" > terraform.tfvars

terraform init -input=false -backend-config="bucket=$STATE_BUCKET" -backend-config="key=daily-catholic/terraform.tfstate" -backend-config="region=$REGION"
terraform apply -input=false -auto-approve

echo
echo "Done. Add these three values in GitHub: Daily-Catholic > Settings > Secrets and variables > Actions > Variables"
echo "  AWS_ROLE_ARN       = $(terraform output -raw deploy_role_arn)"
echo "  S3_BUCKET          = $(terraform output -raw s3_bucket)"
echo "  CF_DISTRIBUTION_ID = $(terraform output -raw cloudfront_distribution_id)"
echo "Then: GitHub > Actions > Deploy to AWS > Run workflow. Your site: $(terraform output -raw site_url)"
