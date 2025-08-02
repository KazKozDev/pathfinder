import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DatabaseManager {
  constructor() {
    this.db = new Database(path.join(__dirname, 'pathfinder.db'));
    this.initDatabase();
  }

  initDatabase() {
    // Создаем таблицы если они не существуют
    this.db.exec(`
            CREATE TABLE IF NOT EXISTS jobs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                company TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'Wishlist',
                description TEXT,
                selectedResumeId INTEGER,
                coverLetter TEXT,
                location TEXT,
                sourceUrl TEXT,
                source TEXT,
                dateAdded INTEGER NOT NULL,
                applicationDate TEXT,
                contactIds TEXT,
                portfolioUrl TEXT,
                communicationLog TEXT,
                questionsForInterviewer TEXT,
                salaryInfo TEXT,
                notes TEXT,
                priority TEXT DEFAULT 'Medium',
                interestLevel INTEGER DEFAULT 0,
                tags TEXT,
                nextStep TEXT,
                nextStepDate TEXT
            );

            CREATE TABLE IF NOT EXISTS resumes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                contact TEXT NOT NULL,
                summary TEXT,
                experience TEXT NOT NULL,
                education TEXT NOT NULL,
                skills TEXT,
                customSections TEXT
            );

            CREATE TABLE IF NOT EXISTS contacts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                role TEXT,
                company TEXT,
                email TEXT,
                phone TEXT,
                linkedinUrl TEXT,
                source TEXT,
                notes TEXT,
                dateAdded INTEGER NOT NULL,
                tags TEXT,
                lastInteraction INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS calendar_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                date TEXT NOT NULL,
                time TEXT,
                type TEXT NOT NULL,
                notes TEXT,
                jobId INTEGER,
                contactId INTEGER
            );

            CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY DEFAULT 1,
                profile TEXT NOT NULL,
                subscription TEXT NOT NULL,
                privacy TEXT NOT NULL,
                prompts TEXT NOT NULL,
                agents TEXT NOT NULL
            );
        `);
  }

  // Jobs CRUD operations
  getAllJobs() {
    const stmt = this.db.prepare('SELECT * FROM jobs ORDER BY dateAdded DESC');
    return stmt.all();
  }

  getJobById(id) {
    const stmt = this.db.prepare('SELECT * FROM jobs WHERE id = ?');
    return stmt.get(id);
  }

  createJob(job) {
    const stmt = this.db.prepare(`
            INSERT INTO jobs (
                title, company, status, description, selectedResumeId, coverLetter,
                location, sourceUrl, source, dateAdded, applicationDate, contactIds,
                portfolioUrl, communicationLog, questionsForInterviewer, salaryInfo,
                notes, priority, interestLevel, tags, nextStep, nextStepDate
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

    const result = stmt.run(
      job.title,
      job.company,
      job.status,
      job.description,
      job.selectedResumeId,
      job.coverLetter,
      job.location,
      job.sourceUrl,
      job.source,
      job.dateAdded,
      job.applicationDate,
      JSON.stringify(job.contactIds || []),
      job.portfolioUrl,
      JSON.stringify(job.communicationLog || []),
      job.questionsForInterviewer,
      JSON.stringify(job.salaryInfo || {}),
      job.notes,
      job.priority,
      job.interestLevel,
      JSON.stringify(job.tags || []),
      job.nextStep,
      job.nextStepDate
    );

    return { ...job, id: result.lastInsertRowid };
  }

  updateJob(job) {
    const stmt = this.db.prepare(`
            UPDATE jobs SET 
                title = ?, company = ?, status = ?, description = ?, selectedResumeId = ?,
                coverLetter = ?, location = ?, sourceUrl = ?, source = ?, applicationDate = ?,
                contactIds = ?, portfolioUrl = ?, communicationLog = ?, questionsForInterviewer = ?,
                salaryInfo = ?, notes = ?, priority = ?, interestLevel = ?, tags = ?,
                nextStep = ?, nextStepDate = ?
            WHERE id = ?
        `);

    stmt.run(
      job.title,
      job.company,
      job.status,
      job.description,
      job.selectedResumeId,
      job.coverLetter,
      job.location,
      job.sourceUrl,
      job.source,
      job.applicationDate,
      JSON.stringify(job.contactIds || []),
      job.portfolioUrl,
      JSON.stringify(job.communicationLog || []),
      job.questionsForInterviewer,
      JSON.stringify(job.salaryInfo || {}),
      job.notes,
      job.priority,
      job.interestLevel,
      JSON.stringify(job.tags || []),
      job.nextStep,
      job.nextStepDate,
      job.id
    );

    return job;
  }

  deleteJob(id) {
    const stmt = this.db.prepare('DELETE FROM jobs WHERE id = ?');
    return stmt.run(id);
  }

  // Resumes CRUD operations
  getAllResumes() {
    const stmt = this.db.prepare('SELECT * FROM resumes ORDER BY id DESC');
    return stmt.all();
  }

  getResumeById(id) {
    const stmt = this.db.prepare('SELECT * FROM resumes WHERE id = ?');
    return stmt.get(id);
  }

  createResume(resume) {
    const stmt = this.db.prepare(`
            INSERT INTO resumes (name, contact, summary, experience, education, skills, customSections)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

    const result = stmt.run(
      resume.name,
      JSON.stringify(resume.contact),
      resume.summary,
      JSON.stringify(resume.experience),
      JSON.stringify(resume.education),
      resume.skills,
      JSON.stringify(resume.customSections || [])
    );

    return { ...resume, id: result.lastInsertRowid };
  }

  updateResume(resume) {
    const stmt = this.db.prepare(`
            UPDATE resumes SET 
                name = ?, contact = ?, summary = ?, experience = ?, education = ?, skills = ?, customSections = ?
            WHERE id = ?
        `);

    stmt.run(
      resume.name,
      JSON.stringify(resume.contact),
      resume.summary,
      JSON.stringify(resume.experience),
      JSON.stringify(resume.education),
      resume.skills,
      JSON.stringify(resume.customSections || []),
      resume.id
    );

    return resume;
  }

  deleteResume(id) {
    const stmt = this.db.prepare('DELETE FROM resumes WHERE id = ?');
    return stmt.run(id);
  }

  // Contacts CRUD operations
  getAllContacts() {
    const stmt = this.db.prepare(
      'SELECT * FROM contacts ORDER BY lastInteraction DESC'
    );
    return stmt.all();
  }

  getContactById(id) {
    const stmt = this.db.prepare('SELECT * FROM contacts WHERE id = ?');
    return stmt.get(id);
  }

  createContact(contact) {
    const stmt = this.db.prepare(`
            INSERT INTO contacts (name, role, company, email, phone, linkedinUrl, source, notes, dateAdded, tags, lastInteraction)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

    const result = stmt.run(
      contact.name,
      contact.role,
      contact.company,
      contact.email,
      contact.phone,
      contact.linkedinUrl,
      contact.source,
      contact.notes,
      contact.dateAdded,
      JSON.stringify(contact.tags || []),
      contact.lastInteraction
    );

    return { ...contact, id: result.lastInsertRowid };
  }

  updateContact(contact) {
    const stmt = this.db.prepare(`
            UPDATE contacts SET 
                name = ?, role = ?, company = ?, email = ?, phone = ?, linkedinUrl = ?,
                source = ?, notes = ?, tags = ?, lastInteraction = ?
            WHERE id = ?
        `);

    stmt.run(
      contact.name,
      contact.role,
      contact.company,
      contact.email,
      contact.phone,
      contact.linkedinUrl,
      contact.source,
      contact.notes,
      JSON.stringify(contact.tags || []),
      contact.lastInteraction,
      contact.id
    );

    return contact;
  }

  deleteContact(id) {
    const stmt = this.db.prepare('DELETE FROM contacts WHERE id = ?');
    return stmt.run(id);
  }

  // Calendar Events CRUD operations
  getAllEvents() {
    const stmt = this.db.prepare(
      'SELECT * FROM calendar_events ORDER BY date ASC'
    );
    return stmt.all();
  }

  getEventById(id) {
    const stmt = this.db.prepare('SELECT * FROM calendar_events WHERE id = ?');
    return stmt.get(id);
  }

  createEvent(event) {
    const stmt = this.db.prepare(`
            INSERT INTO calendar_events (title, date, time, type, notes, jobId, contactId)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

    const result = stmt.run(
      event.title,
      event.date,
      event.time,
      event.type,
      event.notes,
      event.jobId,
      event.contactId
    );

    return { ...event, id: result.lastInsertRowid };
  }

  updateEvent(event) {
    const stmt = this.db.prepare(`
            UPDATE calendar_events SET 
                title = ?, date = ?, time = ?, type = ?, notes = ?, jobId = ?, contactId = ?
            WHERE id = ?
        `);

    stmt.run(
      event.title,
      event.date,
      event.time,
      event.type,
      event.notes,
      event.jobId,
      event.contactId,
      event.id
    );

    return event;
  }

  deleteEvent(id) {
    const stmt = this.db.prepare('DELETE FROM calendar_events WHERE id = ?');
    return stmt.run(id);
  }

  // Settings operations
  getSettings() {
    const stmt = this.db.prepare('SELECT * FROM settings WHERE id = 1');
    const result = stmt.get();
    if (!result) {
      // Return default settings if none exist
      return {
        profile: JSON.stringify({
          name: 'Alex Doe',
          weeklyGoal: 5,
          masterSkills:
            'JavaScript, HTML, CSS, React, Project Management, Agile Methodologies, UI/UX Design Principles, Figma, Public Speaking',
        }),
        subscription: JSON.stringify({
          plan: 'Premium',
          status: 'Active',
          nextBillingDate: new Date('2024-08-15').getTime(),
        }),
        privacy: JSON.stringify({
          shareAnonymizedData: true,
        }),
        prompts: JSON.stringify({
          coverLetter: 'You are a professional career coach...',
          mixAgents: 'You are a helpful AI assistant...',
          resumeChecker: 'You are a brutally honest...',
          interviewQuestions: 'You are an AI Interviewer...',
        }),
        agents: JSON.stringify({
          recruiter: {
            name: 'Recruiter Agent',
            prompt: 'Specializes in HR processes...',
            tools: {
              google_search: { enabled: false },
              linkedin_analysis: { enabled: true },
            },
          },
          research: {
            name: 'Research Agent',
            prompt: 'Conducts deep analysis...',
            tools: {
              google_search: { enabled: true },
              linkedin_analysis: { enabled: true },
            },
          },
          coach: {
            name: 'Coach Agent',
            prompt: 'Acts as a personal career coach...',
            tools: {
              google_search: { enabled: false },
              linkedin_analysis: { enabled: false },
            },
          },
        }),
      };
    }
    return result;
  }

  updateSettings(settings) {
    const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO settings (id, profile, subscription, privacy, prompts, agents)
            VALUES (1, ?, ?, ?, ?, ?)
        `);

    stmt.run(
      JSON.stringify(settings.profile),
      JSON.stringify(settings.subscription),
      JSON.stringify(settings.privacy),
      JSON.stringify(settings.prompts),
      JSON.stringify(settings.agents)
    );

    return settings;
  }

  // Helper method to parse JSON fields
  parseJsonFields(data) {
    if (Array.isArray(data)) {
      return data.map(item => this.parseJsonFields(item));
    }

    if (typeof data === 'object' && data !== null) {
      const parsed = {};
      for (const [key, value] of Object.entries(data)) {
        if (
          typeof value === 'string' &&
          (value.startsWith('[') || value.startsWith('{'))
        ) {
          try {
            parsed[key] = JSON.parse(value);
          } catch {
            parsed[key] = value;
          }
        } else {
          parsed[key] = value;
        }
      }
      return parsed;
    }

    return data;
  }

  close() {
    this.db.close();
  }
}

export default DatabaseManager;
