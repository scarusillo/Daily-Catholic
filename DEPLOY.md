# Moving The Daily Catholic to AWS with your own domain

Today the site is live on GitHub Pages: https://scarusillo.github.io/Daily-Catholic/
These steps put it on AWS at your own domain. Expected cost: about $14/year for a .com
plus about $0.50/month (Route 53 hosted zone); S3 and CloudFront stay within free tiers at this size.

## 1. Buy the domain (Route 53)
AWS console → Route 53 → Registered domains → Register domain (e.g. thedailycatholic.com).
Route 53 creates the hosted zone automatically. (If you buy elsewhere, create a Route 53 hosted zone
and point the registrar's nameservers at it.)

## 2. Create the AWS resources (one command)
In the AWS console, open **CloudShell** (the `>_` icon in the top bar). It is a terminal already signed in
to your account. Paste this, with your own domain and email:

```bash
git clone https://github.com/scarusillo/Daily-Catholic && cd Daily-Catholic/infra && bash setup.sh yourdomain.com you@example.com
```

It takes 10–20 minutes (certificate + CloudFront) and ends by printing the three values for step 3.
It builds: a private S3 bucket, CloudFront with HTTPS, the certificate, DNS records, a www redirect,
a $5/month spending alert to your email, and a sign-in role that lets GitHub deploy without stored keys.
The record of what was built is kept in a separate S3 bucket in your account, so it is safe to close
CloudShell; running the command again later is harmless.

A brand-new AWS account sometimes refuses CloudFront until the account is verified (usually within a day).
If the command stops with a message about verification, wait and run it again.

## 3. Connect GitHub
GitHub → Daily-Catholic → Settings → Secrets and variables → Actions → **Variables** → add:
- `AWS_ROLE_ARN`
- `S3_BUCKET`
- `CF_DISTRIBUTION_ID`

(the values printed at the end of step 2)

Then Actions → "Deploy to AWS" → Run workflow. Every push to main deploys automatically after that.
No AWS keys are stored in GitHub; it signs in with a short-lived role.

## 4. Point the app at the new address
Edit `site/config.js`: set `siteUrl` to `https://yourdomain.com/`. Commit and push.
Optional in the same file: `donateUrl` (Stripe Payment Link, Givebutter…), `contactEmail`,
`reviewedBy` (after the priest's review).

## 5. Optional
- Keep GitHub Pages as a backup, or turn it off in Settings → Pages.
- Add `https://yourdomain.com` to Google Search Console so people can find it.
