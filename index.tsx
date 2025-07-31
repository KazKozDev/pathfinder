import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type, Chat } from '@google/genai';
import apiService from './api.js';

// --- TYPE DEFINITIONS ---

// Define types for jsPDF and html2canvas to avoid TypeScript errors
declare var jspdf: { jsPDF: any };
declare var html2canvas: any;

// Fix for SpeechRecognition API not being in standard TS lib
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface CustomSection {
  id: number;
  title: string;
  content: string;
}

// Resume-related types
interface ResumeContact {
  name: string;
  email: string;
  phone: string;
  linkedin: string;
  website: string;
}

interface WorkExperience {
  id: number;
  role: string;
  company: string;
  location: string;
  startDate: string; // YYYY-MM
  endDate: string; // YYYY-MM or 'Present'
  description: string; // Bullet points, newline separated
}

interface Education {
  id: number;
  institution: string;
  degree: string;
  location: string;
  startDate: string;
  endDate:string;
}

interface Resume {
  id: number;
  name: string;
  contact: ResumeContact;
  summary: string;
  experience: WorkExperience[];
  education: Education[];
  skills: string; // Comma-separated string
  customSections?: CustomSection[];
}

interface CrmContact {
  id: number;
  name: string;
  role: string;
  company: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  source: string;
  notes: string;
  dateAdded: number;
  tags: string[];
  lastInteraction: number;
}

interface LogEntry {
  id: number;
  date: string;
  type: 'Email' | 'Call' | 'Message' | 'Meeting';
  summary: string;
}

type JobStatus = 'Wishlist' | 'Applied' | 'Screening' | 'Interviewing' | 'Test Task' | 'Offer' | 'Rejection';

interface Job {
  id: number;
  title: string;
  company: string;
  status: JobStatus;
  description: string; // Full job description from the posting
  selectedResumeId?: number;
  coverLetter?: string;

  // New fields from user request
  location?: string;
  sourceUrl?: string;
  source?: string;
  dateAdded: number; // Stored as timestamp
  applicationDate?: string; // Stored as 'YYYY-MM-DD'
  contactIds?: number[];
  portfolioUrl?: string;
  communicationLog?: LogEntry[];
  questionsForInterviewer?: string;
  salaryInfo?: {
    range: string;
    expectations: string;
    discussed: string;
  };
  notes?: string; // User's personal notes
  priority?: 'High' | 'Medium' | 'Low';
  interestLevel?: number; // 1-5
  tags?: string[];
  nextStep?: string;
  nextStepDate?: string; // 'YYYY-MM-DD'
}


interface Message {
  sender: 'user' | 'ai' | 'error';
  text: string;
  fileName?: string;
}

interface Tool {
    id: string;
    name:string;
    description: string;
}

interface AgentSettings {
    name: string;
    prompt: string;
    tools: { [toolId: string]: { enabled: boolean } };
}

interface Settings {
    profile: {
        name: string;
        weeklyGoal: number;
        masterSkills: string;
    };
    subscription: {
        plan: 'Free' | 'Premium';
        status: 'Active' | 'Cancelled';
        nextBillingDate: number;
    };
    privacy: {
        shareAnonymizedData: boolean;
    };
    prompts: {
        coverLetter: string;
        mixAgents: string;
        resumeChecker: string;
        interviewQuestions: string;
    };
    agents: {
        recruiter: AgentSettings;
        research: AgentSettings;
        coach: AgentSettings;
    };
}


type Tab = 'Dashboard' | 'Job Tracker' | 'Calendar' | 'Resumes' | 'Network' | 'AI Tools' | 'Analytics' | 'Preferences';

type CalendarEventType = 'Interview' | 'Deadline' | 'Task' | 'Networking' | 'Personal';

interface CalendarEvent {
    id: number;
    title: string;
    date: string; // YYYY-MM-DD
    time?: string; // HH:MM
    type: CalendarEventType;
    notes?: string;
    jobId?: number; // Optional link to a job
    contactId?: number; // Optional link to a contact
}

// --- API INITIALIZATION ---
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}
const ai = new GoogleGenAI({ apiKey: API_KEY });

// --- SVG ICONS ---
const Icon = ({ path, className = '' }: { path: string, className?: string }) => (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d={path} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);
const DashboardIcon = () => <Icon path="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />;
const ClipboardIcon = () => <Icon path="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2m4-2h4a2 2 0 0 1 2 2v2H8V4a2 2 0 0 1 2-2z" />;
const CalendarIcon = () => <Icon path="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" />;
const ContactsIcon = () => <Icon path="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M23 21v-2a4 4 0 0 0-3-3.87" />;
const SparkleIcon = () => <Icon path="M10 3L8 8l-5 2 5 2 2 5 2-5 5-2-5-2-2-5z M18 13l-2 4-4 2 4 2 2 4 2-4 4-2-4-2-2-4z" />;
const ResumesIcon = () => <Icon path="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6M16 13H8M16 17H8M10 9H8" />;
const SettingsIcon = () => <Icon path="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.44,0.17-0.48,0.41L9.26,5.35C8.67,5.59,8.14,5.92,7.64,6.29L5.25,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.04,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44,0.17,0.48,0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59,0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>;
const AnalyticsIcon = () => <Icon path="M12 20V10M18 20V4M6 20V16" />;
const PaperclipIcon = () => <Icon path="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />;
const SunIcon = () => <Icon path="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42 M12 16a4 4 0 100-8 4 4 0 000 8z" />;
const MoonIcon = () => <Icon path="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />;
const MailIcon = () => <Icon path="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6" />;
const ClipboardCheckIcon = () => <Icon path="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2m4-2h4a2 2 0 0 1 2 2v2H8V4a2 2 0 0 1 2-2zM9 14l2 2 4-4" />;
const SendIcon = () => <Icon path="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />;
const RefreshCwIcon = ({ className = '' }: { className?: string }) => <Icon path="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" className={className} />;
const PdfIcon = () => <Icon path="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM9.5 14.5v-5h1a1.5 1.5 0 0 1 0 3h-1m-2.5-3h1v5H7V9.5c0-.83.67-1.5 1.5-1.5H10v5h1.5v-5a1.5 1.5 0 0 1 1.5-1.5H16v5h1.5V8h-3v1.5h1.5v2h-1.5V8H13c-.83 0-1.5.67-1.5 1.5v5H9.5z" />;
const WordIcon = () => <Icon path="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM15 18h-2l-1-4-1 4H9l-2-8h2l1 4 1-4h2l1 4 1-4h2l-2 8z" />;
const LinkedInIcon = () => <Icon path="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2zM4 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />;
const MicrophoneIcon = () => <Icon path="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2H3v2a8 8 0 0 0 7 7.93V22h2v-2.07A8 8 0 0 0 21 12v-2h-2z" />;


// --- INITIAL DATA & CONSTANTS ---
const jobStatuses: JobStatus[] = ['Wishlist', 'Applied', 'Screening', 'Interviewing', 'Test Task', 'Offer', 'Rejection'];
const availableTools: Tool[] = [
    { id: 'google_search', name: 'Google Search', description: 'Access up-to-date information from the web.' },
    { id: 'linkedin_analysis', name: 'LinkedIn Analysis', description: 'Analyze profiles and company pages on LinkedIn.' },
];

// Function to load prompts from files
const loadPromptsFromFiles = async (): Promise<{ coverLetter: string, resumeChecker: string }> => {
    try {
        const [coverLetterResponse, resumeCheckerResponse] = await Promise.all([
            fetch('/prompts/cover-letter-prompt.txt'),
            fetch('/prompts/resume-checker-prompt.txt')
        ]);
        
        const coverLetter = await coverLetterResponse.text();
        const resumeChecker = await resumeCheckerResponse.text();
        
        return { coverLetter, resumeChecker };
    } catch (error) {
        console.error('Failed to load prompts from files:', error);
        // Fallback to default prompts
        return {
            coverLetter: `Generate a cover letter for {{JSON_DATA}}. Structure it according to these points:

Introduction:
Briefly introduce yourself (name and qualification).
State the position and the reason for your application.
Mention the source where you found the vacancy, if possible.

Main Section:
Describe relevant skills and experience, especially those matching the job requirements.
Explain why you are a good fit for the role and for this company in particular.
Highlight unique qualities that set you apart from other candidates.
Use keywords from the job description.

Conclusion:
Express your willingness for an interview or further discussion.
Thank the reader for their time and consideration.
Mention that your CV/resume is attached.`,
            resumeChecker: `You are a professional resume analyzer. Your task is to evaluate how well a candidate's resume matches a specific job description.

**ANALYSIS INSTRUCTIONS:**
- Compare the resume content against the job requirements
- Identify key skills and qualifications from the job description
- Check if the resume highlights relevant experience
- Assess the overall match quality
- Provide specific recommendations for improvement

**JOB DESCRIPTION:**
{{JOB_DESCRIPTION}}

**RESUME CONTENT:**
{{RESUME_CONTENT}}

**EVALUATION CRITERIA:**
1. Skills Match: How well do the resume skills align with job requirements?
2. Experience Relevance: Does the experience demonstrate the required capabilities?
3. Keywords: Are important job keywords present in the resume?
4. Formatting: Is the resume clear and professional?

**PROVIDE:**
- Match score (0-100%)
- Key missing skills/qualifications
- Specific improvement suggestions
- Overall assessment

Analyze the resume thoroughly and provide actionable feedback.`
        };
    }
};

const initialSettings: Settings = {
    profile: {
        name: "Alex Doe",
        weeklyGoal: 5,
        masterSkills: "JavaScript, HTML, CSS, React, Project Management, Agile Methodologies, UI/UX Design Principles, Figma, Public Speaking",
    },
    subscription: {
        plan: 'Premium',
        status: 'Active',
        nextBillingDate: new Date('2024-08-15').getTime(),
    },
    privacy: {
        shareAnonymizedData: true,
    },
    prompts: {
        resumeChecker: `Loading...`,
        coverLetter: `Loading...`,
        interviewQuestions: `You are an AI Interviewer. Your goal is to conduct a realistic mock interview for the user.
- Start by introducing yourself and asking the first question.
- Ask only ONE question at a time.
- After the user responds, ask a relevant follow-up question or move to the next topic.
- Keep your questions concise and professional.
- Base your questions on the provided job description and the user's resume.
- End the interview after about 5-7 questions by thanking the user for their time and providing brief, constructive feedback on their responses.

---
**JOB DESCRIPTION for "{{JOB_TITLE}}" at "{{COMPANY}}":**
{{JOB_DESCRIPTION}}
---
**CANDIDATE'S RESUME:**
{{RESUME_CONTENT}}
---

Begin the interview now.`,
        mixAgents: `You are a helpful AI assistant for job seekers, acting as an orchestrator for a team of specialized agents. The user has enabled "Mix Agents" mode. Your goal is to provide a comprehensive answer by synthesizing insights from MULTIPLE relevant agents. Start each agent's contribution on a new line, clearly stating which agent is talking (e.g., "**Recruiter Agent:** ..."). Do not just pick one agent; combine their expertise. Below are the available agents, their specializations, and their enabled tools.`,
    },
    agents: {
        recruiter: {
            name: "Recruiter Agent",
            prompt: "Specializes in HR processes, resume optimization, and negotiation strategies.",
            tools: { google_search: { enabled: false }, linkedin_analysis: { enabled: true } },
        },
        research: {
            name: "Research Agent",
            prompt: "Conducts deep analysis of companies, industries, and interviewers.",
            tools: { google_search: { enabled: true }, linkedin_analysis: { enabled: true } },
        },
        coach: {
            name: "Coach Agent",
            prompt: "Acts as a personal career coach, helping with interview practice, salary negotiation, and long-term career planning.",
            tools: { google_search: { enabled: false }, linkedin_analysis: { enabled: false } },
        },
    },
};

// --- UTILITY FUNCTIONS ---
const getResumeAsText = (r: Resume) => {
    let text = `Name: ${r.contact.name}\nEmail: ${r.contact.email}\nPhone: ${r.contact.phone}\nLinkedIn: ${r.contact.linkedin}\nWebsite: ${r.contact.website}\n\n`;
    text += `SUMMARY:\n${r.summary}\n\n`;
    text += `SKILLS:\n${r.skills}\n\n`;
    text += `EXPERIENCE:\n`;
    r.experience.forEach(exp => {
        text += `${exp.role} at ${exp.company} (${exp.startDate} - ${exp.endDate})\n${exp.description}\n\n`;
    });
    text += `EDUCATION:\n`;
    r.education.forEach(edu => {
        text += `${edu.degree} from ${edu.institution} (${edu.startDate} - ${edu.endDate})\n\n`;
    });
    if (r.customSections) {
        r.customSections.forEach(sec => {
            text += `${sec.title.toUpperCase()}:\n${sec.content}\n\n`;
        });
    }
    return text;
};

// --- COMPONENTS ---

const JobCard = ({ job }: { job: Job }) => (
  <div className={`job-card job-card--${job.status.replace(' ', '-')}`}>
    <h3>{job.title}</h3>
    <p>{job.company}</p>
  </div>
);

