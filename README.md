# Pathfinder 
![React](https://img.shields.io/badge/React-18+-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)
![Express.js](https://img.shields.io/badge/Express.js-4+-green.svg)
![SQLite](https://img.shields.io/badge/SQLite-3+-blue.svg)
![RAG](https://img.shields.io/badge/RAG-Retrieval--Augmented--Generation-orange.svg)
![Multi-Agent](https://img.shields.io/badge/Multi--Agent-AI%20Systems-purple.svg)

Lost track of your applications? Pathfinder brings order to your job search with smart AI tools.

Pathfinder is the first full-stack application crafted by addressing real user complaints about existing job trackers, designed to organize and streamline the job search process. It helps you track applications, manage resumes and contacts, and uses carefully tuned AI tools to automate routine tasks and prepare for interviews, all protected against errors like hallucinations.

The application runs locally on your machine (React + Node.js + SQLite), ensuring complete privacy and control over your data.

![yyyx (1)](https://github.com/user-attachments/assets/764978c0-e554-479f-b341-a1912dc01eb6)

## Table of Contents

- [Application Features](#application-features)
- [For Developers: Technical Implementation](#for-developers-technical-implementation)
- [Getting Started](#getting-started)
- [Contributing](#contributing)

## Application Features
This section describes Pathfinder's main screens and functions in the order you will encounter them.

📊 1. Dashboard

Your command center, which brings together key information:

- Statistics: An overview of your application count by stage.
- AI Skill Analysis: Compares your skills against a job's requirements.
- AI Next Actions: Recommends what to do next.
- Goals & Deadlines: Tracks your progress and upcoming events.

📋 2. Job Tracker (Kanban Board)

A visual board for managing your application pipeline:

- Status Columns: Drag and drop applications through stages from "Wishlist" to "Offer."
- Detailed View: All information about a job, including notes and contacts, in one place.

📅 3. Calendar

An integrated calendar for all your scheduling needs:

- Event Syncing: Interviews and deadlines from the tracker appear here automatically.
- Link to Jobs: Associate events with specific applications and contacts.

📄 4. Resumes

A builder for creating and managing multiple resume versions:

- Editor & Live Preview: A user-friendly editor with a real-time preview.
- Export: Save your resumes as PDF or Word files.

👥 5. Network (CRM)

Your personal CRM for professional contacts:

- Contact Cards: Store contact details and interaction history.
- Link to Jobs: Easily track who is helping you with which opportunity.

🤖 6. AI Tools

A powerful suite of tools to automate your work:

- Resume Analysis: Scores your resume's relevance to a job description.
- Cover Letter Generation: Automatically drafts cover letters based on your data.
- Voice Interview Simulator: Practice interviewing with an AI in real time.
- Company Research: Gathers detailed information on a potential employer.

📈 7. Analytics

A section with charts to measure your job search effectiveness:

- Hiring Funnel: Analyze your conversion rates from application to offer.
- Activity & Sources: Track your productivity and most effective channels.

⚙️ 8. Preferences

Full control over the application:

- AI Management: Customize system prompts to tailor the AI's behavior.
- Data Management: Export or delete all your data at any time.

## For Developers: Technical Implementation

This section is for those interested in the project's technical architecture.

### Architecture
The project is a **full-stack application** featuring:
- **Client** → React, TypeScript
- **Server** → Node.js, Express  
- **Database** → SQLite (local)

### AI Integration
The AI logic is implemented on the server-side and uses several key approaches:

#### Retrieval-Augmented Generation (RAG)
Used for resume analysis and company research. The system retrieves relevant information first, then feeds it to a Large Language Model (LLM) to generate a response.

#### AI Agent System  
User requests are handled by a system of specialized agents ("Recruiter," "Researcher"), each configured for a specific task.

#### Tool Use
Certain agents (e.g., the "Researcher") can use external tools like the Google Search API to gather live data.

#### Multimodality
The interview simulator works with voice, using speech-to-text and text-to-speech services.

## Getting Started

### Prerequisites
- **Node.js** ▸ v18 or newer
- **Package Manager** ▸ npm or yarn
- **Google Gemini AI API Key** ▸ Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

### Quick Start (Recommended)
Use the provided script to automatically launch the entire project:

```bash
./start.sh
```

This script will install dependencies (if needed), start the server and client, and then open the application in your browser.

### Manual Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/KazKozDev/pathfinder.git
   cd pathfinder
   ```

2. **Set up environment variables**
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit the .env file and add your API key
   # GEMINI_API_KEY=your_actual_api_key_here
   ```

3. **Install dependencies**
   ```bash
   npm install
   cd server && npm install && cd ..
   ```

4. **Start the server** (in a separate terminal)
   ```bash
   cd server && npm start
   ```

5. **Start the client** (in a new terminal)
   ```bash
   npm run dev
   ```

### Environment Variables

The application requires the following environment variables:

- `GEMINI_API_KEY`: Your Google Gemini AI API key (required for AI features)
- `PORT`: Server port (default: 3001)

### Security Notes

- Never commit your `.env` file to version control
- The `.env.example` file contains safe placeholder values
- Database files (`*.db`) are automatically ignored by Git

## Contributing

Contributions are welcome! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch** ▸ `git checkout -b feature/amazing-feature`
3. **Commit your changes** ▸ `git commit -m 'Add amazing feature'`
4. **Push to the branch** ▸ `git push origin feature/amazing-feature`
5. **Open a Pull Request**

Please ensure your code follows the existing style and includes appropriate tests.

## Support

If you like this project, please give it a star ⭐

For questions, feedback, or support, reach out to:
[Artem KK](https://www.linkedin.com/in/kazkozdev/) | MIT [LICENSE](LICENSE)
