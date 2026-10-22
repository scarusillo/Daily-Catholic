# Moving The Daily Catholic to AWS with your own domain

Today the site is live on GitHub Pages: https://scarusillo.github.io/Daily-Catholic/
These steps put it on AWS at your own domain. Expected cost: about $14/year for a .com
plus about $0.50/month (Route 53 hosted zone); S3 and CloudFront stay within free tiers at this size.

## 1. Buy the domain (Route 53)
AWS console → Route 53 → Registered domains → Register domain (e.g. thedailycatholic.com).
Route 53 creates the hosted zone automatically. (If you buy elsewhere, create a Route 53 hosted zone
and point the registrar's nameservers at it.)

## 2. Create the AWS resources (Terraform)
```bash
cd infra
cp terraform.tfvars.example terraform.tfvars   # set your domain and email
terraform init
terraform apply                                 # takes ~10–20 min (certificate + CloudFront)
terraform output                                # note the four values
```
If the account already has a GitHub OIDC provider (Scotty's Edge may have created one), set
`create_github_oidc_provider = false` in terraform.tfvars.

Keep `terraform.tfstate` safe (it is git-ignored). For a shared setup, move state to an S3 backend.

## 3. Connect GitHub
GitHub → Daily-Catholic → Settings → Secrets and variables → Actions → **Variables** → add:
- `AWS_ROLE_ARN` = output `deploy_role_arn`
- `S3_BUCKET` = output `s3_bucket`
- `CF_DISTRIBUTION_ID` = output `cloudfront_distribution_id`

Then Actions → "Deploy to AWS" → Run workflow. Every push to main deploys automatically after that.
No AWS keys are stored in GitHub; it signs in with a short-lived role.

## 4. Point the app at the new address
Edit `site/config.js`: set `siteUrl` to `https://yourdomain.com/`. Commit and push.
Optional in the same file: `donateUrl` (Stripe Payment Link, Givebutter…), `contactEmail`,
`reviewedBy` (after the priest's review).

## 5. Optional
- Keep GitHub Pages as a backup, or turn it off in Settings → Pages.
- Add `https://yourdomain.com` to Google Search Console so people can find it.
