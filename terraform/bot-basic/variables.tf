variable product {
  type        = string
  description = "Name of the product"
}

variable environment {
  type        = string
  default     = "dev"
  description = "Name of the environment"
}

variable location {
  type        = string
  default     = "eastus2"
  description = "Location of the environment"
}
