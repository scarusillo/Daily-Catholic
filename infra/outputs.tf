output "site_url" { value = "https://${var.domain}" }
output "s3_bucket" { value = aws_s3_bucket.site.bucket }
output "cloudfront_distribution_id" { value = aws_cloudfront_distribution.site.id }
output "deploy_role_arn" { value = aws_iam_role.deploy.arn }
