# Auth0 Setup Guide

## Step 1: Create Auth0 Account & Tenant

1. Go to https://auth0.com and create free account
2. Create new tenant (e.g., `trossapp-dev`)
3. Note your domain: `trossapp-dev.us.auth0.com`

## Step 2: Create Application

1. Go to Applications → Create Application
2. Name: "TrossApp Frontend"
3. Type: "Single Page Application"
4. Technology: "Flutter"

## Step 3: Configure Application Settings

**Allowed Callback URLs:**

```
http://localhost:8080/callback,
https://your-production-domain.com/callback
```

**Allowed Logout URLs:**

```
http://localhost:8080,
https://your-production-domain.com
```

**Allowed Web Origins:**

```
http://localhost:8080,
https://your-production-domain.com
```

## Step 4: Create API

1. Go to Applications → APIs → Create API
2. Name: "TrossApp Backend API"
3. Identifier: `https://api.trossapp.dev`
4. Signing Algorithm: RS256

## Step 5: Enable Google OAuth (Optional)

1. Go to Authentication → Social → Google
2. Enter Google OAuth credentials
3. Enable for your application

## Step 6: Get Credentials

Copy these values to your .env files:

- Domain: `your-tenant.us.auth0.com`
- Client ID: `your-client-id`
- API Audience: `https://api.trossapp.dev`

## Step 7: Test Configuration

Use Auth0's built-in tester to verify setup works.
