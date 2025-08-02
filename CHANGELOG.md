# Changelog

All notable changes to Pathfinder will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Markdown rendering support for all AI tool outputs
- Skill descriptions generation via separate LLM call
- AI-Powered Next Actions with market data integration
- Salary research functionality for specific roles
- Real-time market insights in AI suggestions
- Technology descriptions prompt for missing skills
- Enhanced resume analysis with detailed skill explanations

### Changed
- Updated webpage title from "AI Job Tracker" to "Pathfinder"
- Improved resume editor layout (adjusted grid proportions)
- Enhanced weekly application goal counting logic
- Shortened AI-Powered Next Actions suggestions (max 4 items)
- Limited follow-up suggestions to applications older than 7 days
- Removed emojis from UI except for ✅ and ❌ symbols
- Updated "Path" in title to dirty yellow color (#D4AF37)

### Fixed
- Fixed weekly application goal counting to include both applicationDate and Applied status
- Resolved ReferenceError in resume checker skill descriptions
- Fixed markdown formatting in analysis results
- Corrected AI response parsing for technology descriptions
- Fixed skill descriptions output format and language

### Removed
- Removed "Generate Letter" button from job detail modal
- Removed hardcoded skill descriptions
- Removed motivational language from salary research suggestions

## [1.0.0] - 2025-01-XX

### Added
- Initial release of Pathfinder
- Job tracking with drag-and-drop interface
- Resume editor with PDF/DOC export
- AI-powered tools (Resume Checker, Cover Letter Generator, Deep Research)
- CRM contact management
- Calendar integration
- Voice interview simulation
- Analytics dashboard
- Dark/light theme support
- Local database storage
- Google Gemini AI integration

### Features
- Full-stack React + Node.js application
- TypeScript implementation
- Responsive design
- Real-time AI assistance
- Comprehensive job search workflow management 