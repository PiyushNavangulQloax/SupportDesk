# SupportDesk — Prompt Journal

**Project:** SupportDesk
**Week:** 1
**Day:** 4 — Git, GitHub & Repository Structure

---

## Entry 1 — Git Repository Inspection and Branch Creation

**Date:** 03 November 2026

### Task / Context

Inspect the existing SupportDesk Git repository, understand its
current state, and create a dedicated feature branch.

### Exact Prompt Used

"Explain the current Git repository status, identify the repository
root and remote, inspect recent commits, and guide me through
creating a feature branch without modifying main."

### Summary of AI Response

AI explained how to inspect the working tree, remote URL,
commit history and current branch. It recommended creating
a feature branch instead of working directly on main.

### Changes or Corrections

- Identified the nested SupportDesk repository.
- Confirmed the existing GitHub remote.
- Confirmed main was synchronized with origin/main.
- Created feat/repository-setup.
- Preserved the existing README and commit history.

### Verification

- Inspected git status.
- Inspected git remote -v.
- Inspected git log.
- Checked the current branch using git branch --show-current.

### Learning

Learned the importance of inspecting an existing repository
before making changes and using feature branches for isolated work.

### Follow-up Question

How should a developer safely synchronize a feature branch
with the latest main branch?

---

## Entry 2 — Monorepo Structure and Git Ignore Configuration

**Date:** 03 November 2026

### Task / Context

Create the initial SupportDesk monorepo directory structure
and configure Git to ignore generated files and local dependencies.

### Exact Prompt Used

"Guide me through creating the SupportDesk monorepo structure
according to the project roadmap. Explain the purpose of every
directory and prepare a suitable .gitignore for the project."

### Summary of AI Response

AI explained the purpose of apps/api, apps/web, apps/mobile,
agents, automation/n8n, postman, infra, docs and GitHub workflows.

It also explained why dependencies, environment files,
build outputs, logs and temporary files should be ignored.

### Changes or Corrections

- Created the required repository directories.
- Added .gitignore configuration.
- Included Node.js, Python, macOS and editor-related exclusions.
- Allowed .env.example while ignoring local environment files.

### Verification

- Inspected directories using find.
- Reviewed .gitignore.
- Checked Git status.
- Checked that the Git metadata directory was not confused
  with the .github directory.

### Learning

Learned how monorepos organise multiple applications and why
Git should not track dependencies, generated files or secrets.

### Follow-up Question

How does Git behave when a file is already tracked but later
added to .gitignore?

---

## Entry 3 — Environment Configuration and README Documentation

**Date:** 03 November 2026

### Task / Context

Create a safe environment variable template and review
the existing SupportDesk README before documenting repository setup.

### Exact Prompt Used

"Help me create a secure .env.example containing placeholder
configuration values. Review the existing README and suggest
a minimal addition documenting the actual repository setup
without overwriting existing project documentation."

### Summary of AI Response

AI explained environment variables, secret management,
Git ignore rules and the importance of preserving existing
project documentation.

It recommended adding a concise repository setup status section.

### Changes or Corrections

- Created .env.example with placeholder values.
- Reviewed the existing 1,122-line README.
- Preserved the existing PRD and architecture documentation.
- Prepared a repository setup status section.

### Verification

- Inspected .env.example.
- Checked Git ignore behaviour.
- Reviewed README headings and content.
- Reviewed Git diff and whitespace checks where performed.

### Learning

Learned how to separate application configuration from source
code and how to document actual implementation status without
presenting proposed architecture as completed functionality.

### Follow-up Question

How should environment variables be validated and managed
across development, testing and production environments?

---

## Day 4 Reflection

Today I learned how to inspect an existing Git repository,
create a feature branch, organise a monorepo, configure
.gitignore and prepare environment variable templates.

I also learned the importance of preserving existing work,
protecting secrets and verifying changes before committing.

**Status:** Initial repository setup in progress.
