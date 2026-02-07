# Security Policy

## 🔒 Reporting Security Vulnerabilities

If you discover a security vulnerability in Tross, please report it responsibly:

1. **DO NOT** create a public GitHub issue
2. Email security concerns to: [your-email@example.com] _(Update this with your contact)_
3. Include detailed steps to reproduce the vulnerability
4. Allow reasonable time for a fix before public disclosure

We take security seriously and will respond promptly to verified reports.

---

## 🛡️ Security Measures

### Environment Variables

All sensitive configuration is stored in environment variables, **never** in source code:

- Database credentials (DB_PASSWORD, DATABASE_URL)
- Authentication secrets (AUTH0_CLIENT_SECRET, JWT_SECRET)
- API keys and third-party credentials

### What's NOT in This Repository

✅ **Safe (in repo):**

- Source code
- Documentation
- Tests
- Configuration templates (`.env.example`, `.env.template`)
- Public API specifications

❌ **Never committed:**

- `.env` files with real values
- API keys or secrets
- Database passwords
- Auth0 client secrets
- JWT signing keys
- User data or credentials

### Git History

This repository's git history has been verified clean of secrets. All sensitive files are listed in `.gitignore` and have never been committed.

---

## 🔐 Production Security

### Authentication & Authorization

- **Auth0 OAuth2/OIDC** for production authentication
- **Role-Based Access Control (RBAC)** with granular permissions
- **JWT tokens** with RS256 signing (Auth0) or HS256 (dev mode)
- **Development mode** with test tokens (local only, disabled in production)

### API Security

- **Helmet.js** - Security headers (CSP, XSS protection, etc.)
- **CORS** - Strict origin validation
- **Rate Limiting** - Per-endpoint limits to prevent abuse
- **Request Timeouts** - Prevent resource exhaustion
- **Input Validation** - Triple-tier (UI, API, Database)
- **SQL Injection Prevention** - Parameterized queries only
- **Error Handling** - No stack traces in production

### Data Protection

- **Audit Logging** - All data modifications logged
- **Soft Deletes** - User status management instead of hard deletes
- **Encrypted Connections** - TLS for all API traffic (production)
- **Database Security** - Managed PostgreSQL with encrypted backups

### Infrastructure

- **Railway** (Backend) - Environment variables encrypted at rest
- **Vercel** (Frontend) - Preview deployments isolated per PR
- **GitHub Actions** - Secrets stored in GitHub encrypted secrets
- **No secrets in Docker images** - All configuration via env vars

---

## 📋 Security Best Practices for Contributors

### Before Committing

1. **Never commit `.env` files** - They're gitignored, but double-check
2. **Use template files** - `.env.example` shows structure without secrets
3. **Check git status** - Review what you're about to commit
4. **Scan for secrets** - Use tools like `git-secrets` or manual review

### Development

1. **Use dev mode** - `AUTH_MODE=development` for local testing
2. **Test credentials** - Use only test data, never production credentials
3. **Local database** - Separate test database (`tross_test`)
4. **Environment isolation** - Development vs. Production clearly separated

### Pull Requests

1. **Review your own PR** - Check the diff for accidental secrets
2. **No real data** - Use mock/test data in examples
3. **Screenshot carefully** - Blur any credentials in screenshots
4. **Test locally first** - Ensure changes don't expose secrets

---

## 🚨 What To Do If Secrets Are Exposed

If secrets are accidentally committed:

### Immediate Actions

1. **Rotate compromised secrets immediately**:
   - Railway: Regenerate DATABASE_URL
   - Auth0: Rotate client secret
   - Generate new JWT_SECRET
2. **Update environment variables** in:
   - Railway dashboard
   - Vercel dashboard
   - Local `.env` file
3. **Redeploy applications** to use new secrets

### Git History Cleanup

If secrets were pushed to GitHub:

```bash
# DO NOT do this lightly - rewrites history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch path/to/secret/file" \
  --prune-empty --tag-name-filter cat -- --all

git push origin --force --all
```

**Better:** Assume the secret is compromised and rotate it immediately.

---

## 🔍 Security Auditing

### Regular Checks

- Review `.gitignore` ensures all secret files excluded
- Scan dependencies for vulnerabilities: `npm audit`
- Check for outdated packages: `npm outdated`
- Review Railway/Vercel environment variables quarterly

### Automated Security

- **GitHub Dependabot** - Automatic dependency updates
- **GitHub Secret Scanning** - Alerts if secrets committed (public repos)
- **CI/CD Checks** - Tests must pass before deployment
- **Branch Protection** - Requires review before merging

---

## 📚 Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Auth0 Security Best Practices](https://auth0.com/docs/secure)
- [Node.js Security Checklist](https://nodejs.org/en/docs/guides/security/)
- [GitHub Security Best Practices](https://docs.github.com/en/code-security)

---

## 📞 Contact

For security concerns: [your-email@example.com]  
For general issues: [GitHub Issues](https://github.com/losamgmt/tross/issues)
