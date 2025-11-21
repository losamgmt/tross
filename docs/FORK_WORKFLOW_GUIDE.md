# Fork Workflow Guide for Collaborators

> **For:** AI-empowered designers and non-technical contributors  
> **Goal:** Safely contribute frontend mockups and designs without breaking production

---

## The Big Picture

You work in **your own copy** (fork) of the TrossApp repository. When you're ready to share your work, you submit a **Pull Request** (PR). The technical lead reviews it, and if approved, merges it into the main project.

**Think of it like:**
- 🏠 **Main repo** = The official house (owned by losamgmt)
- 🏡 **Your fork** = Your personal workshop where you experiment
- 📮 **Pull Request** = You mail your finished work to the main house
- ✅ **Review & Merge** = Technical lead checks quality, then adds it to official house

---

## One-Time Setup (Do This First)

### Step 1: Fork the Repository

1. Go to: `https://github.com/losamgmt/tross-app`
2. Click **Fork** button (top right)
3. On fork page:
   - Owner: Your GitHub username
   - Repository name: Keep as `tross-app` (or rename if you want)
   - ✅ Check "Copy the main branch only"
4. Click **Create fork**

**Result:** You now have `https://github.com/YOUR-USERNAME/tross-app`

---

### Step 2: Clone Your Fork to Your Computer

```bash
# Replace YOUR-USERNAME with your actual GitHub username
git clone https://github.com/YOUR-USERNAME/tross-app.git
cd tross-app
```

---

### Step 3: Add "Upstream" Remote

This lets you stay synced with the main repository.

```bash
# Inside tross-app folder
git remote add upstream https://github.com/losamgmt/tross-app.git

# Verify it worked
git remote -v
# Should show:
# origin    https://github.com/YOUR-USERNAME/tross-app.git (your fork)
# upstream  https://github.com/losamgmt/tross-app.git (main repo)
```

---

## Daily Workflow (Every Time You Work)

### Step 1: Sync Your Fork

**Why?** Someone else might have merged changes since you last worked. Always start fresh.

```bash
# Make sure you're on main branch
git checkout main

# Get latest from main repository
git fetch upstream

# Update your local main branch
git merge upstream/main

# Push updates to your fork on GitHub
git push origin main
```

**Visual:**
```
Main Repo (upstream) → Your Computer (local) → Your Fork (origin)
```

---

### Step 2: Create a Feature Branch

**Never work directly on `main`!** Always create a branch for your changes.

```bash
# Create branch with descriptive name
git checkout -b feature/login-page-mockup
# or
git checkout -b design/new-color-palette
# or
git checkout -b frontend/mobile-responsive-nav
```

**Naming tips:**
- `feature/` = New functionality
- `design/` = Visual/UI changes
- `fix/` = Bug fixes
- Use hyphens, not spaces

---

### Step 3: Make Your Changes

Work on your files normally:
- Edit Flutter widgets in `frontend/lib/`
- Update designs, mockups, assets
- Use AI assistants to help with code

**Save often!**

---

### Step 4: Commit Your Changes

```bash
# See what files you changed
git status

# Add files to staging
git add frontend/lib/screens/login_page.dart
# or add everything:
git add .

# Commit with clear message
git commit -m "Add login page mockup with email/password fields"
```

**Good commit messages:**
- ✅ "Add mobile navigation drawer"
- ✅ "Fix button alignment on settings page"
- ✅ "Update color scheme to match brand guidelines"
- ❌ "stuff"
- ❌ "changes"
- ❌ "idk it works now"

---

### Step 5: Push to Your Fork

```bash
# Push your branch to YOUR fork on GitHub
git push origin feature/login-page-mockup
```

**First time pushing a new branch?** Git will show a message with a link. Click it or use:

```bash
git push --set-upstream origin feature/login-page-mockup
```

---

### Step 6: Open a Pull Request

1. Go to **your fork** on GitHub: `https://github.com/YOUR-USERNAME/tross-app`
2. GitHub shows banner: **"Compare & pull request"** → Click it
   - (If no banner, click "Contribute" → "Open pull request")
3. Fill out PR form:
   - **Base repository:** `losamgmt/tross-app` (main repo)
   - **Base branch:** `main`
   - **Head repository:** `YOUR-USERNAME/tross-app` (your fork)
   - **Compare branch:** `feature/login-page-mockup` (your branch)
4. Write a clear title and description:
   ```
   Title: Add login page mockup with responsive design
   
   Description:
   - Created login screen with email/password fields
   - Added "Forgot Password" link
   - Responsive layout for mobile and tablet
   - Used Material Design 3 components
   
   Screenshots: [attach images if helpful]
   ```
5. Click **Create pull request**

---

### Step 7: Wait for Review

- ⏳ Technical lead gets notified automatically
- 💬 They may comment with questions or requested changes
- 🔄 If changes needed, see "Updating Your PR" below
- ✅ Once approved, they'll merge it
- 🎉 Your changes are now in the main project!

