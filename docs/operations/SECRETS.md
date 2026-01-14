# GitHub Secrets Configuration

# Required secrets for CI/CD pipeline

## Docker Hub (for image publishing)

DOCKER_USERNAME=your-dockerhub-username
DOCKER_PASSWORD=your-dockerhub-token

## Production Database (if using external DB)

PROD_DB_HOST=your-production-db-host
PROD_DB_USER=your-production-db-user  
PROD_DB_PASSWORD=your-production-db-password
PROD_DB_NAME=trossapp_prod

## Application Secrets

JWT_SECRET=your-super-secure-jwt-secret-minimum-32-chars
API_KEY=your-api-key-if-needed

## Deployment (if using cloud providers)

# AWS_ACCESS_KEY_ID=your-aws-key

# AWS_SECRET_ACCESS_KEY=your-aws-secret

# AZURE_CREDENTIALS=your-azure-credentials

# Note: Add these in GitHub Repository Settings > Secrets and variables > Actions
