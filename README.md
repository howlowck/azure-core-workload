# Core Workloads Quick Start

## Feature

* A Dev Container with Terraform and Az Cli Built in
* A Script that builds a remote Terraform backend in Azure Storage
* A set of commonly used Terraform configurations

## Getting Started

1. Use VSCode Remote Dev Container to start in dev container
2. Run `az login` in the dev container
3. (If you want a remote TF state) Run `./scripts/build-tfstate-storage.mjs --help` to see how to use the script to create a remote terraform storage
4. Navigating to one of the Terraform directory and run `terraform init`
