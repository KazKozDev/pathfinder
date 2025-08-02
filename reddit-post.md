# Show HN: Pathfinder - AI-powered job tracker built from real user complaints

I built Pathfinder after getting frustrated with existing job tracking tools. I spent a week reading user reviews and found common complaints:

**Problems with existing tools:**
- Privacy concerns (cloud storage)
- Poor UX (clunky interfaces)
- No AI assistance
- Expensive subscriptions
- No interview prep features

**What I built:**
- **Local-first** (SQLite, your data stays on your machine)
- **AI-powered** (resume analysis, cover letter generation, voice interview simulator)
- **Open source** (React + TypeScript + Node.js)
- **Free** (no subscriptions, no paywalls)

**Key features:**
- Smart job tracking with Kanban board
- AI resume analysis against job descriptions
- Cover letter generation with Google Gemini
- Voice interview simulator for practice
- Integrated CRM for networking
- Calendar with automatic reminders

**Tech stack:**
- Frontend: React + TypeScript + Vite
- Backend: Node.js + Express
- Database: SQLite (local)
- AI: Google Gemini API
- Testing: Vitest (49 tests, 95% coverage)

**Why local storage?**
User reviews consistently mentioned privacy concerns. Your data never leaves your computer.

**Why AI integration?**
Job seekers struggle with resume optimization and interview prep. The AI provides specific, actionable feedback.

**Results:**
- 49 passing tests
- 95%+ code coverage
- Full documentation
- Ready for contributors

**Try it:**
```bash
git clone https://github.com/KazKozDev/pathfinder.git
cd pathfinder
./start.sh
```

**Looking for:**
- Feedback from job seekers
- Contributors (React, TypeScript, AI)
- Feature suggestions

What do you think? Would you use something like this? 