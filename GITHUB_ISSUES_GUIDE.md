# GitHub Issues Creation Guide

This guide provides instructions for manually creating GitHub Issues and Labels for the Pathfinder project.

## Issues to Create

### 1. Epic Issue
**Title**: `[Epic] Implement Core User Acquisition & Workflow Features`

**Description**: Use content from `epic-core-features-issue.md`

**Labels**: `epic`, `enhancement`, `high-priority`, `user-acquisition`

### 2. Browser Extension Issue
**Title**: `[Feature] Browser Extension for 1-Click Job Saving`

**Description**: Use content from `browser-extension-issue.md`

**Labels**: `enhancement`, `frontend`, `good first issue`, `help wanted`

### 3. Mobile App Issue
**Title**: `[Feature] Full-Functionality Mobile Application (iOS & Android)`

**Description**: Use content from `mobile-app-issue.md`

**Labels**: `enhancement`, `mobile`, `good first issue`, `help wanted`

### 4. Multi-Template Resume Issue
**Title**: `[Feature] Advanced Resume Management: Multi-Template System`

**Description**: Use content from `multi-template-resume-issue.md`

**Labels**: `enhancement`, `frontend`, `resume-builder`, `templates`

### 5. AI Provider Management Issue
**Title**: `[Feature] Advanced AI Provider Management & Community Features`

**Description**: Use content from `ai-provider-management-issue.md`

**Labels**: `enhancement`, `ai-integration`, `community`, `privacy`, `open-source`

## Labels to Create

### Priority Labels
- `epic` - Color: `#5319E7` (Purple)
- `high-priority` - Color: `#D93F0B` (Red)
- `medium-priority` - Color: `#FEF2C0` (Yellow)
- `low-priority` - Color: `#0E8A16` (Green)

### Type Labels
- `enhancement` - Color: `#1D76DB` (Blue)
- `bug` - Color: `#D93F0B` (Red)
- `documentation` - Color: `#0075CA` (Blue)
- `good first issue` - Color: `#7057FF` (Purple)
- `help wanted` - Color: `#008672` (Teal)

### Area Labels
- `frontend` - Color: `#0E8A16` (Green)
- `backend` - Color: `#1D76DB` (Blue)
- `mobile` - Color: `#7057FF` (Purple)
- `ai-integration` - Color: `#FF6B6B` (Red)
- `resume-builder` - Color: `#FFA500` (Orange)
- `templates` - Color: `#8B5CF6` (Purple)
- `community` - Color: `#059669` (Green)
- `privacy` - Color: `#DC2626` (Red)
- `open-source` - Color: `#2563EB` (Blue)
- `user-acquisition` - Color: `#7C3AED` (Purple)

## How to Create Issues

### Method 1: GitHub Web Interface
1. Go to your repository on GitHub
2. Click the "Issues" tab
3. Click "New issue"
4. Copy and paste the content from the corresponding `.md` file
5. Add the appropriate labels
6. Click "Submit new issue"

### Method 2: GitHub CLI (if authenticated)
```bash
# Create Epic Issue
gh issue create --title "[Epic] Implement Core User Acquisition & Workflow Features" --body-file epic-core-features-issue.md --label "epic,enhancement,high-priority,user-acquisition"

# Create Browser Extension Issue
gh issue create --title "[Feature] Browser Extension for 1-Click Job Saving" --body-file browser-extension-issue.md --label "enhancement,frontend,good first issue,help wanted"

# Create Mobile App Issue
gh issue create --title "[Feature] Full-Functionality Mobile Application (iOS & Android)" --body-file mobile-app-issue.md --label "enhancement,mobile,good first issue,help wanted"

# Create Multi-Template Resume Issue
gh issue create --title "[Feature] Advanced Resume Management: Multi-Template System" --body-file multi-template-resume-issue.md --label "enhancement,frontend,resume-builder,templates"

# Create AI Provider Management Issue
gh issue create --title "[Feature] Advanced AI Provider Management & Community Features" --body-file ai-provider-management-issue.md --label "enhancement,ai-integration,community,privacy,open-source"
```

## How to Create Labels

### Method 1: GitHub Web Interface
1. Go to your repository on GitHub
2. Click the "Issues" tab
3. Click "Labels" in the sidebar
4. Click "New label"
5. Enter label name, description, and color
6. Click "Create label"

### Method 2: GitHub CLI (if authenticated)
```bash
# Priority Labels
gh api repos/:owner/:repo/labels --field name="epic" --field color="5319E7" --field description="Epic issues that track major feature implementations"
gh api repos/:owner/:repo/labels --field name="high-priority" --field color="D93F0B" --field description="High priority issues that need immediate attention"
gh api repos/:owner/:repo/labels --field name="medium-priority" --field color="FEF2C0" --field description="Medium priority issues"
gh api repos/:owner/:repo/labels --field name="low-priority" --field color="0E8A16" --field description="Low priority issues"

# Type Labels
gh api repos/:owner/:repo/labels --field name="enhancement" --field color="1D76DB" --field description="New features and improvements"
gh api repos/:owner/:repo/labels --field name="bug" --field color="D93F0B" --field description="Something isn't working"
gh api repos/:owner/:repo/labels --field name="documentation" --field color="0075CA" --field description="Documentation improvements"
gh api repos/:owner/:repo/labels --field name="good first issue" --field color="7057FF" --field description="Good for newcomers"
gh api repos/:owner/:repo/labels --field name="help wanted" --field color="008672" --field description="Extra attention is needed"

# Area Labels
gh api repos/:owner/:repo/labels --field name="frontend" --field color="0E8A16" --field description="Frontend development"
gh api repos/:owner/:repo/labels --field name="backend" --field color="1D76DB" --field description="Backend development"
gh api repos/:owner/:repo/labels --field name="mobile" --field color="7057FF" --field description="Mobile application development"
gh api repos/:owner/:repo/labels --field name="ai-integration" --field color="FF6B6B" --field description="AI and machine learning features"
gh api repos/:owner/:repo/labels --field name="resume-builder" --field color="FFA500" --field description="Resume building features"
gh api repos/:owner/:repo/labels --field name="templates" --field color="8B5CF6" --field description="Template system"
gh api repos/:owner/:repo/labels --field name="community" --field color="059669" --field description="Community features"
gh api repos/:owner/:repo/labels --field name="privacy" --field color="DC2626" --field description="Privacy and security features"
gh api repos/:owner/:repo/labels --field name="open-source" --field color="2563EB" --field description="Open source features"
gh api repos/:owner/:repo/labels --field name="user-acquisition" --field color="7C3AED" --field description="User acquisition features"
```

## Notes

- Replace `:owner/:repo` with your actual GitHub username and repository name
- Make sure you're authenticated with GitHub CLI before running commands
- The web interface method is more reliable if you're not comfortable with CLI
- All issue content is provided in the corresponding `.md` files
- Labels can be created in any order, but issues should reference existing labels 