---

## Updating Your PR After Feedback

If the reviewer asks for changes:

```bash
# Make sure you're on your feature branch
git checkout feature/login-page-mockup

# Make the requested changes to your files

# Commit the updates
git add .
git commit -m "Address review feedback: increase button padding"

# Push to your fork
git push origin feature/login-page-mockup
```

**Magic:** The PR automatically updates with your new commits! No need to create a new PR.

---

## After Your PR is Merged

### Clean Up Your Branch

```bash
# Switch back to main
git checkout main

# Sync with main repo (get your merged changes)
git fetch upstream
git merge upstream/main
git push origin main

# Delete your old feature branch (no longer needed)
git branch -d feature/login-page-mockup
git push origin --delete feature/login-page-mockup
```

---

## Common Scenarios

### "My fork is behind the main repo"

**Solution:** Sync your fork (Step 1 of Daily Workflow)

```bash
git checkout main
git fetch upstream
git merge upstream/main
git push origin main
```

---

### "I have merge conflicts"

**What it means:** Someone changed the same file you did.

**Solution:**

1. Sync your main branch first:
   ```bash
   git checkout main
   git fetch upstream
   git merge upstream/main
   ```

2. Switch to your feature branch and merge main into it:
   ```bash
   git checkout feature/your-branch
   git merge main
   ```

3. Git shows conflicts in files like:
   ```dart
   <<<<<<< HEAD
   Your changes
   =======
   Their changes
   >>>>>>> main
   ```

4. Edit the file, keep the right version (or combine them)

5. Commit the resolution:
   ```bash
   git add .
   git commit -m "Resolve merge conflicts"
   git push origin feature/your-branch
   ```

**Still stuck?** Ask for help in PR comments.

---

### "I accidentally committed to main"

**Solution:** Move your changes to a new branch:

```bash
# Create new branch with your current changes
git checkout -b feature/my-actual-branch

# Push the new branch
git push origin feature/my-actual-branch

# Go back to main and reset it
git checkout main
git fetch upstream
git reset --hard upstream/main
git push origin main --force
```

---

### "I want to work on multiple features at once"

**No problem!** Just create multiple branches:

```bash
# Feature 1
git checkout main
git checkout -b feature/navbar
# ... work on navbar ...
git push origin feature/navbar
# Open PR #1

# Feature 2 (start from clean main)
git checkout main
git checkout -b feature/footer
# ... work on footer ...
git push origin feature/footer
# Open PR #2
```

Each PR is independent and can be reviewed/merged separately.

---

## Visual Workflow Summary

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Sync Fork                                                │
│    main repo → your computer → your fork                    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Create Feature Branch                                    │
│    git checkout -b feature/my-cool-feature                  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Make Changes                                             │
│    Edit files, use AI tools, design mockups                 │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Commit                                                   │
│    git add . && git commit -m "Clear description"           │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Push to Your Fork                                        │
│    git push origin feature/my-cool-feature                  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. Open Pull Request                                        │
│    GitHub: Compare & pull request button                    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. Code Review                                              │
│    Tech lead reviews → requests changes or approves         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 8. Merge!                                                   │
│    Your code is now in production 🎉                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Reference Commands

| Task | Command |
|------|---------|
| Sync fork | `git checkout main && git fetch upstream && git merge upstream/main && git push origin main` |
| Create branch | `git checkout -b feature/my-feature` |
| Save changes | `git add . && git commit -m "description"` |
| Push to fork | `git push origin feature/my-feature` |
| Switch branches | `git checkout branch-name` |
| See branches | `git branch -a` |
| See status | `git status` |

---

## Getting Help

- 💬 **Ask in PR comments** - Tag the tech lead
- 📖 **GitHub Docs** - https://docs.github.com/en/pull-requests
- 🤖 **AI Assistants** - Use GitHub Copilot, ChatGPT, Claude to explain commands
- 📧 **Direct message** - Slack/email tech lead if stuck

---

## What NOT to Do

❌ **Never force push** (`git push --force`) unless tech lead says it's okay  
❌ **Never work directly on main branch**  
❌ **Never commit secrets** (API keys, passwords, tokens)  
❌ **Never delete files** unless you're sure it's safe  

---

## Success Checklist

Before opening each PR, check:

- [ ] Synced fork with main repo
- [ ] Created feature branch (not working on main)
- [ ] Changes work locally (tested in browser/app)
- [ ] Clear commit messages
- [ ] Descriptive PR title and description
- [ ] No merge conflicts
- [ ] No secrets committed

---

## You've Got This! 🚀

This workflow protects the production app while giving you freedom to experiment. Don't be afraid to make mistakes in your fork - that's what it's for!

**Remember:** The worst that can happen is you delete your fork and re-fork fresh. The main repository is always safe.
