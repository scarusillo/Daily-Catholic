variable "domain" {
  description = "Your domain, e.g. thedailycatholic.com (registered in, or delegated to, Route 53)"
  type        = string
}

variable "region" {
  description = "Region for the S3 bucket"
  type        = string
  default     = "us-east-1"
}

variable "github_repo" {
  description = "GitHub repository allowed to deploy, owner/name"
  type        = string
  default     = "scarusillo/Daily-Catholic"
}

variable "create_github_oidc_provider" {
  description = "Set false if this AWS account already has the GitHub OIDC provider (e.g. from another project)"
  type        = bool
  default     = true
}

variable "budget_email" {
  description = "Email for a spending alert at 80% of budget_usd ('' to skip)"
  type        = string
  default     = ""
}

variable "budget_usd" {
  description = "Monthly budget for the alert"
  type        = number
  default     = 5
}