const JobDetailModal = ({ job, crmContacts, resumes, settings, onSave, onCancel, onDelete }: { job: Job, crmContacts: CrmContact[], resumes: Resume[], settings: Settings, onSave: (updatedJob: Job) => void, onCancel: () => void, onDelete: (jobId: number) => void }) => {
    const [formData, setFormData] = useState<Job>(job);
    const [isGenerating, setIsGenerating] = useState(false);
    const [activeTab, setActiveTab] = useState('Overview');
    const [tagInput, setTagInput] = useState('');
    const modalBodyRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => { if (event.key === 'Escape') onCancel(); };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onCancel]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleNestedChange = (e: React.ChangeEvent<HTMLInputElement>, parent: keyof Job, field: string) => {
        const { value } = e.target;
        setFormData(prev => ({
            ...prev,
            [parent]: {
                ...(prev[parent] as object),
                [field]: value,
            }
        }));
    };
    
    const handleSave = () => onSave(formData);
    const handleDelete = () => onDelete(formData.id);
    
    const handleGenerateLetter = async () => {
        setIsGenerating(true);
        const selectedResume = resumes.find(r => r.id === formData.selectedResumeId);
        
        if (!selectedResume) {
            setFormData(prev => ({ ...prev, coverLetter: "Error: Please select an associated resume first." }));
            setIsGenerating(false);
            return;
        }

        // Validate that we have the necessary data
        if (!formData.description || formData.description.trim().length < 50) {
            setFormData(prev => ({ ...prev, coverLetter: "Error: Job description is too short or missing. Please add a detailed job description first." }));
            setIsGenerating(false);
            return;
        }
        
        if (!selectedResume.summary || selectedResume.summary.trim() === '') {
            setFormData(prev => ({ ...prev, coverLetter: "Error: Resume summary is missing. Please add a summary to your resume first." }));
            setIsGenerating(false);
            return;
        }
        
        if (!selectedResume.experience || selectedResume.experience.length === 0) {
            setFormData(prev => ({ ...prev, coverLetter: "Error: Resume has no work experience. Please add work experience to your resume first." }));
            setIsGenerating(false);
            return;
        }

        const contact = formData.contactIds?.[0] ? crmContacts.find(c => c.id === formData.contactIds[0]) : null;

        const dataForPrompt = {
            candidate: {
                name: selectedResume.contact.name,
                email: selectedResume.contact.email,
                phone: selectedResume.contact.phone,
                linkedin: selectedResume.contact.linkedin,
                website: selectedResume.contact.website,
                qualificationAndExperience: selectedResume.summary,
                fullResumeContent: getResumeAsText(selectedResume)
            },
            job: {
                position: formData.title,
                company: formData.company,
                source: formData.sourceUrl || formData.source || "N/A",
                fullDescription: formData.description || "No description provided.",
                recipientName: contact ? contact.name : "Hiring Manager",
                recipientRole: contact ? contact.role : "",
                companyAddress: formData.location || ""
            },
            currentDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        };

        const promptTemplate = settings.prompts.coverLetter;
        const prompt = promptTemplate.replace('{{JSON_DATA}}', JSON.stringify(dataForPrompt, null, 2));

        try {
            const response = await ai.models.generateContent({ 
                model: "gemini-2.5-flash", 
                contents: prompt 
            });
            
            // Check if the response is valid
            if (response.text && response.text.trim().length > 0) {
                setFormData(prev => ({...prev, coverLetter: response.text}));
            } else {
                setFormData(prev => ({...prev, coverLetter: "Error: Generated cover letter is empty. Please try again."}));
            }
        } catch (error) {
            console.error("Cover letter generation failed:", error);
            setFormData(prev => ({...prev, coverLetter: "Error: Could not generate cover letter. Please try again."}));
        } finally {
            setIsGenerating(false);
        }
    };
    
    // Tag handlers
    const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setTagInput(e.target.value);
    const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const newTag = tagInput.trim();
            if (newTag && !formData.tags?.includes(newTag)) {
                setFormData(prev => ({ ...prev, tags: [...(prev.tags || []), newTag]}));
            }
            setTagInput('');
        }
    };
    const removeTag = (tagToRemove: string) => {
        setFormData(prev => ({ ...prev, tags: prev.tags?.filter(tag => tag !== tagToRemove)}));
    };
    
    // Contact & Log handlers
    const addContactId = (contactId: number) => {
        if (!formData.contactIds?.includes(contactId)) {
            setFormData(prev => ({ ...prev, contactIds: [...(prev.contactIds || []), contactId]}));
        }
    };
    const removeContactId = (contactId: number) => {
        setFormData(prev => ({ ...prev, contactIds: prev.contactIds?.filter(id => id !== contactId)}));
    };

    const addLog = () => {
        const newLog: LogEntry = { id: Date.now(), date: new Date().toISOString().split('T')[0], type: 'Message', summary: '' };
        setFormData(prev => ({ ...prev, communicationLog: [...(prev.communicationLog || []), newLog] }));
    };
    const updateLog = (index: number, field: keyof LogEntry, value: string) => {
        const updatedLogs = [...(formData.communicationLog || [])];
        updatedLogs[index] = { ...updatedLogs[index], [field]: value };
        setFormData(prev => ({ ...prev, communicationLog: updatedLogs }));
    };
    const removeLog = (id: number) => {
        setFormData(prev => ({ ...prev, communicationLog: prev.communicationLog?.filter(l => l.id !== id) }));
    };

    const StarRating = ({ rating, setRating }: { rating: number, setRating: (r: number) => void }) => (
        <div className="star-rating">{[1, 2, 3, 4, 5].map(star => (
            <span key={star} className={`star ${rating >= star ? 'filled' : ''}`} onClick={() => setRating(star)}>★</span>
        ))}</div>
    );

    return (
        <div className="modal-backdrop" onClick={onCancel}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <header className="modal-header">
                    <h2>{job.title} at {job.company}</h2>
                    <div className="modal-tabs">
                        {['Overview', 'Preparation', 'Contacts & Logs', 'Metadata'].map(tabName => (
                            <button key={tabName} onClick={() => setActiveTab(tabName)} className={activeTab === tabName ? 'active' : ''}>{tabName}</button>
                        ))}
                    </div>
                </header>
                <div className="modal-body" ref={modalBodyRef}>
                    {activeTab === 'Overview' && (
                        <div className="form-grid two-cols">
                            <div className="form-group"><label>Job Title</label><input name="title" value={formData.title} onChange={handleChange} /></div>
                            <div className="form-group"><label>Company</label><input name="company" value={formData.company} onChange={handleChange} /></div>
                            <div className="form-group"><label>Location</label><input name="location" value={formData.location} onChange={handleChange} /></div>
                            <div className="form-group"><label>Status</label><select name="status" value={formData.status} onChange={handleChange}>{jobStatuses.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                            <div className="form-group"><label>Source</label><input name="source" value={formData.source} onChange={handleChange} placeholder="e.g., LinkedIn, Indeed..." /></div>
                            <div className="form-group"><label>Application Date</label><input type="date" name="applicationDate" value={formData.applicationDate} onChange={handleChange} /></div>
                            <div className="form-group full-width"><label>Source URL</label><input name="sourceUrl" value={formData.sourceUrl} onChange={handleChange} placeholder="https://..." /></div>
                            <div className="form-group full-width"><label>Job Description</label><textarea name="description" value={formData.description} onChange={handleChange} rows={10}></textarea></div>
                            <div className="form-group full-width"><label>Your Personal Notes</label><textarea name="notes" value={formData.notes} onChange={handleChange} rows={5}></textarea></div>
                        </div>
                    )}
                    {activeTab === 'Preparation' && (
                         <div className="form-grid two-cols">
                            <div className="form-group"><label>Associated Resume</label><select name="selectedResumeId" value={formData.selectedResumeId || ''} onChange={(e) => setFormData(p => ({...p, selectedResumeId: parseInt(e.target.value)}))}><option value="">None</option>{resumes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
                            <div className="form-group"><label>Portfolio URL</label><input name="portfolioUrl" value={formData.portfolioUrl} onChange={handleChange} placeholder="https://..." /></div>
                            <div className="form-group full-width"><label>Salary Range (from posting)</label><input name="range" value={formData.salaryInfo?.range} onChange={(e) => handleNestedChange(e, 'salaryInfo', 'range')} /></div>
                            <div className="form-group full-width"><label>Your Salary Expectations</label><input name="expectations" value={formData.salaryInfo?.expectations} onChange={(e) => handleNestedChange(e, 'salaryInfo', 'expectations')} /></div>
                            <div className="form-group full-width"><label>Discussed/Offered Salary</label><input name="discussed" value={formData.salaryInfo?.discussed} onChange={(e) => handleNestedChange(e, 'salaryInfo', 'discussed')} /></div>
                            <div className="form-group full-width"><label>Questions for Interviewer</label><textarea name="questionsForInterviewer" value={formData.questionsForInterviewer} onChange={handleChange} rows={6}></textarea></div>
                            <div className="form-group full-width"><label>Cover Letter</label><textarea name="coverLetter" value={formData.coverLetter} onChange={handleChange} rows={12}></textarea></div>
                        </div>
                    )}
                    {activeTab === 'Contacts & Logs' && (
                        <div>
                             <div className="list-widget">
                                <h3>Contacts</h3>
                                <div className="contact-pills-container">
                                    {formData.contactIds?.map(id => {
                                        const contact = crmContacts.find(c => c.id === id);
                                        return contact ? (
                                            <div key={id} className="contact-pill">
                                                <span>{contact.name}</span>
                                                <button onClick={() => removeContactId(id)}>&times;</button>
                                            </div>
                                        ) : null;
                                    })}
                                </div>
                                <select onChange={e => addContactId(Number(e.target.value))} value="">
                                    <option value="" disabled>+ Add existing contact...</option>
                                    {crmContacts
                                        .filter(c => !formData.contactIds?.includes(c.id))
                                        .map(c => <option key={c.id} value={c.id}>{c.name} at {c.company}</option>)
                                    }
                                </select>
                                <p className="placeholder-text">Manage all contacts in the 'Network' tab.</p>
                            </div>
                             <div className="list-widget">
                                <h3>Communication Log <button onClick={addLog}>+ Add</button></h3>
                                 <div className="list-container">
                                {formData.communicationLog?.map((log, index) => (
                                     <div key={log.id} className="list-item-form log-item">
                                        <input type="date" value={log.date} onChange={e => updateLog(index, 'date', e.target.value)} />
                                        <select value={log.type} onChange={e => updateLog(index, 'type', e.target.value as LogEntry['type'])}>
                                            <option>Email</option><option>Call</option><option>Message</option><option>Meeting</option>
                                        </select>
                                        <textarea placeholder="Summary of communication..." value={log.summary} onChange={e => updateLog(index, 'summary', e.target.value)} rows={2}></textarea>
                                        <button className="delete-item-btn" onClick={() => removeLog(log.id)}>&times;</button>
                                    </div>
                                ))}
                                {(!formData.communicationLog || formData.communicationLog.length === 0) && <p className="placeholder-text">No communication logs added yet.</p>}
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'Metadata' && (
                        <div className="form-grid two-cols">
                            <div className="form-group"><label>Priority</label><select name="priority" value={formData.priority} onChange={handleChange}><option>Low</option><option>Medium</option><option>High</option></select></div>
                            <div className="form-group"><label>Your Interest</label><StarRating rating={formData.interestLevel || 0} setRating={(r) => setFormData(p => ({...p, interestLevel: r}))} /></div>
                            <div className="form-group full-width"><label>Next Step</label><input name="nextStep" value={formData.nextStep} onChange={handleChange} /></div>
                            <div className="form-group full-width"><label>Next Step Date</label><input type="date" name="nextStepDate" value={formData.nextStepDate} onChange={handleChange} /></div>
                            <div className="form-group full-width"><label>Tags</label>
                                <div className="tag-input-container">
                                    {formData.tags?.map(tag => (<div key={tag} className="tag-pill">{tag} <button onClick={() => removeTag(tag)}>&times;</button></div>))}
                                    <input value={tagInput} onChange={handleTagInputChange} onKeyDown={handleTagInputKeyDown} placeholder="Add a tag and press Enter..." />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <div className="modal-actions">
                    <button onClick={handleDelete} className="button-delete-secondary" style={{ marginRight: 'auto' }}>Delete</button>
                    <button onClick={onCancel} className="button-secondary">Cancel</button>
                    <button onClick={handleGenerateLetter} className="button-generate" disabled={isGenerating}>
                        {isGenerating ? 'Generating...' : 'Generate Letter'}
                    </button>
                    <button onClick={handleSave}>Save Changes</button>
                </div>
            </div>
        </div>
    );
};


const Navigation = ({ activeTab, setActiveTab, theme, toggleTheme }: { activeTab: Tab, setActiveTab: (tab: Tab) => void, theme: string, toggleTheme: () => void }) => {
    const navItems: { id: Tab, label: string, icon: React.ReactNode }[] = [
        { id: 'Dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
        { id: 'Job Tracker', label: 'Job Tracker', icon: <ClipboardIcon /> },
        { id: 'Calendar', label: 'Calendar', icon: <CalendarIcon /> },
        { id: 'Resumes', label: 'Resumes', icon: <ResumesIcon /> },
        { id: 'Network', label: 'Network', icon: <ContactsIcon /> },
        { id: 'AI Tools', label: 'AI Tools', icon: <SparkleIcon /> },
        { id: 'Analytics', label: 'Analytics', icon: <AnalyticsIcon /> },
        { id: 'Preferences', label: 'Preferences', icon: <SettingsIcon /> },
    ];

    return (
        <nav className="sidebar">
            <div>
                <div className="sidebar-header">
                    <h1>Pathfinder</h1>
                </div>
                <ul className="nav-list">
                    {navItems.map(item => (
                        <li key={item.id}>
                            <a
                                href="#"
                                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                                onClick={(e) => { e.preventDefault(); setActiveTab(item.id); }}
                                aria-current={activeTab === item.id ? 'page' : undefined}
                            >
                                {item.icon}
                                <span>{item.label}</span>
                            </a>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="sidebar-footer">
                <button onClick={toggleTheme} className="theme-toggle" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
                    {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
                    <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                </button>
            </div>
        </nav>
    );
};

const DashboardView = ({ jobs, settings, setSettings, onJobDoubleClick }: { jobs: Job[], settings: Settings, setSettings: (settings: Settings) => void, onJobDoubleClick: (job: Job) => void }) => {
    // State for AI Skill Analysis
    const [analysisJobId, setAnalysisJobId] = useState<number | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState('');
    // State for AI Next Actions
    const [nextActions, setNextActions] = useState<{ suggestion_text: string; action_type: string; job_id?: number; }[]>([]);
    const [isLoadingActions, setIsLoadingActions] = useState(false);

    // Data for Widgets
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentApplications = jobs.filter(j => j.applicationDate && new Date(j.applicationDate).getTime() >= oneWeekAgo).length;
    const goalProgress = settings.profile.weeklyGoal > 0 ? (recentApplications / settings.profile.weeklyGoal) * 100 : 0;

    useEffect(() => {
        // Pre-select the first job with a description for analysis
        const firstJobWithDesc = jobs.find(j => j.description);
        if (firstJobWithDesc) {
            setAnalysisJobId(firstJobWithDesc.id);
        }
        handleGenerateNextActions();
    }, [jobs]);


    const handleGenerateNextActions = async () => {
        setIsLoadingActions(true);
        setNextActions([]);

        const jobsSummary = jobs.map(j => `- (ID: ${j.id}) ${j.title} at ${j.company} (Status: ${j.status}, Applied: ${j.applicationDate || 'N/A'}, Next Step Date: ${j.nextStepDate || 'N/A'})`).join('\n');
        
        const prompt = `You are an expert career coach AI. Analyze the user's current job pipeline and suggest 3-5 concrete, actionable next steps. Your goal is to keep the user motivated and on track.
    
    RULES:
    - Base your suggestions *only* on the provided data.
    - Prioritize actions based on urgency (e.g., upcoming interviews) and opportunity (e.g., old applications needing follow-up).
    - If a suggestion relates to a specific job, you MUST include its 'job_id'.
    - Your entire response MUST be a valid JSON array matching the provided schema.
    
    USER'S DATA:
    - Weekly Application Goal: ${settings.profile.weeklyGoal}
    - Applications This Week: ${recentApplications}
    - Job Pipeline:
    ${jobsSummary || 'No jobs yet.'}
    
    ---
    Based on this, provide the next actions.`;

        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                suggestion_text: {
                                    type: Type.STRING,
                                    description: 'The suggested action for the user.'
                                },
                                action_type: {
                                    type: Type.STRING,
                                    description: 'The type of action. Must be one of: PREPARE, FOLLOW_UP, APPLY, REVIEW, GOAL.'
                                },
                                job_id: {
                                    type: Type.NUMBER,
                                    description: 'The ID of the job this action relates to. Omit if not applicable.'
                                },
                            },
                            required: ['suggestion_text', 'action_type']
                        }
                    }
                }
            });
            
            const parsedActions = JSON.parse(response.text);
            setNextActions(parsedActions);

        } catch (error) {
            console.error("Failed to generate next actions:", error);
            setNextActions([{ suggestion_text: "Could not generate suggestions. Try refreshing.", action_type: 'ERROR' }]);
        } finally {
            setIsLoadingActions(false);
        }
    };

    const handleAnalyzeSkills = async () => {
        const jobToAnalyze = jobs.find(j => j.id === analysisJobId);
        if (!jobToAnalyze || !jobToAnalyze.description || !settings.profile.masterSkills) {
            setAnalysisResult("Please select a job with a description and ensure your skills are listed in Settings.");
            return;
        }
        setIsAnalyzing(true);
        setAnalysisResult('');
        const prompt = `Analyze the following job description and identify key skills, technologies, or qualifications that are mentioned in the description but are MISSING from the provided user's skill list. Present the missing items as a simple, unnumbered list, with each item on a new line (e.g., using '- ' or '• '). If there are no significant missing skills, respond with "Your skills are a great match for this role!".

---
**USER'S SKILLS:**
${settings.profile.masterSkills}
---
**JOB DESCRIPTION:**
${jobToAnalyze.description}
---

**MISSING SKILLS:**`;

        try {
            const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt });
            setAnalysisResult(response.text);
        } catch (error) {
            console.error("Skill analysis failed:", error);
            setAnalysisResult("Error: Could not perform analysis. Please try again.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const upcomingDeadlines = jobs
        .filter(j => j.nextStepDate && new Date(j.nextStepDate) >= new Date())
        .sort((a, b) => new Date(a.nextStepDate!).getTime() - new Date(b.nextStepDate!).getTime())
        .slice(0, 3);
    
    const recentJobs = [...jobs].sort((a,b) => b.dateAdded - a.dateAdded).slice(0,5);

    const getActionIcon = (type: string) => {
        switch (type) {
            case 'PREPARE': return <ClipboardCheckIcon />;
            case 'FOLLOW_UP': return <MailIcon />;
            case 'APPLY': return <SendIcon />;
            case 'REVIEW':
            case 'GOAL':
            default: return <DashboardIcon />;
        }
    };


    return (
        <div className="dashboard-view">
            <h2>Dashboard</h2>
            <div className="stats-grid">
                <div className="stat-card"><h3>Total Jobs</h3><p>{jobs.length}</p></div>
                <div className="stat-card"><h3>Applied</h3><p>{jobs.filter(j=>j.status === 'Applied').length}</p></div>
                <div className="stat-card"><h3>Interviewing</h3><p>{jobs.filter(j=>['Interviewing', 'Test Task'].includes(j.status)).length}</p></div>
                <div className="stat-card"><h3>Offers</h3><p>{jobs.filter(j=>j.status === 'Offer').length}</p></div>
                <div className="stat-card rejection-card"><h3>Rejections</h3><p>{jobs.filter(j=>j.status === 'Rejection').length}</p></div>
            </div>

            <div className="dashboard-main-grid">
                <div className="widget goal-widget">
                    <h3>Weekly Application Goal</h3>
                    <div className="goal-progress">
                        <div className="progress-bar">
                            <div className="progress-bar-fill" style={{ width: `${goalProgress}%` }}></div>
                        </div>
                        <div className="goal-text">
                            <span className="current">{recentApplications}</span> / <span className="total">{settings.profile.weeklyGoal}</span> Applied
                        </div>
                    </div>
                     <div className="goal-controls">
                        <label>Set Goal:</label>
                        <input 
                            type="number" 
                            value={settings.profile.weeklyGoal} 
                            onChange={(e) => setSettings({...settings, profile: {...settings.profile, weeklyGoal: parseInt(e.target.value, 10) || 0}})}
                        />
                    </div>
                </div>

                <div className="widget skill-analysis-widget">
                    <h3>AI Skill Gap Analysis</h3>
                    <div className="skill-analysis-controls">
                        <select
                            value={analysisJobId ?? ''}
                            onChange={e => setAnalysisJobId(Number(e.target.value))}
                            disabled={jobs.length === 0}
                            aria-label="Select job for skill analysis"
                        >
                            <option value="" disabled>Select a job</option>
                            {jobs.filter(j => j.description).map(job => (
                                <option key={job.id} value={job.id}>{job.title} at {job.company}</option>
                            ))}
                        </select>
                        <button onClick={handleAnalyzeSkills} disabled={isAnalyzing || !analysisJobId}>
                             {isAnalyzing ? <div className="spinner-small"></div> : 'Analyze'}
                        </button>
                    </div>
                    <div className="analysis-results">
                        {isAnalyzing && <p className="placeholder-text">AI is analyzing...</p>}
                        {analysisResult && <pre className="generated-text">{analysisResult}</pre>}
                        {!isAnalyzing && !analysisResult && <p className="placeholder-text">Select a job and click Analyze to see missing skills.</p>}
                    </div>
                </div>

                <div className="widget upcoming-widget">
                    <h3>Upcoming Deadlines</h3>
                    <ul>
                        {upcomingDeadlines.length > 0 ? (
                            upcomingDeadlines.map(job => (
                                <li key={job.id} onClick={() => onJobDoubleClick(job)}>
                                    <span className="deadline-date">{job.nextStepDate}</span>
                                    <span className="deadline-details">
                                        <strong>{job.nextStep}</strong> for {job.company}
                                    </span>
                                </li>
                            ))
                        ) : (
                            <p className="placeholder-text">No upcoming deadlines.</p>
                        )}
                    </ul>
                </div>

                 <div className="widget recent-activity-widget">
                    <h3>Recent Activity</h3>
                    <ul>
                       {recentJobs.length > 0 ? (
                            recentJobs.map(job => (
                                <li key={job.id} onClick={() => onJobDoubleClick(job)}>
                                    <span className={`status-dot status-dot--${job.status.replace(' ','-')}`}></span>
                                    <span className="activity-details">
                                        <strong>{job.title}</strong> at {job.company}
                                    </span>
                                    <span className="activity-date">
                                        {new Date(job.dateAdded).toLocaleDateString()}
                                    </span>
                                </li>
                            ))
                       ) : (
                           <p className="placeholder-text">No jobs added yet.</p>
                       )}
                    </ul>
                </div>
                 <div className="widget next-actions-widget">
                    <h3>
                        <span>AI-Powered Next Actions</span>
                        <button onClick={handleGenerateNextActions} disabled={isLoadingActions}>
                            <RefreshCwIcon className={isLoadingActions ? 'spinning' : ''} />
                        </button>
                    </h3>
                    <ul>
                        {isLoadingActions && <p className="placeholder-text">Generating suggestions...</p>}
                        {!isLoadingActions && nextActions.length === 0 && <p className="placeholder-text">No suggestions right now. Add more jobs!</p>}
                        {nextActions.map((action, index) => {
                            const relatedJob = action.job_id ? jobs.find(j => j.id === action.job_id) : null;
                            return (
                                <li key={index} className="action-item">
                                    <div className="action-icon">{getActionIcon(action.action_type)}</div>
                                    <div className="action-text">
                                        <p>{action.suggestion_text}</p>
                                        {relatedJob && (
                                            <a className="action-job-link" onClick={() => onJobDoubleClick(relatedJob)}>
                                                View "{relatedJob.title}"
                                            </a>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>
        </div>
    );
};

const JobsView = ({ jobs, onAddJob, onUpdateJob, onJobDoubleClick }: { jobs: Job[], onAddJob: (job: Omit<Job, 'id'>) => void, onUpdateJob: (job: Job) => void, onJobDoubleClick: (job: Job) => void }) => {
    const [newJobTitle, setNewJobTitle] = useState('');
    const [newJobCompany, setNewJobCompany] = useState('');
    const [draggingOver, setDraggingOver] = useState<Job['status'] | null>(null);
    
    const handleAddJob = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newJobTitle || !newJobCompany) return;
        const newJob: Omit<Job, 'id'> = {
            title: newJobTitle,
            company: newJobCompany,
            status: 'Wishlist',
            description: '',
            notes: '',
            coverLetter: '',
            dateAdded: Date.now(),
            location: '',
            sourceUrl: '',
            source: 'Other',
            applicationDate: '',
            portfolioUrl: '',
            contactIds: [],
            communicationLog: [],
            questionsForInterviewer: '',
            salaryInfo: { range: '', expectations: '', discussed: '' },
            priority: 'Medium',
            interestLevel: 0,
            tags: [],
            nextStep: '',
            nextStepDate: '',
        };
        onAddJob(newJob);
        setNewJobTitle('');
        setNewJobCompany('');
    };

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, jobId: number) => {
        e.dataTransfer.setData('text/plain', jobId.toString());
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const handleDragEnter = (status: Job['status']) => {
        setDraggingOver(status);
    };
    
    const handleDragLeave = () => {
        setDraggingOver(null);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, newStatus: Job['status']) => {
        e.preventDefault();
        const jobIdStr = e.dataTransfer.getData('text/plain');
        if (!jobIdStr) return;
        const jobId = parseInt(jobIdStr, 10);
        const jobToUpdate = jobs.find(j => j.id === jobId);
        if (jobToUpdate && jobToUpdate.status !== newStatus) {
            onUpdateJob({ ...jobToUpdate, status: newStatus });
        }
        setDraggingOver(null);
    };

    return (
        <div className="jobs-view">
            <header className="view-header">
                <h2>Job Tracker</h2>
                 <form className="add-job-form" onSubmit={handleAddJob}>
                    <input type="text" placeholder="Job Title" value={newJobTitle} onChange={(e) => setNewJobTitle(e.target.value)} aria-label="New Job Title"/>
                    <input type="text" placeholder="Company" value={newJobCompany} onChange={(e) => setNewJobCompany(e.target.value)} aria-label="New Job Company"/>
                    <button type="submit">Add Job</button>
                </form>
            </header>
            <div className="kanban-board">
                {jobStatuses.map(status => (
                    <div
                        key={status}
                        className={`kanban-column ${draggingOver === status ? 'drag-over' : ''}`}
                        onDragOver={handleDragOver}
                        onDragEnter={() => handleDragEnter(status)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, status)}
                    >
                        <div className="kanban-column-header">{status}</div>
                        <div className="kanban-column-content">
                            {jobs.filter(job => job.status === status).map(job => (
                                <div
                                    key={job.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, job.id)}
                                    onDoubleClick={() => onJobDoubleClick(job)}
                                >
                                    <JobCard job={job} />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const eventTypes: CalendarEventType[] = ['Interview', 'Deadline', 'Task', 'Networking', 'Personal'];

const EventModal = ({ event, date, jobs, crmContacts, onSave, onCancel, onDelete }: {
    event: CalendarEvent | null,
    date: string | null,
    jobs: Job[],
    crmContacts: CrmContact[],
    onSave: (event: CalendarEvent) => void,
    onCancel: () => void,
    onDelete: (eventId: number) => void
}) => {
    const [formData, setFormData] = useState<Omit<CalendarEvent, 'id'>>({
        title: '',
        date: date || new Date().toISOString().split('T')[0],
        type: 'Task',
        time: '',
        notes: '',
        jobId: undefined,
        contactId: undefined,
    });
    const currentEventId = useRef<number | null>(event ? event.id : null);

    useEffect(() => {
        if (event) {
            setFormData({
                title: event.title,
                date: event.date,
                type: event.type,
                time: event.time || '',
                notes: event.notes || '',
                jobId: event.jobId,
                contactId: event.contactId
            });
            currentEventId.current = event.id;
        } else if (date) {
            setFormData({
                title: '',
                date: date,
                type: 'Task',
                time: '',
                notes: '',
                jobId: undefined,
                contactId: undefined,
            });
            currentEventId.current = null;
        }
    }, [event, date]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'jobId' || name === 'contactId') {
            setFormData(prev => ({...prev, [name]: value ? parseInt(value) : undefined}));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };
    
    const handleSave = () => {
        if (!formData.title) {
            alert("Title is required.");
            return;
        }
        const eventToSave: CalendarEvent = { 
            id: currentEventId.current || Date.now(), 
            ...formData 
        };
        onSave(eventToSave);
    };

    const handleDelete = () => {
        if (currentEventId.current) {
            onDelete(currentEventId.current);
        }
    }

    return (
        <div className="modal-backdrop" onClick={onCancel}>
            <div className="modal-content event-modal" onClick={e => e.stopPropagation()}>
                <header className="modal-header">
                    <h2>{event ? 'Edit Event' : 'Add Event'}</h2>
                </header>
                <div className="modal-body">
                    <div className="form-grid two-cols">
                        <div className="form-group full-width">
                            <label>Title</label>
                            <input name="title" value={formData.title} onChange={handleChange} placeholder="e.g., Interview with TechCorp" />
                        </div>
                        <div className="form-group">
                            <label>Date</label>
                            <input type="date" name="date" value={formData.date} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Time (Optional)</label>
                            <input type="time" name="time" value={formData.time} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Type</label>
                            <select name="type" value={formData.type} onChange={handleChange}>
                                {eventTypes.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                             <label>Link to Contact (Optional)</label>
                            <select name="contactId" value={formData.contactId || ''} onChange={handleChange}>
                                <option value="">None</option>
                                {crmContacts.map(c => <option key={c.id} value={c.id}>{c.name} at {c.company}</option>)}
                            </select>
                        </div>
                         <div className="form-group">
                            <label>Link to Job (Optional)</label>
                            <select name="jobId" value={formData.jobId || ''} onChange={handleChange}>
                                <option value="">None</option>
                                {jobs.map(j => <option key={j.id} value={j.id}>{j.title} at {j.company}</option>)}
                            </select>
                        </div>
                         <div className="form-group full-width">
                            <label>Notes</label>
                            <textarea name="notes" value={formData.notes} onChange={handleChange} rows={5}></textarea>
                        </div>
                    </div>
                </div>
                 <div className="modal-actions">
                    {event && <button onClick={handleDelete} className="button-delete-secondary" style={{ marginRight: 'auto' }}>Delete Event</button>}
                    <button onClick={onCancel} className="button-secondary">Cancel</button>
                    <button onClick={handleSave}>Save Event</button>
                </div>
            </div>
        </div>
    );
};

const CalendarView = ({ jobs, crmContacts, calendarEvents, onJobClick, onDayClick, onEventClick }: {
    jobs: Job[],
    crmContacts: CrmContact[],
    calendarEvents: CalendarEvent[],
    onJobClick: (job: Job) => void,
    onDayClick: (date: string) => void,
    onEventClick: (event: CalendarEvent) => void
}) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDate = new Date(startOfMonth);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    const endDate = new Date(endOfMonth);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

    const days = [];
    let day = new Date(startDate);

    while (day <= endDate) {
        days.push(new Date(day));
        day.setDate(day.getDate() + 1);
    }

    const eventsByDate: { [key: string]: ({ type: 'job-application' | 'job-nextStep' | 'custom', data: Job | CalendarEvent })[] } = {};
    jobs.forEach(job => {
        if (job.applicationDate) {
            const dateStr = job.applicationDate;
            if (!eventsByDate[dateStr]) eventsByDate[dateStr] = [];
            eventsByDate[dateStr].push({ type: 'job-application', data: job });
        }
        if (job.nextStepDate) {
            const dateStr = job.nextStepDate;
            if (!eventsByDate[dateStr]) eventsByDate[dateStr] = [];
            eventsByDate[dateStr].push({ type: 'job-nextStep', data: job });
        }
    });
    calendarEvents.forEach(event => {
        const dateStr = event.date;
        if (!eventsByDate[dateStr]) eventsByDate[dateStr] = [];
        eventsByDate[dateStr].push({ type: 'custom', data: event });
    });

    Object.keys(eventsByDate).forEach(date => {
        eventsByDate[date].sort((a, b) => {
            const timeA = a.type === 'custom' ? (a.data as CalendarEvent).time : undefined;
            const timeB = b.type === 'custom' ? (b.data as CalendarEvent).time : undefined;
            if (timeA && timeB) return timeA.localeCompare(timeB);
            if (timeA) return -1;
            if (timeB) return 1;
            return 0;
        });
    });

    const changeMonth = (offset: number) => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    };

    return (
        <div className="calendar-view">
            <header className="calendar-header">
                <button onClick={() => changeMonth(-1)}>&lt;</button>
                <h2>{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
                <button onClick={() => changeMonth(1)}>&gt;</button>
            </header>
            <div className="calendar-grid">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="calendar-day-header">{d}</div>)}
                {days.map((d, i) => {
                    const dateStr = d.toISOString().split('T')[0];
                    const events = eventsByDate[dateStr] || [];
                    return (
                        <div key={i} className={`calendar-day ${d.getMonth() !== currentDate.getMonth() ? 'other-month' : ''} ${isToday(d) ? 'today' : ''}`} onClick={() => onDayClick(dateStr)}>
                            <div className="day-number">{d.getDate()}</div>
                            <div className="day-events">
                                {events.map(({ type, data }, index) => {
                                    if (type.startsWith('job')) {
                                        const job = data as Job;
                                        const eventType = type === 'job-application' ? 'application' : 'nextStep';
                                        const eventText = type === 'job-application' 
                                            ? `Apply: ${job.company}` 
                                            : `${job.nextStep || 'Next Step'}: ${job.company}`;
                                        return (
                                            <div key={`${job.id}-${type}-${index}`} className={`calendar-event job ${eventType}`} onClick={(e) => { e.stopPropagation(); onJobClick(job); }}>
                                                {eventText}
                                            </div>
                                        );
                                    } else { // 'custom'
                                        const event = data as CalendarEvent;
                                        const contact = event.contactId ? crmContacts.find(c => c.id === event.contactId) : null;
                                        return (
                                            <div key={event.id} className={`calendar-event custom ${event.type.toLowerCase()}`} onClick={(e) => { e.stopPropagation(); onEventClick(event); }}>
                                                {event.time && <span className="event-time">{event.time}</span>}
                                                <span className="event-title">{event.title}</span>
                                                {contact && <span className="event-contact-name">{contact.name}</span>}
                                            </div>
                                        );
                                    }
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};


const ContactEditor = ({ contact, jobs, onUpdate, onJobClick }: { contact: CrmContact, jobs: Job[], onUpdate: (updatedContact: CrmContact) => void, onJobClick: (job: Job) => void }) => {
    const [formData, setFormData] = useState<CrmContact>(contact);
    const [tagInput, setTagInput] = useState('');
    const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

    // Update local state when the selected contact (prop) changes, without triggering a save.
    useEffect(() => {
        setFormData(contact);
    }, [contact]);

    // Cleanup the debounce timer on unmount.
    useEffect(() => {
        return () => {
            if (debounceTimeout.current) {
                clearTimeout(debounceTimeout.current);
            }
        };
    }, []);

    // Central function to handle debounced updates on user input.
    const handleDebouncedUpdate = (updatedData: CrmContact) => {
        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }
        debounceTimeout.current = setTimeout(() => {
            onUpdate(updatedData);
        }, 500); // 500ms debounce
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const newFormData = { ...formData, [name]: value };
        setFormData(newFormData);
        handleDebouncedUpdate(newFormData);
    };

    const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setTagInput(e.target.value);
    
    const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const newTag = tagInput.trim();
            if (newTag && !formData.tags?.includes(newTag)) {
                const newFormData = { ...formData, tags: [...(formData.tags || []), newTag] };
                setFormData(newFormData);
                handleDebouncedUpdate(newFormData);
            }
            setTagInput('');
        }
    };
    
    const removeTag = (tagToRemove: string) => {
        const newFormData = { ...formData, tags: formData.tags?.filter(tag => tag !== tagToRemove) };
        setFormData(newFormData);
        handleDebouncedUpdate(newFormData);
    };

    const linkedJobs = jobs.filter(job => job.contactIds?.includes(contact.id));

    return (
        <div className="contact-editor-content">
            <input name="name" value={formData.name} onChange={handleChange} className="contact-name-input" placeholder="Contact Name" />
            <div className="form-grid two-cols">
                <div className="form-group"><label>Role / Title</label><input name="role" value={formData.role} onChange={handleChange} /></div>
                <div className="form-group"><label>Company</label><input name="company" value={formData.company} onChange={handleChange} /></div>
                <div className="form-group"><label>Email</label><input name="email" type="email" value={formData.email} onChange={handleChange} /></div>
                <div className="form-group"><label>Phone</label><input name="phone" type="tel" value={formData.phone} onChange={handleChange} /></div>
                <div className="form-group full-width"><label>LinkedIn Profile URL</label><input name="linkedinUrl" value={formData.linkedinUrl} onChange={handleChange} /></div>
                <div className="form-group full-width"><label>Source of Contact</label><input name="source" value={formData.source} onChange={handleChange} placeholder="e.g., LinkedIn, Conference, Referral" /></div>
                <div className="form-group full-width"><label>Tags</label>
                    <div className="tag-input-container">
                        {formData.tags?.map(tag => (<div key={tag} className="tag-pill">{tag} <button onClick={() => removeTag(tag)}>&times;</button></div>))}
                        <input value={tagInput} onChange={handleTagInputChange} onKeyDown={handleTagInputKeyDown} placeholder="Add a tag..." />
                    </div>
                </div>
                <div className="form-group full-width"><label>Notes</label><textarea name="notes" value={formData.notes} onChange={handleChange} rows={6}></textarea></div>
            </div>
            <div className="widget linked-jobs-widget">
                <h3>Linked Jobs</h3>
                <ul>
                    {linkedJobs.length > 0 ? (
                        linkedJobs.map(job => (
                            <li key={job.id} onClick={() => onJobClick(job)}>
                                <span className={`status-dot status-dot--${job.status.replace(' ', '-')}`}></span>
                                <span className="activity-details"><strong>{job.title}</strong> at {job.company}</span>
                                <span className="activity-date">{job.status}</span>
                            </li>
                        ))
                    ) : (
                        <p className="placeholder-text">This contact is not yet linked to any job.</p>
                    )}
                </ul>
            </div>
        </div>
    );
};

const ContactsView = ({ crmContacts, onAddContact, onDeleteContact, onUpdateContact, jobs, onJobClick }: { crmContacts: CrmContact[], onAddContact: (contact: Omit<CrmContact, 'id'>) => void, onDeleteContact: (contactId: number) => void, onUpdateContact: (contact: CrmContact) => void, jobs: Job[], onJobClick: (job: Job) => void }) => {
    const [selectedContactId, setSelectedContactId] = useState<number | null>(crmContacts.length > 0 ? crmContacts[0].id : null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!selectedContactId && crmContacts.length > 0) {
            setSelectedContactId(crmContacts[0].id);
        } else if (crmContacts.length === 0) {
            setSelectedContactId(null);
        }
    }, [crmContacts, selectedContactId]);

    const handleNewContact = () => {
        const newContact: Omit<CrmContact, 'id'> = {
            name: 'New Contact',
            role: '',
            company: '',
            email: '',
            phone: '',
            linkedinUrl: '',
            source: '',
            notes: '',
            dateAdded: Date.now(),
            tags: [],
            lastInteraction: Date.now(),
        };
        onAddContact(newContact);
    };

    const handleDeleteContact = () => {
        if (!selectedContactId) return;
        if (window.confirm('Are you sure you want to delete this contact? This will also remove them from any linked jobs.')) {
            onDeleteContact(selectedContactId);
        }
    };

    const filteredContacts = crmContacts.filter(contact =>
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.role.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a,b) => b.lastInteraction - a.lastInteraction);
    
    const selectedContact = crmContacts.find(c => c.id === selectedContactId);

    return (
        <div className="contacts-view-layout">
            <div className="contact-list-panel">
                <div className="contact-list-header">
                    <h3>All Contacts</h3>
                    <button onClick={handleNewContact}>+ New</button>
                </div>
                <div className="contact-search-bar">
                     <AnalyticsIcon />
                     <input 
                        type="text" 
                        placeholder="Search contacts..." 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <ul className="contact-list">
                    {filteredContacts.map(contact => (
                        <li key={contact.id} className={`contact-list-item ${contact.id === selectedContactId ? 'active' : ''}`} onClick={() => setSelectedContactId(contact.id)}>
                           <div className="contact-list-item-main">
                             <div className="contact-name">{contact.name}</div>
                             <div className="contact-role">{contact.role} at {contact.company}</div>
                           </div>
                        </li>
                    ))}
                     {filteredContacts.length === 0 && <p className="placeholder-text">No contacts found.</p>}
                </ul>
                <div className="contact-list-actions">
                    <button onClick={handleDeleteContact} disabled={!selectedContactId} className="button-delete-secondary">Delete Contact</button>
                </div>
            </div>
            <div className="contact-detail-panel">
                 {selectedContact ? (
                    <ContactEditor
                        contact={selectedContact}
                        jobs={jobs}
                        onUpdate={(updatedContact) => {
                           onUpdateContact({...updatedContact, lastInteraction: Date.now()});
                        }}
                        onJobClick={onJobClick}
                    />
                ) : (
                    <div className="placeholder-container">
                        <ContactsIcon />
                        <h3>Your Contact Hub</h3>
                        <p className="placeholder-text">Create a new contact or select one to view their details.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- AI Tools View ---

const GeneralAssistantTool = ({ messages, isLoading, onSendMessage, isAgentMixMode, setIsAgentMixMode }: { messages: Message[], isLoading: boolean, onSendMessage: (input: string, file?: File) => Promise<void>, isAgentMixMode: boolean, setIsAgentMixMode: React.Dispatch<React.SetStateAction<boolean>> }) => {
    const [userInput, setUserInput] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    useEffect(scrollToBottom, [messages, isLoading]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
        }
    };
    
    const localHandleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!userInput.trim() && !selectedFile || isLoading) return;

        const textToSend = userInput;
        const fileToSend = selectedFile;
        
        setUserInput('');
        setSelectedFile(null);
        if(fileInputRef.current) fileInputRef.current.value = "";
        
        await onSendMessage(textToSend, fileToSend ?? undefined);
    };

    const renderMessageText = (msg: Message) => (
        <>
            {msg.text.split(/(\*\*.*?\*\*|\*.*?\*)/g).map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    const agentMatch = part.match(/^\*\*([\w\s]+ Agent:)\*\*/);
                    if (agentMatch) {
                        return <strong key={i}>{agentMatch[1]}</strong>;
                    }
                    return <strong key={i}>{part.slice(2, -2)}</strong>;
                }
                if (part.startsWith('*') && part.endsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>;
                return part;
            })}
            {msg.fileName && (
                <div className="message-file-attachment">
                    <PaperclipIcon />
                    <span>{msg.fileName}</span>
                </div>
            )}
        </>
    );

    return (
        <div className="general-assistant-tool">
             <div className="general-assistant-header">
                <h3>General Assistant</h3>
                <div className="toggle-container">
                    <span>Mix Agents</span>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={isAgentMixMode}
                            onChange={() => setIsAgentMixMode(!isAgentMixMode)}
                        />
                        <span className="slider"></span>
                    </label>
                </div>
             </div>
            <div className="chat-messages">
                {messages.map((msg, index) => (
                    <div key={index} className={`message ${msg.sender}-message`}>{renderMessageText(msg)}</div>
                ))}
                {isLoading && (
                    <div className="loading-indicator">
                        <div className="spinner"></div><span>AI is thinking...</span>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <div className="chat-input-area">
                {selectedFile && (
                    <div className="file-attachment-preview">
                        <PaperclipIcon />
                        <span>{selectedFile.name}</span>
                        <button onClick={() => {
                            setSelectedFile(null);
                            if(fileInputRef.current) fileInputRef.current.value = "";
                        }}>&times;</button>
                    </div>
                )}
                <form className="chat-input" onSubmit={localHandleSendMessage}>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                        aria-hidden="true"
                    />
                    <button type="button" className="attachment-button" onClick={() => fileInputRef.current?.click()} aria-label="Attach file">
                        <PaperclipIcon />
                    </button>
                    <textarea
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder={selectedFile ? "Describe what to do with the file..." : "Ask for interview prep for TechCorp..."}
                        aria-label="Chat input"
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); localHandleSendMessage(); } }}
                    />
                    <button type="submit" disabled={isLoading || (!userInput.trim() && !selectedFile)}>Send</button>
                </form>
            </div>
        </div>
    );
};

interface TranscriptMessage {
    id: number;
    speaker: 'user' | 'ai' | 'system';
    text: string;
}

const VoiceInterviewTool = ({ jobs, resumes, settings }: { jobs: Job[], resumes: Resume[], settings: Settings }) => {
    const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
    const [selectedResumeId, setSelectedResumeId] = useState<number | null>(null);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
    
    const [isInterviewing, setIsInterviewing] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
    const [error, setError] = useState<string | null>(null);
    
    const chatSession = useRef<Chat | null>(null);
    const recognition = useRef<any>(null); // SpeechRecognition instance
    const transcriptEndRef = useRef<HTMLDivElement>(null);
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    useEffect(() => {
        // Pre-select job/resume
        const firstJobWithDesc = jobs.find(j => j.description);
        if (firstJobWithDesc) setSelectedJobId(firstJobWithDesc.id);
        else if (jobs.length > 0) setSelectedJobId(jobs[0].id);
        if (resumes.length > 0) setSelectedResumeId(resumes[0].id);

        if (!SpeechRecognition) {
            setError("Speech recognition is not supported in this browser. Please try Chrome or Edge.");
            return;
        }

        // --- Voice Synthesis Setup ---
        const handleVoicesChanged = () => {
            const availableVoices = window.speechSynthesis.getVoices();
            const englishVoices = availableVoices.filter(v => v.lang.startsWith('en'));
            setVoices(englishVoices);

            // Auto-select a high-quality voice
            if (englishVoices.length > 0) {
                const googleVoice = englishVoices.find(v => v.name.includes('Google'));
                const microsoftVoice = englishVoices.find(v => v.name.includes('David') || v.name.includes('Zira'));
                const appleVoice = englishVoices.find(v => v.name.includes('Siri') || v.name.includes('Alex'));
                
                if (googleVoice) setSelectedVoiceURI(googleVoice.voiceURI);
                else if (microsoftVoice) setSelectedVoiceURI(microsoftVoice.voiceURI);
                else if (appleVoice) setSelectedVoiceURI(appleVoice.voiceURI);
                else setSelectedVoiceURI(englishVoices[0].voiceURI);
            }
        };
        window.speechSynthesis.onvoiceschanged = handleVoicesChanged;
        handleVoicesChanged(); // Initial call

        // --- Speech Recognition Setup ---
        recognition.current = new SpeechRecognition();
        recognition.current.continuous = false;
        recognition.current.interimResults = false;
        recognition.current.lang = 'en-US';

        recognition.current.onresult = (event: any) => {
            const userResponse = event.results[event.results.length - 1][0].transcript;
            addMessage('user', userResponse);
            sendToAI(userResponse);
        };
        recognition.current.onstart = () => setIsListening(true);
        recognition.current.onend = () => setIsListening(false);
        recognition.current.onerror = (event: any) => {
             console.error('Speech recognition error:', event.error);
             let errorMessage = `An unknown error occurred during speech recognition: ${event.error}. Please try again.`;
             switch (event.error) {
                case 'network':
                    errorMessage = 'A network error occurred. Speech recognition requires an active internet connection. Please check your connection and try again.';
                    break;
                case 'no-speech':
                    errorMessage = "I didn't hear anything. Please ensure your microphone is working and speak clearly. Tap the mic to try again.";
                    break;
                case 'not-allowed':
                case 'service-not-allowed':
                    errorMessage = 'Permission to use the microphone was denied. Please allow microphone access for this site in your browser settings to continue.';
                    setIsInterviewing(false); // This is a fatal error for the tool
                    break;
                case 'aborted':
                    console.log('Speech recognition was aborted.');
                    setIsListening(false);
                    return; // Don't show a user-facing error for this.
             }
             addMessage('system', errorMessage);
             setIsListening(false);
        };
        
        return () => { // Cleanup
            if (recognition.current) recognition.current.abort();
            window.speechSynthesis.cancel();
            window.speechSynthesis.onvoiceschanged = null;
        };

    }, []);

    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcript]);

    const addMessage = (speaker: TranscriptMessage['speaker'], text: string) => {
        setTranscript(prev => [...prev, { id: Date.now(), speaker, text }]);
    };

    const speak = (text: string) => {
        if (!window.speechSynthesis || !selectedVoiceURI) {
            const msg = !window.speechSynthesis ? "Speech synthesis not supported." : "No voice selected.";
            console.warn(msg);
            addMessage('system', `Error: ${msg}`);
            return;
        }
        window.speechSynthesis.cancel(); // Clear any previous utterances
        const utterance = new SpeechSynthesisUtterance(text);
        
        const selectedVoice = voices.find(v => v.voiceURI === selectedVoiceURI);
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = (e) => {
            console.error("Speech synthesis error", e);
            addMessage('system', "Sorry, an error occurred and I couldn't speak the response.");
            setIsSpeaking(false);
        }
        window.speechSynthesis.speak(utterance);
    };

    const startInterview = async () => {
        if (!navigator.onLine) {
            setError("You appear to be offline. An internet connection is required for the mock interview.");
            return;
        }
        const job = jobs.find(j => j.id === selectedJobId);
        const resume = resumes.find(r => r.id === selectedResumeId);
        if (!job || !resume || !job.description) {
            setError("Please select a job (with a description) and a resume.");
            return;
        }
        
        setError(null);
        setIsInterviewing(true);
        setTranscript([]);
        addMessage('system', `Starting interview for ${job.title} at ${job.company}...`);

        const systemInstruction = settings.prompts.interviewQuestions
            .replace('{{JOB_TITLE}}', job.title)
            .replace('{{COMPANY}}', job.company)
            .replace('{{JOB_DESCRIPTION}}', job.description)
            .replace('{{RESUME_CONTENT}}', getResumeAsText(resume));
            
        chatSession.current = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: { systemInstruction }
        });

        sendToAI("Start the interview.");
    };

    const sendToAI = async (message: string) => {
        if (!chatSession.current) return;
        try {
            const response = await chatSession.current.sendMessage({ message });
            const aiResponse = response.text;
            addMessage('ai', aiResponse);
            speak(aiResponse);
        } catch (e) {
            console.error("AI Error:", e);
            const errorText = "Sorry, I encountered an error. The interview will now end.";
            addMessage('system', errorText);
            speak(errorText);
            setIsInterviewing(false);
        }
    };

    const handleMicClick = () => {
        if (isListening) {
            recognition.current?.stop();
        } else {
            recognition.current?.start();
        }
    };
    
    if (error) {
        return <div className="ai-tool-panel"><p className="error-message">{error}</p></div>;
    }

    if (!isInterviewing) {
        return (
            <div className="ai-tool-panel">
                <h3>Mock Interview</h3>
                <p className="placeholder-text">Practice your interview skills with an AI interviewer. Your conversation will be voice-based.</p>
                <div className="generator-controls vertical">
                                                <select value={selectedJobId ?? ''} onChange={e => updateCurrentToolState({ selectedJobId: Number(e.target.value) })} disabled={jobs.length === 0} aria-label="Select job for interview prep">
                                <option value="" disabled>Select a job...</option>
                                {jobs.filter(j => j.description).map(job => <option key={job.id} value={job.id}>{job.title} at {job.company}</option>)}
                            </select>
                            <select value={selectedResumeId ?? ''} onChange={e => updateCurrentToolState({ selectedResumeId: Number(e.target.value) })} disabled={resumes.length === 0} aria-label="Select resume for interview prep">
                                <option value="" disabled>Select a resume...</option>
                                {resumes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                   <select value={selectedVoiceURI} onChange={e => setSelectedVoiceURI(e.target.value)} disabled={voices.length === 0} aria-label="Select AI interviewer voice">
                       <option value="" disabled>Select a voice...</option>
                       {voices.map(v => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}
                   </select>
                </div>
                <div style={{ marginTop: 'auto', paddingTop: '1rem', display: 'flex', justifyContent: 'center' }}>
                     <button onClick={startInterview} disabled={!selectedJobId || !selectedResumeId || !selectedVoiceURI} className="button-start-interview">
                        Start Interview
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="voice-interview-tool">
            <div className="transcript-wrapper">
                {transcript.map(msg => (
                    <div key={msg.id} className={`transcript-message ${msg.speaker}`}>
                        <div className="message-bubble">{msg.text}</div>
                    </div>
                ))}
                <div ref={transcriptEndRef}></div>
            </div>
            <div className="interview-mic-panel">
                 <button 
                    className={`mic-button ${isListening ? 'listening' : ''} ${isSpeaking ? 'speaking' : ''}`}
                    onClick={handleMicClick}
                    disabled={isSpeaking}
                    aria-label={isListening ? 'Stop Listening' : 'Start Listening'}
                >
                    <MicrophoneIcon />
                </button>
                <p className="mic-status-text">
                    {isSpeaking ? "AI is speaking..." : isListening ? "Listening..." : "Tap mic to speak"}
                </p>
                 <button className="button-secondary" onClick={() => setIsInterviewing(false)}>End Interview</button>
            </div>
        </div>
    );
};


const AiToolsView = ({ jobs, resumes, crmContacts, settings, messages, isLoadingChat, onSendMessage, isAgentMixMode, setIsAgentMixMode }: { jobs: Job[], resumes: Resume[], crmContacts: CrmContact[], settings: Settings, messages: Message[], isLoadingChat: boolean, onSendMessage: (input: string, file?: File) => Promise<void>, isAgentMixMode: boolean, setIsAgentMixMode: React.Dispatch<React.SetStateAction<boolean>> }) => {
    type ToolTab = 'Interview' | 'Resume Checker' | 'Cover Letter' | 'Deep Research' | 'General Assistant';
    const [activeTool, setActiveTool] = useState<ToolTab>('Resume Checker');

    // State management for each tool tab
    const [toolStates, setToolStates] = useState<{
        [key in ToolTab]: {
            selectedJobId: number | null;
            selectedResumeId: number | null;
            resultText: string;
            resumeCheckResult: { score: number; keywords: string[]; } | null;
        }
    }>({
        'Resume Checker': { selectedJobId: null, selectedResumeId: null, resultText: '', resumeCheckResult: null },
        'Cover Letter': { selectedJobId: null, selectedResumeId: null, resultText: '', resumeCheckResult: null },
        'Interview': { selectedJobId: null, selectedResumeId: null, resultText: '', resumeCheckResult: null },
        'Deep Research': { selectedJobId: null, selectedResumeId: null, resultText: '', resumeCheckResult: null },
        'General Assistant': { selectedJobId: null, selectedResumeId: null, resultText: '', resumeCheckResult: null }
    });

    const [isLoading, setIsLoading] = useState(false);

    // Helper functions to get and set current tool state
    const getCurrentToolState = () => toolStates[activeTool];
    const updateCurrentToolState = (updates: Partial<typeof toolStates[ToolTab]>) => {
        setToolStates(prev => ({
            ...prev,
            [activeTool]: { ...prev[activeTool], ...updates }
        }));
    };

    // Extract current state for easier access
    const currentState = getCurrentToolState();
    const selectedJobId = currentState.selectedJobId;
    const selectedResumeId = currentState.selectedResumeId;
    const resultText = currentState.resultText;
    const resumeCheckResult = currentState.resumeCheckResult;

    // Effect to pre-select job/resume when tool changes (only if not already set)
    useEffect(() => {
        const currentState = getCurrentToolState();
        if (currentState.selectedJobId === null) {
            const firstJobWithDesc = jobs.find(j => j.description);
            if (firstJobWithDesc) updateCurrentToolState({ selectedJobId: firstJobWithDesc.id });
            else if (jobs.length > 0) updateCurrentToolState({ selectedJobId: jobs[0].id });
        }

        if (currentState.selectedResumeId === null && resumes.length > 0) {
            updateCurrentToolState({ selectedResumeId: resumes[0].id });
        }
    }, [activeTool, jobs, resumes]);
    
    const handleCheckResume = async () => {
        const job = jobs.find(j => j.id === selectedJobId);
        const resume = resumes.find(r => r.id === selectedResumeId);
        if (!job || !resume || !job.description) {
            updateCurrentToolState({ resumeCheckResult: { score: 0, keywords: ["Please select a job (with a description) and a resume."] } });
            return;
        }
        setIsLoading(true);
        updateCurrentToolState({ resumeCheckResult: null });

        const promptTemplate = settings.prompts.resumeChecker;
        const prompt = promptTemplate
            .replace('{{JOB_DESCRIPTION}}', job.description)
            .replace('{{RESUME_CONTENT}}', getResumeAsText(resume));



        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt
            });

            // Clean the response text to extract JSON
            let responseText = response.text;
            

            
            // Remove markdown code blocks if present
            if (responseText.includes('```json')) {
                responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
            } else if (responseText.includes('```')) {
                responseText = responseText.replace(/```\n?/g, '');
            }
            
            // Trim whitespace
            responseText = responseText.trim();
            
            let resultJson;
            try {
                resultJson = JSON.parse(responseText);
                

                
            } catch (parseError) {
                console.error("JSON parse error:", parseError);
                console.error("Response text:", responseText);
                throw new Error("Invalid JSON response from AI");
            }
            
            // Extract data from the response (handle both old and new formats)
            const overallScore = resultJson.overall_match_percentage || resultJson.score || 0;
            const breakdown = resultJson.breakdown || {};
            const transparentAnalysis = resultJson.transparent_analysis || {};
            const recommendations = resultJson.recommendations || [];
            
            // Handle new format where data is in keyword_analysis and skills_analysis
            const keywordAnalysis = resultJson.keyword_analysis || {};
            const skillsAnalysis = resultJson.skills_analysis || {};
            
            // Create detailed analysis text
            let analysisText = `# 📊 Resume Analysis Report\n\n`;
            
            // Overall score with visual indicator
            const getScoreColor = (score: number) => {
                if (score >= 80) return '●';
                if (score >= 60) return '●';
                if (score >= 40) return '●';
                return '●';
            };
            
            analysisText += `## Overall Match: ${getScoreColor(overallScore)} ${overallScore}%\n\n`;
            
            // Add breakdown scores with visual indicators
            if (breakdown.skills_score !== undefined) {
                analysisText += `### 🎯 Skills Match: ${getScoreColor(breakdown.skills_score)} ${breakdown.skills_score}%\n`;
            }
            if (breakdown.experience_score !== undefined) {
                analysisText += `### ⏰ Experience Match: ${getScoreColor(breakdown.experience_score)} ${breakdown.experience_score}%\n`;
            }
            if (breakdown.keywords_score !== undefined) {
                analysisText += `### 🔑 Keywords Match: ${getScoreColor(breakdown.keywords_score)} ${breakdown.keywords_score}%\n`;
            }
            if (breakdown.education_score !== undefined) {
                analysisText += `### 🎓 Education Match: ${getScoreColor(breakdown.education_score)} ${breakdown.education_score}%\n`;
            }
            analysisText += '\n';
            
            // Add quick summary
            if (overallScore >= 80) {
                analysisText += `✓ **Excellent Match!** Your resume strongly aligns with this position.\n\n`;
            } else if (overallScore >= 60) {
                analysisText += `✓ **Good Match** Your resume has solid alignment with some room for improvement.\n\n`;
            } else if (overallScore >= 40) {
                analysisText += `⚠ **Moderate Match** Your resume needs some adjustments to better align with this role.\n\n`;
            } else {
                analysisText += `✗ **Poor Match** Your resume requires significant updates to align with this position.\n\n`;
            }
            
            // Add job requirements summary
            const jobReq = transparentAnalysis.job_requirements || resultJson.job_requirements;
            if (jobReq && Object.keys(jobReq).length > 0) {
                const req = jobReq;
                analysisText += `**Job Requirements:**\n`;
                if (req.required_skills && req.required_skills.length > 0) {
                    analysisText += `Required: ${req.required_skills.join(', ')}\n`;
                } else {
                    analysisText += `Required: No required skills specified\n`;
                }
                if (req.preferred_skills && req.preferred_skills.length > 0) {
                    analysisText += `Preferred: ${req.preferred_skills.join(', ')}\n`;
                } else {
                    analysisText += `Preferred: No preferred skills specified\n`;
                }
                if (req.years_experience) analysisText += `Experience: ${req.years_experience} years\n`;
                else analysisText += `Experience: Not specified\n`;
                if (req.education_required) analysisText += `Education: ${req.education_required}\n`;
                else analysisText += `Education: Not specified\n`;
                analysisText += '\n';
            } else {
                // Try to extract requirements from skills_analysis
                const skillsReq = skillsAnalysis.required_skills || [];
                const skillsPref = skillsAnalysis.preferred_skills || [];
                if (skillsReq.length > 0 || skillsPref.length > 0) {
                    analysisText += `**Job Requirements:**\n`;
                    if (skillsReq.length > 0) {
                        analysisText += `Required: ${skillsReq.join(', ')}\n`;
                    } else {
                        analysisText += `Required: No required skills specified\n`;
                    }
                    if (skillsPref.length > 0) {
                        analysisText += `Preferred: ${skillsPref.join(', ')}\n`;
                    } else {
                        analysisText += `Preferred: No preferred skills specified\n`;
                    }
                    analysisText += '\n';
                } else {
                    analysisText += `**Job Requirements:** Not provided by AI\n\n`;
                }
            }
            
            // Add resume summary
            const resumeSum = transparentAnalysis.resume_summary || resultJson.resume_summary;
            if (resumeSum && Object.keys(resumeSum).length > 0) {
                const res = resumeSum;
                analysisText += `**Resume Summary:**\n`;
                if (res.total_experience_years) analysisText += `Experience: ${res.total_experience_years} years\n`;
                else analysisText += `Experience: Not specified\n`;
                if (res.education_level) analysisText += `Education: ${res.education_level}\n`;
                else analysisText += `Education: Not specified\n`;
                if (res.current_job_title) analysisText += `Current Role: ${res.current_job_title}\n`;
                else analysisText += `Current Role: Not specified\n`;
                if (res.key_achievements && res.key_achievements.length > 0) {
                    analysisText += `Key Achievements: ${res.key_achievements.join(', ')}\n`;
                } else {
                    analysisText += `Key Achievements: Not specified\n`;
                }
                analysisText += '\n';
            } else {
                // Try to extract summary from skills_analysis
                const matchedRequired = skillsAnalysis.matched_required || [];
                const unmatchedRequired = skillsAnalysis.unmatched_required || [];
                if (matchedRequired.length > 0 || unmatchedRequired.length > 0) {
                    analysisText += `**Resume Summary:**\n`;
                    if (matchedRequired.length > 0) {
                        analysisText += `Matched Required Skills: ${matchedRequired.join(', ')}\n`;
                    }
                    if (unmatchedRequired.length > 0) {
                        analysisText += `Missing Required Skills: ${unmatchedRequired.join(', ')}\n`;
                    }
                    analysisText += '\n';
                } else {
                    analysisText += `**Resume Summary:** Not provided by AI\n\n`;
                }
            }
            
            // Add keyword analysis
            const ka = transparentAnalysis.keyword_analysis || keywordAnalysis;
            if (ka && Object.keys(ka).length > 0) {
                analysisText += `🔍 **Keyword Analysis:**\n`;
                analysisText += `Job Keywords: ${ka.total_job_keywords || 0}\n`;
                analysisText += `Matched Keywords: ${ka.matched_keywords || 0}\n`;
                analysisText += `Match Percentage: ${ka.match_percentage || 0}%\n\n`;
                
                // Show top job keywords
                if (ka.job_keywords && ka.job_keywords.length > 0) {
                    analysisText += `## Most Important Job Requirements\n\n`;
                    ka.job_keywords.slice(0, 10).forEach((kw: any, i: number) => {
                        const importance = kw.importance_score >= 7 ? '●' : kw.importance_score >= 5 ? '○' : '·';
                        analysisText += `${importance} **${kw.keyword}** (${kw.category})\n`;
                    });
                    analysisText += '\n';
                } else {
                    analysisText += `## Most Important Job Requirements\n*Not provided by AI*\n\n`;
                }
                
                // Show top resume keywords
                if (ka.resume_keywords && ka.resume_keywords.length > 0) {
                    analysisText += `## Your Resume Highlights\n\n`;
                    ka.resume_keywords.slice(0, 10).forEach((kw: any, i: number) => {
                        const strength = kw.relevance_score >= 12 ? '●' : kw.relevance_score >= 8 ? '○' : '·';
                        analysisText += `${strength} **${kw.keyword}** (${kw.category})\n`;
                    });
                    analysisText += '\n';
                } else {
                    analysisText += `## Your Resume Highlights\n*Not provided by AI*\n\n`;
                }
                
                // Show keyword matches
                if (ka.keyword_matches && ka.keyword_matches.length > 0) {
                    analysisText += `## Strong Matches\n\n`;
                    ka.keyword_matches.slice(0, 10).forEach((match: any, i: number) => {
                        const matchIcon = match.match_score >= 0.8 ? '●' : match.match_score >= 0.6 ? '○' : '·';
                        analysisText += `${matchIcon} **${match.job_keyword}** ↔ **${match.resume_keyword}**\n`;
                    });
                    analysisText += '\n';
                } else {
                    analysisText += `## Strong Matches\n*Not provided by AI*\n\n`;
                }
                
                // Show unmatched keywords
                if (ka.unmatched_job_keywords && ka.unmatched_job_keywords.length > 0) {
                    analysisText += `## Missing Skills\n\n`;
                    analysisText += `These skills are important for this role but missing from your resume:\n\n`;
                    ka.unmatched_job_keywords.forEach((keyword: string, i: number) => {
                        analysisText += `● **${keyword}**\n`;
                    });
                    analysisText += '\n';
                } else {
                    analysisText += `## Missing Skills\n*Not provided by AI*\n\n`;
                }
            } else {
                analysisText += `🔍 **Keyword Analysis:** Not provided by AI\n\n`;
            }
            
            // Add skills analysis
            const sa = transparentAnalysis.skills_analysis || skillsAnalysis;
            if (sa && Object.keys(sa).length > 0) {
                analysisText += `🎯 **Skills Analysis:**\n`;
                
                if (sa.required_skills && sa.required_skills.length > 0) {
                    analysisText += `Required Skills: ${sa.required_skills.join(', ')}\n`;
                    if (sa.matched_required && sa.matched_required.length > 0) {
                        analysisText += `✅ Matched: ${sa.matched_required.join(', ')}\n`;
                    } else {
                        analysisText += `✅ Matched: None\n`;
                    }
                    if (sa.unmatched_required && sa.unmatched_required.length > 0) {
                        analysisText += `❌ Missing: ${sa.unmatched_required.join(', ')}\n`;
                    } else {
                        analysisText += `❌ Missing: None\n`;
                    }
                } else {
                    analysisText += `Required Skills: Not specified\n`;
                }
                
                if (sa.preferred_skills && sa.preferred_skills.length > 0) {
                    analysisText += `Preferred Skills: ${sa.preferred_skills.join(', ')}\n`;
                    if (sa.matched_preferred && sa.matched_preferred.length > 0) {
                        analysisText += `✅ Matched: ${sa.matched_preferred.join(', ')}\n`;
                    } else {
                        analysisText += `✅ Matched: None\n`;
                    }
                    if (sa.unmatched_preferred && sa.unmatched_preferred.length > 0) {
                        analysisText += `❌ Missing: ${sa.unmatched_preferred.join(', ')}\n`;
                    } else {
                        analysisText += `❌ Missing: None\n`;
                    }
                } else {
                    analysisText += `Preferred Skills: Not specified\n`;
                }
                analysisText += '\n';
            } else {
                analysisText += `🎯 **Skills Analysis:** Not provided by AI\n\n`;
            }
            
            // Add recommendations
            const allRecommendations = recommendations || resultJson.missing_keywords || [];
            if (allRecommendations && allRecommendations.length > 0) {
                analysisText += `## Action Plan\n\n`;
                
                // Handle both new format (objects) and old format (strings)
                if (typeof allRecommendations[0] === 'object') {
                    allRecommendations.forEach((rec: any, i: number) => {
                        const priorityIcon = rec.priority === 1 ? '●' : rec.priority === 2 ? '○' : '·';
                        analysisText += `### ${priorityIcon} Priority ${rec.priority || i + 1}\n`;
                        analysisText += `**${rec.action || 'No action specified'}**\n\n`;
                        if (rec.keyword_to_add) analysisText += `**Add to resume:** ${rec.keyword_to_add}\n`;
                        if (rec.reason) analysisText += `**Why:** ${rec.reason}\n`;
                        analysisText += '\n';
                    });
                } else {
                    // Old format - just strings
                    analysisText += `### Top Priorities\n\n`;
                    allRecommendations.slice(0, 5).forEach((keyword: string, i: number) => {
                        analysisText += `**${i + 1}. Add "${keyword}" to your resume**\n`;
                        analysisText += `This skill is highly valued for this position.\n\n`;
                    });
                }
            } else {
                analysisText += `## Action Plan\n*No specific recommendations provided*\n\n`;
            }
            
            updateCurrentToolState({
                resumeCheckResult: {
                    score: overallScore,
                    keywords: [analysisText]
                }
            });

        } catch (error) {
            console.error("Resume check failed:", error);
            updateCurrentToolState({ resumeCheckResult: { score: 0, keywords: ["Error: Could not perform analysis. Please try again."] } });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleGenerateLetter = async () => {
        const job = jobs.find(j => j.id === selectedJobId);
        const resume = resumes.find(r => r.id === selectedResumeId);
        
        if (!job || !resume) {
             updateCurrentToolState({ resultText: "Please select a job and a resume to generate a cover letter." });
            return;
        }
        
        // Validate that we have the necessary data
        if (!job.description || job.description.trim().length < 50) {
            updateCurrentToolState({ resultText: "Error: Job description is too short or missing. Please select a job with a detailed description." });
            return;
        }
        
        if (!resume.summary || resume.summary.trim() === '') {
            updateCurrentToolState({ resultText: "Error: Resume summary is missing. Please add a summary to your resume first." });
            return;
        }
        
        if (!resume.experience || resume.experience.length === 0) {
            updateCurrentToolState({ resultText: "Error: Resume has no work experience. Please add work experience to your resume first." });
            return;
        }
        
        setIsLoading(true);
        updateCurrentToolState({ resultText: '' });
        
        const contact = job.contactIds?.[0] ? crmContacts.find(c => c.id === job.contactIds[0]) : null;

        const dataForPrompt = {
            candidate: {
                name: resume.contact.name,
                email: resume.contact.email,
                phone: resume.contact.phone,
                linkedin: resume.contact.linkedin,
                website: resume.contact.website,
                qualificationAndExperience: resume.summary,
                fullResumeContent: getResumeAsText(resume)
            },
            job: {
                position: job.title,
                company: job.company,
                source: job.sourceUrl || job.source || "N/A",
                fullDescription: job.description || "No description provided.",
                recipientName: contact ? contact.name : "Hiring Manager",
                recipientRole: contact ? contact.role : "",
                companyAddress: job.location || ""
            },
            currentDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        };

        const promptTemplate = settings.prompts.coverLetter;
        const prompt = promptTemplate.replace('{{JSON_DATA}}', JSON.stringify(dataForPrompt, null, 2));

        try {
            const response = await ai.models.generateContent({ 
                model: "gemini-2.5-flash", 
                contents: prompt 
            });
            
            // Check if the response is valid
            if (response.text && response.text.trim().length > 0) {
                updateCurrentToolState({ resultText: response.text });
            } else {
                updateCurrentToolState({ resultText: "Error: Generated cover letter is empty. Please try again." });
            }
        } catch (error) {
            console.error("Cover letter generation failed:", error);
            updateCurrentToolState({ resultText: "Error: Could not generate cover letter. Please try again." });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleDeepResearch = async () => {
        const job = jobs.find(j => j.id === selectedJobId);
        if (!job) {
            updateCurrentToolState({ resultText: "Please select a job to research." });
            return;
        }
        setIsLoading(true);
        updateCurrentToolState({ resultText: '' });
        const prompt = `You are a professional career research analyst. Your ONLY task is to use Google Search to find real-time, public information. **DO NOT use your internal knowledge or make assumptions.**

Perform a deep, internet-based search to compile a concise research report for a candidate applying for the role of "${job.title}" at "${job.company}".

The report MUST be structured into the following sections. For each section, provide actionable, up-to-date insights based **ONLY** on the provided search results. If you cannot find information for a specific point, you **MUST** state "No specific information found on this topic." Do not invent or generalize information.

**1. Company Overview & Culture:**
   - Mission and recent news: What is the company's stated mission? What are their major news or product launches in the last 6-12 months?
   - Culture sentiment: Based on employee reviews (from sites like Glassdoor, etc.), what is the general sentiment regarding work-life balance, culture, and leadership?

**2. The Role & Team:**
   - Team context: Based on search results, what can you infer about the team this role might be on?
   - Key people: Can you identify any potential team leads, managers, or key team members for this type of role at the company?
   - Core responsibilities: What are the key responsibilities for this role, based on the job description and other similar roles at the company you can find?

**3. The Interview Process:**
   - Typical stages: What are the typical stages of the interview process for a similar role at this company, according to user reports online?
   - Common questions: What are 2-3 examples of common technical or behavioral questions asked in interviews for this role at this company?

**4. Strategic Talking Points:**
   - Insightful questions: Based on your research, suggest 2-3 insightful questions the candidate can ask the interviewer to demonstrate their interest and research. These should be based on recent news, company challenges, or product launches you found.

**IMPORTANT:** Base your entire report on the live search results. If you don't find information, state that clearly.

**Job Description for Context:**
${job.description || 'No detailed description provided.'}
`;

        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    tools: [{ googleSearch: {} }],
                },
            });
            updateCurrentToolState({ resultText: response.text });
        } catch (error) {
            console.error("Deep research generation failed:", error);
            updateCurrentToolState({ resultText: "Error: Could not generate the research report. The topic may be restricted or another error occurred. Please try again." });
        } finally {
            setIsLoading(false);
        }
    };


    const ScoreCircle = ({ score, size = 120 }: { score: number, size?: number }) => {
        const radius = size / 2 - 10;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (score / 100) * circumference;

        return (
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="score-circle">
                <circle className="score-circle-bg" cx={size/2} cy={size/2} r={radius} strokeWidth="10" />
                <circle 
                    className="score-circle-fg"
                    cx={size/2} cy={size/2} r={radius} strokeWidth="10"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                />
                <text x="50%" y="50%" dy=".3em" textAnchor="middle" className="score-circle-text">
                    {score}%
                </text>
            </svg>
        );
    };

    const renderTool = () => {
        switch (activeTool) {
            case 'Interview':
                return <VoiceInterviewTool jobs={jobs} resumes={resumes} settings={settings} />;
            case 'Resume Checker':
                 return (
                    <div className="ai-tool-panel resume-checker-tool">
                        <h3>Resume Checker</h3>
                        <p className="placeholder-text">Get an ATS-friendly score and find missing keywords.</p>
                        <div className="generator-controls">
                            <select value={selectedJobId ?? ''} onChange={e => updateCurrentToolState({ selectedJobId: Number(e.target.value) })} disabled={jobs.length === 0} aria-label="Select job for resume check">
                                <option value="" disabled>Select a job...</option>
                                {jobs.filter(j => j.description).map(job => <option key={job.id} value={job.id}>{job.title} at {job.company}</option>)}
                            </select>
                             <select value={selectedResumeId ?? ''} onChange={e => updateCurrentToolState({ selectedResumeId: Number(e.target.value) })} disabled={resumes.length === 0} aria-label="Select resume for resume check">
                                <option value="" disabled>Select a resume...</option>
                                {resumes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                            <button onClick={handleCheckResume} disabled={isLoading || !selectedJobId || !selectedResumeId}>
                                {isLoading ? <div className="spinner-small"></div> : 'Check'}
                            </button>
                        </div>
                        <div className="ai-result-box large">
                            {isLoading && <div className="loading-indicator"><span>AI is analyzing your resume...</span></div>}
                            {resumeCheckResult && resumeCheckResult.keywords.length > 0 && (
                                <div className="resume-analysis-content">
                                    {resumeCheckResult.keywords.map((keyword, index) => (
                                        <div key={index} className="analysis-section">
                                            {keyword}
                                        </div>
                                    ))}
                                </div>
                            )}
                            {!isLoading && !resumeCheckResult && <p className="placeholder-text">Your resume analysis will appear here.</p>}
                        </div>
                    </div>
                );
            case 'Cover Letter':
                 return (
                    <div className="ai-tool-panel">
                        <h3>Cover Letter Writer</h3>
                        <p className="placeholder-text">Generate a tailored cover letter based on a job and resume.</p>
                        <div className="generator-controls">
                                                        <select value={selectedJobId ?? ''} onChange={e => updateCurrentToolState({ selectedJobId: Number(e.target.value) })} disabled={jobs.length === 0} aria-label="Select job for cover letter">
                                <option value="" disabled>Select a job...</option>
                                {jobs.filter(j => j.description).map(job => <option key={job.id} value={job.id}>{job.title} at {job.company}</option>)}
                            </select>
                            <select value={selectedResumeId ?? ''} onChange={e => updateCurrentToolState({ selectedResumeId: Number(e.target.value) })} disabled={resumes.length === 0} aria-label="Select resume for cover letter">
                                <option value="" disabled>Select a resume...</option>
                                {resumes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                            <button onClick={handleGenerateLetter} disabled={isLoading || !selectedJobId || !selectedResumeId}>
                                {isLoading ? <div className="spinner-small"></div> : 'Generate'}
                            </button>
                        </div>
                        <div className="ai-result-box large">
                            {isLoading && <div className="loading-indicator"><span>AI is writing your letter...</span></div>}
                            {resultText && <pre className="generated-text">{resultText}</pre>}
                            {!isLoading && !resultText && <p className="placeholder-text">Your generated cover letter will appear here.</p>}
                        </div>
                    </div>
                );
            case 'Deep Research':
                return (
                    <div className="ai-tool-panel">
                        <h3>Deep Research</h3>
                        <p className="placeholder-text">Get a detailed, internet-powered report on a company and role.</p>
                        <div className="generator-controls">
                            <select value={selectedJobId ?? ''} onChange={e => updateCurrentToolState({ selectedJobId: Number(e.target.value) })} disabled={jobs.length === 0} aria-label="Select job for deep research">
                                <option value="" disabled>Select a job...</option>
                                {jobs.map(job => <option key={job.id} value={job.id}>{job.title} at {job.company}</option>)}
                            </select>
                            <button onClick={handleDeepResearch} disabled={isLoading || !selectedJobId}>
                                {isLoading ? <div className="spinner-small"></div> : 'Research'}
                            </button>
                        </div>
                        <div className="ai-result-box large">
                            {isLoading && <div className="loading-indicator"><span>AI is researching...</span></div>}
                            {resultText && <pre className="generated-text">{resultText}</pre>}
                            {!isLoading && !resultText && <p className="placeholder-text">Your research report will appear here.</p>}
                        </div>
                    </div>
                );
            case 'General Assistant':
                 return <GeneralAssistantTool messages={messages} isLoading={isLoadingChat} onSendMessage={onSendMessage} isAgentMixMode={isAgentMixMode} setIsAgentMixMode={setIsAgentMixMode} />;
            default: return null;
        }
    };
    
    return (
        <div className="ai-tools-view">
            <header className="ai-tools-header">
                <h2>AI Tools</h2>
                <div className="ai-tools-tabs">
                     {(['Resume Checker', 'Cover Letter', 'Interview', 'Deep Research', 'General Assistant'] as ToolTab[]).map(toolName => (
                        <button key={toolName} onClick={() => {
                            setActiveTool(toolName);
                        }} className={activeTool === toolName ? 'active' : ''}>{toolName}</button>
                    ))}
                </div>
            </header>
            <div className="ai-tool-content">
                {renderTool()}
            </div>
        </div>
    );
};


const ResumePreview = ({ resume }: { resume: Resume }) => {
    const previewRef = useRef<HTMLDivElement>(null);
    const [pages, setPages] = useState<number>(1);

    useEffect(() => {
        if (previewRef.current) {
            // A4 height in pixels at 96 DPI is approx 1123px.
            // We give it a bit less to account for margins.
            const pageHeight = 1100; 
            const contentHeight = previewRef.current.scrollHeight;
            setPages(Math.ceil(contentHeight / pageHeight));
        }
    }, [resume]); // Recalculate when resume data changes

    return (
        <div className="resume-preview-paper" ref={previewRef} style={{'--page-count': pages} as React.CSSProperties}>
            <header className="preview-header">
                <h1>{resume.contact.name || 'Your Name'}</h1>
                <p>
                    {resume.contact.email && <span>{resume.contact.email}</span>}
                    {resume.contact.phone && <span>{resume.contact.phone}</span>}
                    {resume.contact.linkedin && <span>{resume.contact.linkedin}</span>}
                    {resume.contact.website && <span>{resume.contact.website}</span>}
                </p>
            </header>

            {resume.summary && (
                <section className="preview-section">
                    <h2>Summary</h2>
                    <p>{resume.summary}</p>
                </section>
            )}

            {resume.skills && (
                <section className="preview-section">
                    <h2>Skills</h2>
                    <p>{resume.skills}</p>
                </section>
            )}

            {resume.experience.length > 0 && (
                <section className="preview-section">
                    <h2>Work Experience</h2>
                    {resume.experience.map(exp => (
                        <div key={exp.id} className="preview-job">
                            <h3>{exp.role || 'Job Title'} <span>at {exp.company || 'Company'}</span></h3>
                            <p className="subheading">
                                {exp.location && <span>{exp.location} | </span>}
                                <span>{exp.startDate} - {exp.endDate}</span>
                            </p>
                            <div className="description">
                                {exp.description.split('\n').map((line, i) => line.trim() && <p key={i}>• {line.replace(/^- /, '').trim()}</p>)}
                            </div>
                        </div>
                    ))}
                </section>
            )}

            {resume.education.length > 0 && (
                <section className="preview-section">
                    <h2>Education</h2>
                    {resume.education.map(edu => (
                        <div key={edu.id} className="preview-job">
                             <h3>{edu.degree || 'Degree'}</h3>
                             <p className="subheading">{edu.institution || 'Institution'}, {edu.location}</p>
                             <p className="subheading">{edu.startDate} - {edu.endDate}</p>
                        </div>
                    ))}
                </section>
            )}

            {resume.customSections && resume.customSections.length > 0 && (
                <>
                    {resume.customSections.map(sec => (
                        <section key={sec.id} className="preview-section">
                            <h2>{sec.title}</h2>
                            <div className="description">
                                {sec.content.split('\n').map((line, i) => line.trim() && <p key={i}>• {line.replace(/^- /, '').trim()}</p>)}
                            </div>
                        </section>
                    ))}
                </>
            )}
        </div>
    );
}

const ResumeEditor = ({ resume, onUpdate }: { resume: Resume, onUpdate: (updatedResume: Resume) => void }) => {
    const [formData, setFormData] = useState<Resume>(resume);
    
    // Update local form data if the selected resume changes from the parent
    useEffect(() => {
        setFormData(resume);
    }, [resume]);

    // Debounced update to parent
    useEffect(() => {
        const handler = setTimeout(() => {
            onUpdate(formData);
        }, 500); // 500ms debounce
        return () => clearTimeout(handler);
    }, [formData, onUpdate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, contact: { ...prev.contact, [name]: value } }));
    };
    
    // Experience Handlers
    const handleExperienceChange = (index: number, field: keyof WorkExperience, value: string) => {
        const updatedExperience = [...formData.experience];
        updatedExperience[index] = { ...updatedExperience[index], [field]: value };
        setFormData(prev => ({ ...prev, experience: updatedExperience }));
    };
    const addExperience = () => {
        const newExp: WorkExperience = { id: Date.now(), role: '', company: '', location: '', startDate: '', endDate: '', description: '' };
        setFormData(prev => ({ ...prev, experience: [...prev.experience, newExp] }));
    };
    const removeExperience = (id: number) => {
        setFormData(prev => ({ ...prev, experience: prev.experience.filter(exp => exp.id !== id) }));
    };

    // Education Handlers
    const handleEducationChange = (index: number, field: keyof Education, value: string) => {
        const updatedEducation = [...formData.education];
        updatedEducation[index] = { ...updatedEducation[index], [field]: value };
        setFormData(prev => ({ ...prev, education: updatedEducation }));
    };
    const addEducation = () => {
        const newEdu: Education = { id: Date.now(), institution: '', degree: '', location: '', startDate: '', endDate: '' };
        setFormData(prev => ({ ...prev, education: [...prev.education, newEdu] }));
    };
    const removeEducation = (id: number) => {
        setFormData(prev => ({ ...prev, education: prev.education.filter(edu => edu.id !== id) }));
    };

    // Custom Section Handlers
    const handleCustomSectionChange = (index: number, field: keyof CustomSection, value: string) => {
        const updatedSections = [...(formData.customSections || [])];
        updatedSections[index] = { ...updatedSections[index], [field]: value };
        setFormData(prev => ({ ...prev, customSections: updatedSections }));
    };
    const addCustomSection = () => {
        const newSection: CustomSection = { id: Date.now(), title: 'New Section', content: '' };
        setFormData(prev => ({ ...prev, customSections: [...(prev.customSections || []), newSection] }));
    };
    const removeCustomSection = (id: number) => {
        setFormData(prev => ({ ...prev, customSections: (prev.customSections || []).filter(sec => sec.id !== id) }));
    };
    
    const handleExport = async (format: 'pdf' | 'doc') => {
        const safeFilename = formData.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();

        if (format === 'doc') {
             const resumeText = getResumeAsText(formData);
             const blob = new Blob([resumeText], { type: 'text/plain;charset=utf-8' });
             const url = URL.createObjectURL(blob);
             const a = document.createElement('a');
             a.href = url;
             a.download = `${safeFilename}.doc`;
             document.body.appendChild(a);
             a.click();
             document.body.removeChild(a);
             URL.revokeObjectURL(url);
             return;
        }

        // PDF Export
        const pdfExportNode = document.createElement('div');
        pdfExportNode.id = 'pdf-export-node';
        document.body.appendChild(pdfExportNode);

        const tempRoot = createRoot(pdfExportNode);
        tempRoot.render(<ResumePreview resume={formData} />);

        await new Promise(resolve => setTimeout(resolve, 300));

        const paperElement = document.querySelector("#pdf-export-node .resume-preview-paper") as HTMLElement;
        if (!paperElement) {
            console.error("Could not find the element to export.");
            document.body.removeChild(pdfExportNode);
            return;
        }

        const canvas = await html2canvas(paperElement, {
            scale: 2,
            useCORS: true,
            windowWidth: paperElement.scrollWidth,
            windowHeight: paperElement.scrollHeight,
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jspdf.jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = canvasWidth / pdfWidth;
        const imgHeight = canvasHeight / ratio;

        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
            position -= pdfHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;
        }

        pdf.save(`${safeFilename}.pdf`);
        document.body.removeChild(pdfExportNode);
    };

    return (
        <div className="resume-editor-content">
            <div className="resume-editor-main">
                <div className="resume-editor-header">
                    <input name="name" value={formData.name} onChange={handleChange} className="resume-title-input" />
                </div>
                <div className="resume-form-section">
                    <h4>Contact Information</h4>
                    <div className="form-grid two-cols">
                        <input name="name" placeholder="Full Name" value={formData.contact.name} onChange={handleContactChange} />
                        <input name="email" placeholder="Email" type="email" value={formData.contact.email} onChange={handleContactChange} />
                        <input name="phone" placeholder="Phone" type="tel" value={formData.contact.phone} onChange={handleContactChange} />
                        <input name="linkedin" placeholder="LinkedIn Profile URL" value={formData.contact.linkedin} onChange={handleContactChange} />
                        <div className="form-group full-width">
                            <input name="website" placeholder="Portfolio/Website URL" value={formData.contact.website} onChange={handleContactChange} />
                        </div>
                    </div>
                </div>
                <div className="resume-form-section">
                    <h4>Professional Summary</h4>
                    <textarea name="summary" placeholder="Write a brief summary of your skills and experience..." value={formData.summary} onChange={handleChange} rows={4} />
                </div>
                 <div className="resume-form-section">
                    <h4>Skills</h4>
                    <textarea name="skills" placeholder="e.g., React, TypeScript, Project Management..." value={formData.skills} onChange={handleChange} rows={3} />
                     <p className="placeholder-text">Enter skills separated by commas.</p>
                </div>
                <div className="resume-form-section">
                    <div className="section-header"><h4>Work Experience</h4><button type="button" onClick={addExperience}>+ Add</button></div>
                    {formData.experience.map((exp, index) => (
                        <div key={exp.id} className="dynamic-form-item">
                            <button type="button" className="delete-item-btn" onClick={() => removeExperience(exp.id)}>&times;</button>
                            <div className="form-grid two-cols">
                                <input placeholder="Job Title / Role" value={exp.role} onChange={e => handleExperienceChange(index, 'role', e.target.value)} />
                                <input placeholder="Company" value={exp.company} onChange={e => handleExperienceChange(index, 'company', e.target.value)} />
                                <input placeholder="Location (e.g., City, State)" value={exp.location} onChange={e => handleExperienceChange(index, 'location', e.target.value)} />
                                <div className="date-inputs">
                                    <input placeholder="Start Date (YYYY-MM)" value={exp.startDate} onChange={e => handleExperienceChange(index, 'startDate', e.target.value)} />
                                    <input placeholder="End Date (YYYY-MM or Present)" value={exp.endDate} onChange={e => handleExperienceChange(index, 'endDate', e.target.value)} />
                                </div>
                                <div className="form-group full-width">
                                    <textarea placeholder="Key responsibilities and achievements (use bullet points)..." value={exp.description} onChange={e => handleExperienceChange(index, 'description', e.target.value)} rows={4} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="resume-form-section">
                    <div className="section-header"><h4>Education</h4><button type="button" onClick={addEducation}>+ Add</button></div>
                    {formData.education.map((edu, index) => (
                         <div key={edu.id} className="dynamic-form-item">
                            <button type="button" className="delete-item-btn" onClick={() => removeEducation(edu.id)}>&times;</button>
                            <div className="form-grid two-cols">
                                <input placeholder="Institution / University" value={edu.institution} onChange={e => handleEducationChange(index, 'institution', e.target.value)} />
                                <input placeholder="Degree / Field of Study" value={edu.degree} onChange={e => handleEducationChange(index, 'degree', e.target.value)} />
                                <input placeholder="Location (e.g., City, State)" value={edu.location} onChange={e => handleEducationChange(index, 'location', e.target.value)} />
                                 <div className="date-inputs">
                                     <input placeholder="Start Date (YYYY-MM)" value={edu.startDate} onChange={e => handleEducationChange(index, 'startDate', e.target.value)} />
                                     <input placeholder="End Date (YYYY-MM)" value={edu.endDate} onChange={e => handleEducationChange(index, 'endDate', e.target.value)} />
                                 </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="resume-form-section">
                    <div className="section-header"><h4>Custom Sections</h4><button type="button" onClick={addCustomSection}>+ Add</button></div>
                    {(formData.customSections || []).map((sec, index) => (
                        <div key={sec.id} className="dynamic-form-item">
                            <button type="button" className="delete-item-btn" onClick={() => removeCustomSection(sec.id)}>&times;</button>
                            <div className="form-grid">
                                <div className="form-group full-width">
                                    <input placeholder="Section Title (e.g., Projects, Certifications)" value={sec.title} onChange={e => handleCustomSectionChange(index, 'title', e.target.value)} />
                                </div>
                                <div className="form-group full-width">
                                    <textarea placeholder="Section content (use bullet points)..." value={sec.content} onChange={e => handleCustomSectionChange(index, 'content', e.target.value)} rows={5} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="resume-preview-container">
                <ResumePreview resume={formData} />
                <div className="resume-preview-actions">
                    <button onClick={() => handleExport('pdf')} className="export-button">
                        <PdfIcon />
                        <span>Export PDF</span>
                    </button>
                    <button onClick={() => handleExport('doc')} className="export-button">
                        <WordIcon />
                        <span>Export Word</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

const ResumesView = ({ resumes, onAddResume, onDeleteResume, onUpdateResume }: { resumes: Resume[], onAddResume: (resume: Omit<Resume, 'id'>) => void, onDeleteResume: (resumeId: number) => void, onUpdateResume: (resume: Resume) => void }) => {
    const [selectedResumeId, setSelectedResumeId] = useState<number | null>(resumes.length > 0 ? resumes[0].id : null);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editingName, setEditingName] = useState('');
    
    useEffect(() => {
        if (!selectedResumeId && resumes.length > 0) {
            setSelectedResumeId(resumes[0].id);
        } else if (resumes.length > 0 && !resumes.find(r => r.id === selectedResumeId)) {
            // If the selected resume was deleted, select the first one
            setSelectedResumeId(resumes[0].id);
        } else if (resumes.length === 0) {
            setSelectedResumeId(null);
        }
    }, [resumes, selectedResumeId]);

    const handleNewResume = () => {
        const newResume: Omit<Resume, 'id'> = {
            name: 'Untitled Resume',
            contact: { name: '', email: '', phone: '', linkedin: '', website: '' },
            summary: '',
            experience: [],
            education: [],
            skills: '',
            customSections: [],
        };
        onAddResume(newResume);
    };
    
    const handleDuplicateResume = () => {
        const resumeToDuplicate = resumes.find(r => r.id === selectedResumeId);
        if (!resumeToDuplicate) return;

        const { id, ...restOfResume } = resumeToDuplicate;
        const newResume: Omit<Resume, 'id'> = {
            ...JSON.parse(JSON.stringify(restOfResume)), // Deep copy
            name: `${resumeToDuplicate.name} (Copy)`,
        };
        onAddResume(newResume);
    };

    const handleDeleteResume = () => {
        if (!selectedResumeId) return;
        if (window.confirm(`Are you sure you want to delete this resume version?`)) {
            onDeleteResume(selectedResumeId);
        }
    };

    const handleStartEditing = (resume: Resume) => {
        setEditingId(resume.id);
        setEditingName(resume.name);
    };

    const handleSaveName = () => {
        if (editingId === null) return;
        const resumeToUpdate = resumes.find(r => r.id === editingId);
        if (resumeToUpdate && resumeToUpdate.name !== editingName) {
            onUpdateResume({ ...resumeToUpdate, name: editingName });
        }
        setEditingId(null);
        setEditingName('');
    };
    
    const selectedResume = resumes.find(r => r.id === selectedResumeId);

    return (
        <div className="resume-builder-layout">
            <div className="resume-list-panel">
                <div className="resume-list-header">
                    <h3>My Resumes</h3>
                    <button onClick={handleNewResume}>+ New</button>
                </div>
                <ul className="resume-version-list">
                    {resumes.map(resume => (
                        <li key={resume.id} 
                            className={resume.id === selectedResumeId ? 'active' : ''}
                            onClick={() => setSelectedResumeId(resume.id)}
                            onDoubleClick={() => handleStartEditing(resume)}
                        >
                            {editingId === resume.id ? (
                                <input
                                    className="resume-name-edit-input"
                                    value={editingName}
                                    onChange={(e) => setEditingName(e.target.value)}
                                    onBlur={handleSaveName}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveName();
                                        if (e.key === 'Escape') setEditingId(null);
                                    }}
                                    autoFocus
                                />
                            ) : (
                                <span>{resume.name}</span>
                            )}
                        </li>
                    ))}
                    {resumes.length === 0 && <p className="placeholder-text">No resumes created yet.</p>}
                </ul>
                 <div className="resume-list-actions">
                    <button onClick={handleDuplicateResume} disabled={!selectedResumeId}>Duplicate</button>
                    <button onClick={handleDeleteResume} disabled={!selectedResumeId} className="button-delete-secondary">Delete</button>
                </div>
            </div>
            <div className="resume-editor-panel">
                 {selectedResume ? (
                    <ResumeEditor 
                        key={selectedResume.id}
                        resume={selectedResume}
                        onUpdate={onUpdateResume}
                    />
                ) : (
                    <div className="placeholder-container">
                        <ResumesIcon/>
                        <h3>Welcome to the Resume Builder</h3>
                        <p className="placeholder-text">Create a new resume to get started.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const SettingsView = ({ settings, onUpdate }: { settings: Settings, onUpdate: (updatedSettings: Settings) => void }) => {
    type SettingsTab = 'Profile & Personalization' | 'AI & Prompts' | 'Subscription & Billing' | 'Data & Privacy';
    const [activeTab, setActiveTab] = useState<SettingsTab>('Profile & Personalization');
    const [localSettings, setLocalSettings] = useState(settings);

    useEffect(() => {
        setLocalSettings(settings);
    }, [settings]);

    useEffect(() => {
        const handler = setTimeout(() => {
            onUpdate(localSettings);
        }, 1000); // Debounce settings updates
        return () => clearTimeout(handler);
    }, [localSettings, onUpdate]);

    const handleNestedChange = (parentKey: keyof Settings, childKey: string, value: any) => {
        setLocalSettings(prev => ({
            ...prev,
            [parentKey]: {
                ...(prev[parentKey] as object),
                [childKey]: value,
            },
        }));
    };

    const handleAgentPromptChange = (agentKey: keyof Settings['agents'], value: string) => {
        handleNestedChange('agents', agentKey, { ...localSettings.agents[agentKey], prompt: value });
    };

    const handleToolToggle = (agentKey: keyof Settings['agents'], toolId: string) => {
        const currentToolState = localSettings.agents[agentKey].tools[toolId]?.enabled || false;
        handleNestedChange('agents', agentKey, {
            ...localSettings.agents[agentKey],
            tools: {
                ...localSettings.agents[agentKey].tools,
                [toolId]: { enabled: !currentToolState },
            },
        });
    };
    
    const handleExportData = async () => {
        // Since data is on the server, we ask the server for the backup.
        try {
            const response = await fetch('/api/backup');
            if (!response.ok) throw new Error('Failed to fetch backup from server.');
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `pathfinder-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting data:', error);
            alert('Could not export data from the server.');
        }
    };

    const handleDeleteAccount = async () => {
        if (window.confirm("Are you absolutely sure? This will permanently delete all your data from the database. This action cannot be undone.")) {
            if (window.confirm("FINAL CONFIRMATION: Please confirm you want to delete all data.")) {
                try {
                    const response = await fetch('/api/delete-all-data', { method: 'DELETE' });
                    if (!response.ok) throw new Error('Server failed to delete data.');
                    alert("All data has been deleted.");
                    window.location.reload();
                } catch (error) {
                    console.error('Error deleting data:', error);
                    alert('Could not delete data from the server.');
                }
            }
        }
    };
    
    return (
        <div className="settings-view">
            <header className="settings-header">
                <h2>Preferences</h2>
                <div className="settings-tabs-nav">
                    {(['Profile & Personalization', 'AI & Prompts', 'Subscription & Billing', 'Data & Privacy'] as SettingsTab[]).map(tabName => (
                        <button key={tabName} onClick={() => setActiveTab(tabName)} className={activeTab === tabName ? 'active' : ''}>
                            {tabName}
                        </button>
                    ))}
                </div>
            </header>
            <div className="settings-content">
                {activeTab === 'Profile & Personalization' && (
                    <div className="settings-card">
                        <h3>Profile & Personalization</h3>
                        <div className="form-grid two-cols">
                            <div className="form-group">
                                <label htmlFor="profileName">Your Name</label>
                                <input id="profileName" type="text" value={localSettings.profile.name} onChange={(e) => handleNestedChange('profile', 'name', e.target.value)} />
                            </div>
                             <div className="form-group">
                                <label htmlFor="weeklyGoal">Weekly Application Goal</label>
                                <input id="weeklyGoal" type="number" min="0" value={localSettings.profile.weeklyGoal} onChange={(e) => handleNestedChange('profile', 'weeklyGoal', parseInt(e.target.value, 10) || 0)} />
                            </div>
                            <div className="form-group full-width">
                                <label htmlFor="masterSkills">My Master Skill List</label>
                                <textarea id="masterSkills" value={localSettings.profile.masterSkills} onChange={(e) => handleNestedChange('profile', 'masterSkills', e.target.value)} rows={5}></textarea>
                                <p className="placeholder-text">Enter skills, comma-separated. Used by AI tools.</p>
                            </div>
                        </div>
                    </div>
                )}
                 {activeTab === 'AI & Prompts' && (
                    <>
                        <div className="settings-card">
                            <h3>Prompts</h3>
                            <div className="form-grid">
                                 <div className="form-group">
                                    <label htmlFor="resumeCheckerPrompt">Resume Checker Prompt (Read-only)</label>
                                    <textarea 
                                        id="resumeCheckerPrompt" 
                                        value={localSettings.prompts.resumeChecker} 
                                        readOnly 
                                        rows={8}
                                        style={{ backgroundColor: '#f5f5f5', color: '#666' }}
                                    ></textarea>
                                    <p className="placeholder-text">This prompt is loaded from prompts/resume-checker-prompt.txt. Edit the file to modify.</p>
                                </div>
                                 <div className="form-group">
                                    <label htmlFor="coverLetterPrompt">Cover Letter Prompt (Read-only)</label>
                                    <textarea 
                                        id="coverLetterPrompt" 
                                        value={localSettings.prompts.coverLetter} 
                                        readOnly 
                                        rows={8}
                                        style={{ backgroundColor: '#f5f5f5', color: '#666' }}
                                    ></textarea>
                                    <p className="placeholder-text">This prompt is loaded from prompts/cover-letter-prompt.txt. Edit the file to modify.</p>
                                </div>
                                 <div className="form-group">
                                    <label htmlFor="interviewQuestionsPrompt">Interview Questions Prompt</label>
                                    <textarea id="interviewQuestionsPrompt" value={localSettings.prompts.interviewQuestions} onChange={(e) => handleNestedChange('prompts', 'interviewQuestions', e.target.value)} rows={8}></textarea>
                                    <p className="placeholder-text">Use placeholders like {"{{JOB_TITLE}}"}, {"{{COMPANY}}"}, {"{{JOB_DESCRIPTION}}"}, {"{{RESUME_CONTENT}}"} in the prompt.</p>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="mixAgentsPrompt">AI Assistant (Mix Agents) Prompt</label>
                                    <textarea id="mixAgentsPrompt" value={localSettings.prompts.mixAgents} onChange={(e) => handleNestedChange('prompts', 'mixAgents', e.target.value)} rows={5}></textarea>
                                </div>
                            </div>
                        </div>
                        <div className="settings-card">
                            <h3>Agent Configuration</h3>
                            <div className="agent-grid">
                                {Object.entries(localSettings.agents).map(([key, agent]) => (
                                    <div key={key} className="agent-config-card">
                                        <h4>{agent.name}</h4>
                                        <div className="form-group">
                                            <label htmlFor={`${key}-prompt`}>Agent Prompt</label>
                                            <textarea id={`${key}-prompt`} value={agent.prompt} onChange={(e) => handleAgentPromptChange(key as keyof Settings['agents'], e.target.value)} rows={3} />
                                        </div>
                                        <h5>Enabled Tools</h5>
                                        <div className="tool-grid">
                                           {availableTools.map(tool => (
                                               <div key={tool.id} className={`tool-tile ${agent.tools[tool.id]?.enabled ? 'active' : ''}`} onClick={() => handleToolToggle(key as keyof Settings['agents'], tool.id)}>
                                                   <h6>{tool.name}</h6>
                                                   <p>{tool.description}</p>
                                               </div>
                                           ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
                 {activeTab === 'Subscription & Billing' && (
                     <div className="settings-card">
                        <h3>Subscription & Billing</h3>
                        <div className="subscription-plan-grid">
                            <div className="subscription-plan-card current">
                                <h4>Your Plan: {localSettings.subscription.plan}</h4>
                                <p>Status: <span className={`status-${localSettings.subscription.status.toLowerCase()}`}>{localSettings.subscription.status}</span></p>
                                {localSettings.subscription.status === 'Active' && <p>Renews on: {new Date(localSettings.subscription.nextBillingDate).toLocaleDateString()}</p>}
                                <button disabled>You are on the best plan!</button>
                                <p className="placeholder-text">Manage your subscription via Stripe.</p>
                            </div>
                            <div className="subscription-plan-card">
                                <h4>Free Plan</h4>
                                <ul>
                                    <li>✔ Up to 20 jobs</li>
                                    <li>✔ Basic AI Assistant</li>
                                    <li>- Resume Checker</li>
                                    <li>- Analytics</li>
                                </ul>
                                <button disabled>Your current plan</button>
                            </div>
                        </div>
                        <h4>Billing History</h4>
                        <table className="billing-history-table">
                            <thead><tr><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
                            <tbody>
                                <tr><td>July 15, 2024</td><td>$9.99</td><td>Paid</td></tr>
                                <tr><td>June 15, 2024</td><td>$9.99</td><td>Paid</td></tr>
                            </tbody>
                        </table>
                     </div>
                 )}
                {activeTab === 'Data & Privacy' && (
                     <div className="settings-card">
                        <h3>Data & Privacy</h3>
                        <div className="privacy-control">
                            <label htmlFor="shareData">Share Anonymized Data</label>
                            <div className="toggle-container">
                                <p className="placeholder-text">Help improve the app by sharing anonymized data for benchmarks in the Analytics section.</p>
                                <label className="toggle-switch">
                                    <input id="shareData" type="checkbox" checked={localSettings.privacy.shareAnonymizedData} onChange={() => handleNestedChange('privacy', 'shareAnonymizedData', !localSettings.privacy.shareAnonymizedData)} />
                                    <span className="slider"></span>
                                </label>
                            </div>
                        </div>
                         <div className="data-action">
                             <h4>Export My Data</h4>
                             <p className="placeholder-text">Download a JSON file of all your jobs, contacts, resumes, and settings from the server.</p>
                             <button onClick={handleExportData} className="button-secondary">Export Data</button>
                         </div>
                         <div className="data-action">
                             <h4>Delete Account</h4>
                             <p className="placeholder-text">Permanently delete your account and all associated data from the database. This action cannot be undone.</p>
                             <button onClick={handleDeleteAccount} className="button-delete-secondary">Delete All Data</button>
                         </div>
                     </div>
                 )}
            </div>
        </div>
    );
};

const AnalyticsView = ({ jobs, resumes }: { jobs: Job[], resumes: Resume[] }) => {

    const pipelineStats = React.useMemo(() => {
        const appliedStatuses: JobStatus[] = ['Applied', 'Screening', 'Interviewing', 'Test Task', 'Offer', 'Rejection'];
        const interviewStatuses: JobStatus[] = ['Interviewing', 'Test Task', 'Offer'];

        const appliedCount = jobs.filter(j => appliedStatuses.includes(j.status)).length;
        const interviewingCount = jobs.filter(j => interviewStatuses.includes(j.status)).length;
        const offerCount = jobs.filter(j => j.status === 'Offer').length;

        const appliedToInterviewRate = appliedCount > 0 ? (interviewingCount / appliedCount) : 0;
        const interviewToOfferRate = interviewingCount > 0 ? (offerCount / interviewingCount) : 0;

        return {
            appliedCount,
            interviewingCount,
            offerCount,
            appliedToInterviewRate,
            interviewToOfferRate
        };
    }, [jobs]);

    const weeklyActivity = React.useMemo(() => {
        const weeks = 8;
        const today = new Date();
        today.setHours(23, 59, 59, 999); // Ensure today is at the very end of the day for consistent comparisons

        const weeklyData: { week: string, count: number }[] = [];
        
        for (let i = 0; i < weeks; i++) {
            const endOfWeek = new Date(today);
            endOfWeek.setDate(today.getDate() - (i * 7));

            const startOfWeek = new Date(endOfWeek);
            startOfWeek.setDate(endOfWeek.getDate() - 6);
            startOfWeek.setHours(0, 0, 0, 0); // Set to the beginning of the day

            const count = jobs.filter(job => {
                if (!job.applicationDate) return false;
                // Parse the 'YYYY-MM-DD' string as local time to avoid timezone issues.
                // This creates a date at midnight in the user's local timezone.
                const appDate = new Date(job.applicationDate + 'T00:00:00');
                
                return appDate >= startOfWeek && appDate <= endOfWeek;
            }).length;

            weeklyData.push({
                week: `${startOfWeek.toLocaleDateString('default', { month: 'short', day: 'numeric' })}`,
                count: count
            });
        }
        return weeklyData.reverse();
    }, [jobs]);

    const resumePerformance = React.useMemo(() => {
        const performance = new Map<number, { name: string, applied: number, interviews: number }>();

        jobs.forEach(job => {
            if (job.selectedResumeId) {
                if (!performance.has(job.selectedResumeId)) {
                    const resume = resumes.find(r => r.id === job.selectedResumeId);
                    performance.set(job.selectedResumeId, { name: resume?.name || `Resume ID ${job.selectedResumeId}`, applied: 0, interviews: 0 });
                }
                const stats = performance.get(job.selectedResumeId)!;
                stats.applied += 1;
                if (['Interviewing', 'Test Task', 'Offer'].includes(job.status)) {
                    stats.interviews += 1;
                }
            }
        });

        return Array.from(performance.values())
            .map(p => ({ ...p, rate: p.applied > 0 ? p.interviews / p.applied : 0 }))
            .sort((a,b) => b.rate - a.rate);

    }, [jobs, resumes]);
    
     const sourceEffectiveness = React.useMemo(() => {
        const effectiveness = new Map<string, { applied: number, interviews: number }>();
        
        jobs.filter(j => j.source).forEach(job => {
            const source = job.source!;
            if (!effectiveness.has(source)) {
                effectiveness.set(source, { applied: 0, interviews: 0 });
            }
            const stats = effectiveness.get(source)!;
            stats.applied += 1;
            if (['Interviewing', 'Test Task', 'Offer'].includes(job.status)) {
                stats.interviews += 1;
            }
        });

        return Array.from(effectiveness.entries())
            .map(([source, data]) => ({ source, rate: data.applied > 0 ? data.interviews / data.applied : 0 }))
            .sort((a,b) => b.rate - a.rate);

    }, [jobs]);
    
    return (
        <div className="analytics-view">
            <h2>Analytics & Insights</h2>
            <div className="analytics-grid">
                <div className="analytics-widget">
                    <h3>Application Funnel</h3>
                    <div className="funnel-container">
                        <div className="funnel-stage">
                            <div className="funnel-value">{pipelineStats.appliedCount}</div>
                            <div className="funnel-label">Applied</div>
                        </div>
                        <div className="funnel-arrow">
                            <div className="funnel-rate">{(pipelineStats.appliedToInterviewRate * 100).toFixed(1)}%</div>
                            →
                        </div>
                        <div className="funnel-stage">
                            <div className="funnel-value">{pipelineStats.interviewingCount}</div>
                            <div className="funnel-label">Interviews</div>
                        </div>
                        <div className="funnel-arrow">
                            <div className="funnel-rate">{(pipelineStats.interviewToOfferRate * 100).toFixed(1)}%</div>
                             →
                        </div>
                        <div className="funnel-stage">
                            <div className="funnel-value">{pipelineStats.offerCount}</div>
                            <div className="funnel-label">Offers</div>
                        </div>
                    </div>
                </div>

                <div className="analytics-widget">
                    <h3>Weekly Activity (Last 8 Weeks)</h3>
                    <div className="bar-chart-vertical">
                         {weeklyActivity.map((week, i) => (
                             <div key={i} className="chart-bar-col">
                                 <div className="bar-wrapper">
                                     <div className="bar" style={{ height: `${(week.count / (Math.max(...weeklyActivity.map(w => w.count), 1))) * 100}%` }} title={`${week.count} applications`}></div>
                                 </div>
                                 <div className="bar-label">{week.week}</div>
                             </div>
                         ))}
                    </div>
                </div>

                <div className="analytics-widget">
                    <h3>Resume Performance</h3>
                    <div className="bar-chart-horizontal">
                        {resumePerformance.map(r => (
                            <div key={r.name} className="chart-bar-row">
                                <div className="bar-label">{r.name}</div>
                                <div className="bar-wrapper">
                                    <div className="bar-fill" style={{ width: `${r.rate * 100}%` }}>
                                        <span>{(r.rate * 100).toFixed(0)}%</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                         {resumePerformance.length === 0 && <p className="placeholder-text">Apply to jobs with a linked resume to see performance.</p>}
                    </div>
                </div>
                
                 <div className="analytics-widget">
                    <h3>Job Source Effectiveness</h3>
                    <div className="bar-chart-horizontal">
                       {sourceEffectiveness.map(s => (
                            <div key={s.source} className="chart-bar-row">
                                <div className="bar-label">{s.source}</div>
                                <div className="bar-wrapper">
                                    <div className="bar-fill" style={{ width: `${s.rate * 100}%` }}>
                                        <span>{(s.rate * 100).toFixed(0)}%</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {sourceEffectiveness.length === 0 && <p className="placeholder-text">Add sources to your jobs to see which are most effective.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};


const fileToGenerativePart = async (file: File) => {
    const base64EncodedDataPromise = new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });
    return {
      inlineData: {
        data: await base64EncodedDataPromise,
        mimeType: file.type
      }
    };
};

const App = () => {
    const [initialDataLoaded, setInitialDataLoaded] = useState(false);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [crmContacts, setCrmContacts] = useState<CrmContact[]>([]);
    const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
    const [resumes, setResumes] = useState<Resume[]>([]);
    const [settings, setSettings] = useState<Settings>(initialSettings);

    // --- API Data Loading ---
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Load prompts from files first
                const filePrompts = await loadPromptsFromFiles();
                
                // Fetch all data from API
                const [jobsData, resumesData, contactsData, eventsData, settingsData] = await Promise.all([
                    apiService.getJobs(),
                    apiService.getResumes(),
                    apiService.getContacts(),
                    apiService.getEvents(),
                    apiService.getSettings()
                ]);
                
                setJobs(jobsData || []);
                setResumes(resumesData || []);
                setCrmContacts(contactsData || []);
                setCalendarEvents(eventsData || []);
                
                // Merge file prompts with settings
                const mergedSettings = {
                    ...(settingsData || initialSettings),
                    prompts: {
                        ...(settingsData || initialSettings).prompts,
                        coverLetter: filePrompts.coverLetter,
                        resumeChecker: filePrompts.resumeChecker
                    }
                };
                
                setSettings(mergedSettings);
            } catch (error) {
                console.error('Failed to fetch data:', error);
                // Fallback to empty arrays if API is not available
                setJobs([]);
                setResumes([]);
                setCrmContacts([]);
                setCalendarEvents([]);
                setSettings(initialSettings);
            } finally {
                setInitialDataLoaded(true);
            }
        };

        fetchData();
    }, []);
    
    // --- General App State ---
    const [messages, setMessages] = useState<Message[]>([
        { sender: 'ai', text: "Hello! Use the tools above for specific tasks, or ask me a general question here." }
    ]);
    const [isLoadingChat, setIsLoadingChat] = useState(false);
    const [isAgentMixMode, setIsAgentMixMode] = useState(false);
    
    const [theme, setTheme] = useState<string>(() => {
        // This part can remain as it's UI state, not database state
        if (typeof window === 'undefined') return 'dark';
        const savedTheme = localStorage.getItem('jobTrackerTheme');
        if (savedTheme) return savedTheme;
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    });

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        localStorage.setItem('jobTrackerTheme', newTheme);
    };

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);
    
    // --- Modal States ---
    const [activeTab, setActiveTab] = useState<Tab>('Dashboard');
    const [editingJob, setEditingJob] = useState<Job | null>(null);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
    const [selectedEventDate, setSelectedEventDate] = useState<string | null>(null);

    // --- API-based CRUD Handlers ---

    // Jobs
    const handleAddJob = async (jobToAdd: Omit<Job, 'id'>) => {
        try {
            const newJob = await apiService.createJob(jobToAdd);
            setJobs(prev => [...prev, newJob]);
        } catch (error) { 
            console.error("Error adding job:", error); 
        }
    };
    
    const handleUpdateJob = async (updatedJob: Job) => {
        try {
            const savedJob = await apiService.updateJob(updatedJob);
            setJobs(prev => prev.map(j => j.id === savedJob.id ? savedJob : j));
            if (editingJob && editingJob.id === savedJob.id) {
                setEditingJob(null);
            }
        } catch (error) { 
            console.error("Error updating job:", error); 
        }
    };
    const handleDeleteJob = async (jobId: number) => {
        if (window.confirm(`Are you sure you want to delete this job? This action cannot be undone.`)) {
             try {
                await apiService.deleteJob(jobId);
                setJobs(prev => prev.filter(j => j.id !== jobId));
                setEditingJob(null);
            } catch (error) { 
                console.error("Error deleting job:", error); 
            }
        }
    };

    // Resumes
    const handleAddResume = async (resumeToAdd: Omit<Resume, 'id'>) => {
        try {
            const newResume = await apiService.createResume(resumeToAdd);
            setResumes(prev => [newResume, ...prev]);
        } catch (error) { 
            console.error("Error adding resume:", error); 
        }
    };
    
    const handleUpdateResume = async (updatedResume: Resume) => {
        try {
            const savedResume = await apiService.updateResume(updatedResume);
            setResumes(prev => prev.map(r => r.id === savedResume.id ? savedResume : r));
        } catch (error) { 
            console.error("Error updating resume:", error); 
        }
    };
    
    const handleDeleteResume = async (resumeId: number) => {
         try {
            await apiService.deleteResume(resumeId);
            setResumes(prev => prev.filter(r => r.id !== resumeId));
        } catch (error) { 
            console.error("Error deleting resume:", error); 
        }
    };

    // Contacts
    const handleAddContact = async (contactToAdd: Omit<CrmContact, 'id'>) => {
         try {
            const newContact = await apiService.createContact(contactToAdd);
            setCrmContacts(prev => [newContact, ...prev]);
        } catch (error) { 
            console.error("Error adding contact:", error); 
        }
    };
    
     const handleUpdateContact = async (updatedContact: CrmContact) => {
        try {
            const savedContact = await apiService.updateContact(updatedContact);
            setCrmContacts(prev => prev.map(c => c.id === savedContact.id ? savedContact : c));
        } catch (error) { 
            console.error("Error updating contact:", error); 
        }
    };
    
    const handleDeleteContact = async (contactId: number) => {
         try {
            await apiService.deleteContact(contactId);
            setCrmContacts(prev => prev.filter(c => c.id !== contactId));
        } catch (error) { 
            console.error("Error deleting contact:", error); 
        }
    };

        // Calendar Events
    const handleSaveEvent = async (eventToSave: CalendarEvent) => {
        const isUpdate = calendarEvents.some(e => e.id === eventToSave.id);
    
        try {
            let savedEvent;
            if (isUpdate) {
                savedEvent = await apiService.updateEvent(eventToSave);
            } else {
                savedEvent = await apiService.createEvent(eventToSave);
            }
    
            if (isUpdate) {
                setCalendarEvents(prev => prev.map(e => e.id === savedEvent.id ? savedEvent : e));
            } else {
                setCalendarEvents(prev => [...prev, savedEvent]);
            }
        } catch (error) {
            console.error('Error saving event:', error);
            // Optionally: show an error toast to the user
        } finally {
            setIsEventModalOpen(false);
            setEditingEvent(null);
            setSelectedEventDate(null);
        }
    };

    const handleDeleteEvent = async (eventId: number) => {
        if (window.confirm("Are you sure you want to delete this event?")) {
            try {
                await apiService.deleteEvent(eventId);
                setCalendarEvents(prev => prev.filter(e => e.id !== eventId));
            } catch (error) {
                console.error('Error deleting event:', error);
            } finally {
                setIsEventModalOpen(false);
                setEditingEvent(null);
                setSelectedEventDate(null);
            }
        }
    };

    // Settings
    const handleUpdateSettings = async (updatedSettings: Settings) => {
        try {
            const savedSettings = await apiService.updateSettings(updatedSettings);
            setSettings(savedSettings);
        } catch (error) {
            console.error('Error updating settings:', error);
        }
    };
    
    // --- Modal Open/Close Handlers ---
    const handleOpenJobModal = (job: Job) => setEditingJob(job);
    const handleCloseJobModal = () => setEditingJob(null);
    const handleDayClick = (date: string) => {
        setSelectedEventDate(date);
        setEditingEvent(null);
        setIsEventModalOpen(true);
    };
    const handleEventClick = (event: CalendarEvent) => {
        setSelectedEventDate(null);
        setEditingEvent(event);
        setIsEventModalOpen(true);
    };
    const handleCloseEventModal = () => {
        setIsEventModalOpen(false);
        setEditingEvent(null);
        setSelectedEventDate(null);
    };

    const handleSendMessage = async (userInput: string, file?: File) => {
        if (!userInput.trim() && !file || isLoadingChat) return;

        const userMessage: Message = { sender: 'user', text: userInput };
        if (file) {
            userMessage.fileName = file.name;
        }
        setMessages(prev => [...prev, userMessage]);
        setIsLoadingChat(true);

        const jobListForContext = jobs.map(j => `${j.title} at ${j.company} (Status: ${j.status})`).join(', ');
        const resumeListForContext = resumes.map(r => r.name).join(', ');
        const dataContext = `\n\n**USER'S DATA CONTEXT:**\n- **Tracked Jobs**: ${jobListForContext || 'None'}.\n- **Available Resumes**: ${resumeListForContext || 'None'}.`;

        let systemInstruction;

        if (isAgentMixMode) {
            const agentDescriptions = Object.values(settings.agents).map(agent => {
                const enabledTools = Object.entries(agent.tools)
                    .filter(([, tool]) => tool.enabled)
                    .map(([toolId]) => availableTools.find(t => t.id === toolId)?.name)
                    .filter(Boolean);
                
                return `\n- **${agent.name}**: ${agent.prompt} ${enabledTools.length > 0 ? `(Enabled Tools: ${enabledTools.join(', ')})` : ''}`;
            }).join('');
            systemInstruction = `${settings.prompts.mixAgents}\n${agentDescriptions}${dataContext}`;
        } else {
            const simpleAssistantPrompt = `You are a helpful AI assistant for a job seeker. Answer the user's question directly and concisely. You have access to the following context about the user's job search.`;
            systemInstruction = `${simpleAssistantPrompt}${dataContext}`;
        }
        
        try {
            let contents;
            if (file) {
                const filePart = await fileToGenerativePart(file);
                const textPart = { text: userInput };
                contents = { parts: [filePart, textPart] };
            } else {
                contents = userInput;
            }

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash", contents, config: { systemInstruction }
            });
            setMessages(prev => [...prev, { sender: 'ai', text: response.text }]);
        } catch (error) {
            console.error("Gemini API call failed:", error);
            setMessages(prev => [...prev, { sender: 'error', text: "Sorry, I encountered an error. Please try again." }]);
        } finally {
            setIsLoadingChat(false);
        }
    };

    if (!initialDataLoaded) {
        return <div className="loading-indicator" style={{height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem'}}><div className="spinner"></div><span>Loading application...</span></div>;
    }

    const renderContent = () => {
        switch (activeTab) {
            case 'Dashboard': return <DashboardView jobs={jobs} settings={settings} setSettings={handleUpdateSettings} onJobDoubleClick={handleOpenJobModal} />;
            case 'Job Tracker': return <JobsView jobs={jobs} onAddJob={handleAddJob} onUpdateJob={handleUpdateJob} onJobDoubleClick={handleOpenJobModal} />;
            case 'Calendar': return <CalendarView jobs={jobs} crmContacts={crmContacts} calendarEvents={calendarEvents} onJobClick={handleOpenJobModal} onDayClick={handleDayClick} onEventClick={handleEventClick} />;
            case 'Resumes': return <ResumesView resumes={resumes} onAddResume={handleAddResume} onDeleteResume={handleDeleteResume} onUpdateResume={handleUpdateResume} />;
            case 'Network': return <ContactsView crmContacts={crmContacts} onAddContact={handleAddContact} onDeleteContact={handleDeleteContact} onUpdateContact={handleUpdateContact} jobs={jobs} onJobClick={handleOpenJobModal} />;
            case 'AI Tools': return <AiToolsView jobs={jobs} resumes={resumes} crmContacts={crmContacts} settings={settings} messages={messages} isLoadingChat={isLoadingChat} onSendMessage={handleSendMessage} isAgentMixMode={isAgentMixMode} setIsAgentMixMode={setIsAgentMixMode} />;
            case 'Analytics': return <AnalyticsView jobs={jobs} resumes={resumes} />;
            case 'Preferences': return <SettingsView settings={settings} onUpdate={handleUpdateSettings} />;
            default: return <DashboardView jobs={jobs} settings={settings} setSettings={handleUpdateSettings} onJobDoubleClick={handleOpenJobModal} />;
        }
    };

    return (
        <div className="app-layout">
            <Navigation activeTab={activeTab} setActiveTab={setActiveTab} theme={theme} toggleTheme={toggleTheme} />
            <main className="main-content">
                {renderContent()}
            </main>
            {editingJob && (
                <JobDetailModal
                    job={editingJob}
                    crmContacts={crmContacts}
                    resumes={resumes}
                    settings={settings}
                    onSave={handleUpdateJob}
                    onCancel={handleCloseJobModal}
                    onDelete={handleDeleteJob}
                />
            )}
            {isEventModalOpen && (
                <EventModal
                    event={editingEvent}
                    date={selectedEventDate}
                    jobs={jobs}
                    crmContacts={crmContacts}
                    onSave={handleSaveEvent}
                    onCancel={handleCloseEventModal}
                    onDelete={handleDeleteEvent}
                />
            )}
        </div>
    );
};

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
}