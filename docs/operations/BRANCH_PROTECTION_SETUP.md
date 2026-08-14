# Branch Protection Setup Guide

**Status (2026-08-14):** the repo is now **public**, so branch protection is available at no cost, and a `main` **ruleset is active** — force-pushes blocked and PRs required, with the solo owner (admin) able to bypass for direct pushes; the two collaborators are read-only. The steps below document the fuller PR-gated setup for when a write-collaborator is added.

---

## When You're Ready (Public Repo or Team Plan)

Execute these steps in GitHub web interface to protect the `main` branch.

## Steps

1. **Navigate to Settings**
   - Go to https://github.com/losamgmt/tross
   - Click "Settings" tab
   - Click "Branches" in left sidebar

2. **Add Branch Protection Rule**
   - Click "Add branch protection rule"
   - Branch name pattern: `main`

3. **Configure Protection Rules**

   Check these boxes:

   ✅ **Require a pull request before merging**
   - Required approvals: 1
   - Dismiss stale pull request approvals when new commits are pushed
   - Require review from Code Owners (optional - after adding CODEOWNERS)

   ✅ **Require status checks to pass before merging**
   - Require branches to be up to date before merging
   - Status checks to require: select the jobs exposed by the CI workflow (see the workflow definitions under `.github/workflows/` for the current job names — these are the source of truth and may change)

   ✅ **Require conversation resolution before merging**

   ✅ **Do not allow bypassing the above settings**
   - This applies to administrators too (you!)
   - Forces good discipline even for you

   ✅ **Restrict who can push to matching branches**
   - Add: `losamgmt` (only you can push)
   - This prevents accidental direct commits

4. **Click "Create"**

## Verification

After setup:

- Try to push directly to main → Should be blocked
- Try to merge PR without approval → Should be blocked
- Try to merge PR with failing tests → Should be blocked

## Notes

- This protects against accidents (even your own)
- Forces all changes through PR review process
- Ensures tests always pass on main
- Can temporarily disable if emergency deployment needed (Settings → Edit rule → uncheck "Do not allow bypassing")

---

## Current Workflow (Private Repo, No Team Plan)

**What you have:**

- ✅ CI runs on all PRs (tests, lint, build)
- ✅ Vercel preview deployments
- ✅ Manual code review process
- ⚠️ Trust-based enforcement (GitHub doesn't block bad merges)

**How to protect main branch manually:**

1. **Always use PRs** (even for your own changes)
2. **Check CI status** before merging (green ✅ required)
3. **Don't merge failing PRs** (red ❌ = don't merge)
4. **Review all code** before approving
5. **Team discipline** (everyone follows the rules)

**When to upgrade:**

- Make repo public → Branch protection free ✅
- Subscribe to GitHub Team → per-user monthly pricing

**For now:** Keep this file as reference for future setup!
