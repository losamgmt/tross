# Contributors

This project is maintained by **Zarika Amber** with contributions from the TrossApp team.

## Core Team

- **Zarika Amber** - Lead Developer & Maintainer
- **Jacob Johnson** - Owner & Product Direction
- **Lane Vandeventer** - Collaborator

---

## Contributing

### 🍴 Fork-Based Workflow

**All collaborators work from forks.** This protects the main repository and gives you freedom to experiment.

**New to forking?** Read our comprehensive [Fork Workflow Guide](docs/FORK_WORKFLOW_GUIDE.md) - written for AI-empowered collaborators who are learning as they go.

### Quick Start for Collaborators

1. **Fork this repo** to your GitHub account (click "Fork" button on GitHub)
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/tross-app.git
   cd tross-app
   ```
3. **Add upstream remote** (to sync with main repo):
   ```bash
   git remote add upstream https://github.com/losamgmt/tross-app.git
   ```
4. **Install dependencies**:
   ```bash
   npm install
   cd frontend && flutter pub get
   ```
5. **Run tests** before making changes:
   ```bash
   npm test  # Must pass before submitting
   ```
6. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
7. **Make your changes**, commit, and push to your fork
8. **Submit a PR** from your fork to this repo's `main` branch
9. **Wait for review** - Zarika will review and merge

### Important Notes

- **Never push directly to main** (branch protection prevents this)
- **Always sync your fork** before starting new work
- **All PRs require approval** and passing CI tests
- **Use clear commit messages** (follow conventional commits format)

### Testing Your Changes

**Can't run locally?** Use GitHub Codespaces (cloud dev environment):
- Click "Code" → "Codespaces" → "Create codespace"
- Environment auto-configures
- Run tests in browser

**Want to see visual changes?** Preview deployments coming soon!

---

## Recognition

All contributors are valued members of the TrossApp community. Thank you for helping build something great! 🚀
