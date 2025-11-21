# GitHub Branch Protection Setup

> **Purpose:** Prevent accidental direct pushes to `main`, require Pull Request reviews, ensure CI passes before merge.

---

## Step-by-Step Setup

### 1. Navigate to Branch Protection Settings

1. Go to your GitHub repository: `https://github.com/losamgmt/tross-app`
2. Click **Settings** (top navigation)
3. Click **Branches** (left sidebar)
4. Under "Branch protection rules", click **Add rule** or **Add branch protection rule**

---

### 2. Configure Protection Rule for `main`

**Branch name pattern:** `main`

### Required Settings (Enable These):

#### ✅ **Require a pull request before merging**
- Check this box
- **Required approvals:** Set to `1` (you must review/approve)
- ✅ **Dismiss stale pull request approvals when new commits are pushed** (recommended)
- ⬜ "Require review from Code Owners" - Skip (you don't have CODEOWNERS file yet)

#### ✅ **Require status checks to pass before merging**
- Check this box
- ✅ **Require branches to be up to date before merging** (recommended - ensures PR is current)
- **Status checks to require:**
  - Search and add: `Run Backend Tests` (from your CI workflow)
  - Search and add: `Run Frontend Tests` (from your CI workflow)
  - Search and add: `Lint Check` (from development workflow)
  - *These appear after your first PR - if not visible yet, skip and add later*

#### ✅ **Require conversation resolution before merging** (recommended)
- Forces all PR comments to be resolved before merge
- Prevents accidentally merging with unresolved questions

#### ⬜ **Require signed commits** - Optional (skip for now)
- Advanced security feature
- Can add later if needed

#### ✅ **Require linear history** (recommended)
- Prevents merge commits
- Keeps clean commit history
- Uses "Squash and merge" or "Rebase and merge"

#### ⬜ **Require deployments to succeed before merging** - Skip
- Not applicable for your setup

#### ✅ **Lock branch** - NO, do not check this
- This would make branch read-only for everyone including you

#### ✅ **Do not allow bypassing the above settings** - Check this
- Applies rules to administrators (you)
- Prevents accidental rule violations
- You can temporarily disable protection if emergency requires

---

### 3. Additional Settings (Lower on page)

#### Rules applied to everyone including administrators:

✅ **Allow force pushes** - Set to "Specify who can force push" → **Nobody**
- Prevents history rewriting
- Protects against accidental data loss

⬜ **Allow deletions** - Leave unchecked
- Prevents accidental branch deletion

---

## What This Achieves

### Before Branch Protection:
```bash
# Collaborator (or you) could accidentally:
git checkout main
git commit -m "oops direct commit"
git push origin main  # ❌ Bypasses all review
```

### After Branch Protection:
```bash
git push origin main
# ❌ ERROR: Required status checks not passing
# ❌ ERROR: Required review not approved
# ✅ Must create PR, get review, pass CI
```

---

## Your Workflow After Protection

### As Repository Owner (You):

1. Collaborator opens PR from their fork
2. You receive notification
3. Review code changes in GitHub UI
4. GitHub shows CI status (tests passing/failing)
5. If changes needed, comment on PR
6. Once satisfied, click **Approve** button
7. Click **Squash and merge** button
8. PR merges to `main`
9. Your Railway/Vercel deployments auto-trigger

### Emergency Override (if needed):

If you need to bypass protection in emergency:
1. Go to Settings → Branches
2. Temporarily disable protection rule
3. Make emergency fix
4. Re-enable protection immediately

**Better approach:** Create PR even for your own changes, approve it yourself, merge. Maintains audit trail.

---

## Testing Your Setup

### After Enabling Protection:

1. Try to push directly to `main`:
   ```bash
   git checkout main
   echo "test" >> README.md
   git commit -m "test"
   git push origin main
   ```
   **Expected:** ❌ GitHub rejects push with error about branch protection

2. Create test PR:
   ```bash
   git checkout -b test-branch
   echo "test" >> README.md
   git commit -m "test"
   git push origin test-branch
   ```
   - Open PR on GitHub
   - See CI checks run
   - See "Changes requested" or "Approve" buttons
   - Test merge button (should require approval)

---

## Common Issues

### "Status checks not found"
- Status checks only appear after first workflow run
- Create a test PR first, let CI run
- Then edit protection rule to add the checks

### "Can't push to main anymore"
- ✅ **This is correct!** Working as intended
- Always work on branches, create PRs

### "PR shows merge conflicts"
- Collaborator needs to update their fork
- Instructions in FORK_WORKFLOW_GUIDE.md

### "CI failing on fork PR"
- Expected for integration tests (secrets not accessible)
- Unit tests should pass
- Full tests run after you merge to main

---

## Next Steps

1. ✅ Change collaborator permissions from Triage → **Read**
2. ✅ Enable branch protection (follow steps above)
3. ✅ Test with dummy PR
4. ✅ Share FORK_WORKFLOW_GUIDE.md with team
5. ✅ Create CODEOWNERS file (optional, later)

---

## References

- [GitHub Branch Protection Docs](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [Required Status Checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches#require-status-checks-before-merging)
- [Pull Request Reviews](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/about-pull-request-reviews)
