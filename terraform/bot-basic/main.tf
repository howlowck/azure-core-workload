# We strongly recommend using the required_providers block to set the
# Azure Provider source and version being used
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "=2.71.0"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 2.7.0"
    }
  }
  backend "azurerm" {}
}

# Configure the Microsoft Azure Provider
provider "azurerm" {
  features {}
}
provider "azuread" {
}

data "azurerm_client_config" "current" {}

resource "azurerm_resource_group" "bot" {
  name     = "rg-${var.product}-${var.environment}"
  location = var.location
}

resource "azuread_application" "bot" {
  display_name     = "${var.product} ${var.environment} App"
  sign_in_audience = "AzureADandPersonalMicrosoftAccount"

  owners = [
    data.azurerm_client_config.current.object_id
  ]

  api {
    requested_access_token_version = 2
  }
}

resource "azuread_application_password" "bot" {
  application_object_id = azuread_application.bot.object_id
}

locals {
  bot_name = "bot-${var.product}-${var.environment}"
  webapp_endpoint = "https://${lower(azurerm_app_service.bot.name)}.azurewebsites.net/api/messages"
}

resource "azurerm_app_service_plan" "bot" {
  name                = "asp-${var.product}-${var.environment}"
  location            = azurerm_resource_group.bot.location
  resource_group_name = azurerm_resource_group.bot.name
  kind                = "Linux"
  reserved            = true # Must be true for Linux plans

  sku {
    tier = "Standard"
    size = "S1"
  }
}

resource "azurerm_app_service" "bot" {
  name                = "app-${var.product}-${var.environment}"
  location            = azurerm_resource_group.bot.location
  resource_group_name = azurerm_resource_group.bot.name
  app_service_plan_id = azurerm_app_service_plan.bot.id

  site_config {
    linux_fx_version = "node|14-lts"
  }

  app_settings = {
    "MicrosoftAppId"       = azuread_application.bot.application_id
    "MicrosoftAppPassword" = azuread_application_password.bot.value
  }
}

resource "azurerm_bot_web_app" "bot" {
  name                = local.bot_name
  display_name        = "${var.product} ${var.environment}"
  location            = "global"
  resource_group_name = azurerm_resource_group.bot.name
  endpoint            = local.webapp_endpoint
  sku                 = "F0"
  microsoft_app_id    = azuread_application.bot.application_id
}

resource "azurerm_bot_channel_directline" "bot" {
  bot_name            = azurerm_bot_web_app.bot.name
  location            = azurerm_bot_web_app.bot.location
  resource_group_name = azurerm_resource_group.bot.name

  site {
    name    = "default"
    enhanced_authentication_enabled = false
    enabled = true
  }
}
