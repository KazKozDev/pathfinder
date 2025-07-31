import express from 'express';
import cors from 'cors';
import DatabaseManager from './database.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Initialize database
const db = new DatabaseManager();

// Helper function to parse JSON fields from database
const parseData = (data) => {
    if (Array.isArray(data)) {
        return data.map(item => parseData(item));
    }
    
    if (typeof data === 'object' && data !== null) {
        const parsed = {};
        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
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
};

// Jobs API endpoints
app.get('/api/jobs', (req, res) => {
    try {
        const jobs = db.getAllJobs();
        res.json(parseData(jobs));
    } catch (error) {
        console.error('Error fetching jobs:', error);
        res.status(500).json({ error: 'Failed to fetch jobs' });
    }
});

app.get('/api/jobs/:id', (req, res) => {
    try {
        const job = db.getJobById(parseInt(req.params.id));
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }
        res.json(parseData(job));
    } catch (error) {
        console.error('Error fetching job:', error);
        res.status(500).json({ error: 'Failed to fetch job' });
    }
});

app.post('/api/jobs', (req, res) => {
    try {
        const job = db.createJob(req.body);
        res.status(201).json(parseData(job));
    } catch (error) {
        console.error('Error creating job:', error);
        res.status(500).json({ error: 'Failed to create job' });
    }
});

app.put('/api/jobs/:id', (req, res) => {
    try {
        const job = { ...req.body, id: parseInt(req.params.id) };
        const updatedJob = db.updateJob(job);
        res.json(parseData(updatedJob));
    } catch (error) {
        console.error('Error updating job:', error);
        res.status(500).json({ error: 'Failed to update job' });
    }
});

app.delete('/api/jobs/:id', (req, res) => {
    try {
        db.deleteJob(parseInt(req.params.id));
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting job:', error);
        res.status(500).json({ error: 'Failed to delete job' });
    }
});

// Resumes API endpoints
app.get('/api/resumes', (req, res) => {
    try {
        const resumes = db.getAllResumes();
        res.json(parseData(resumes));
    } catch (error) {
        console.error('Error fetching resumes:', error);
        res.status(500).json({ error: 'Failed to fetch resumes' });
    }
});

app.get('/api/resumes/:id', (req, res) => {
    try {
        const resume = db.getResumeById(parseInt(req.params.id));
        if (!resume) {
            return res.status(404).json({ error: 'Resume not found' });
        }
        res.json(parseData(resume));
    } catch (error) {
        console.error('Error fetching resume:', error);
        res.status(500).json({ error: 'Failed to fetch resume' });
    }
});

app.post('/api/resumes', (req, res) => {
    try {
        const resume = db.createResume(req.body);
        res.status(201).json(parseData(resume));
    } catch (error) {
        console.error('Error creating resume:', error);
        res.status(500).json({ error: 'Failed to create resume' });
    }
});

app.put('/api/resumes/:id', (req, res) => {
    try {
        const resume = { ...req.body, id: parseInt(req.params.id) };
        const updatedResume = db.updateResume(resume);
        res.json(parseData(updatedResume));
    } catch (error) {
        console.error('Error updating resume:', error);
        res.status(500).json({ error: 'Failed to update resume' });
    }
});

app.delete('/api/resumes/:id', (req, res) => {
    try {
        db.deleteResume(parseInt(req.params.id));
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting resume:', error);
        res.status(500).json({ error: 'Failed to delete resume' });
    }
});

// Contacts API endpoints
app.get('/api/contacts', (req, res) => {
    try {
        const contacts = db.getAllContacts();
        res.json(parseData(contacts));
    } catch (error) {
        console.error('Error fetching contacts:', error);
        res.status(500).json({ error: 'Failed to fetch contacts' });
    }
});

app.get('/api/contacts/:id', (req, res) => {
    try {
        const contact = db.getContactById(parseInt(req.params.id));
        if (!contact) {
            return res.status(404).json({ error: 'Contact not found' });
        }
        res.json(parseData(contact));
    } catch (error) {
        console.error('Error fetching contact:', error);
        res.status(500).json({ error: 'Failed to fetch contact' });
    }
});

app.post('/api/contacts', (req, res) => {
    try {
        const contact = db.createContact(req.body);
        res.status(201).json(parseData(contact));
    } catch (error) {
        console.error('Error creating contact:', error);
        res.status(500).json({ error: 'Failed to create contact' });
    }
});

app.put('/api/contacts/:id', (req, res) => {
    try {
        const contact = { ...req.body, id: parseInt(req.params.id) };
        const updatedContact = db.updateContact(contact);
        res.json(parseData(updatedContact));
    } catch (error) {
        console.error('Error updating contact:', error);
        res.status(500).json({ error: 'Failed to update contact' });
    }
});

app.delete('/api/contacts/:id', (req, res) => {
    try {
        db.deleteContact(parseInt(req.params.id));
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting contact:', error);
        res.status(500).json({ error: 'Failed to delete contact' });
    }
});

// Calendar Events API endpoints
app.get('/api/events', (req, res) => {
    try {
        const events = db.getAllEvents();
        res.json(parseData(events));
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});

app.get('/api/events/:id', (req, res) => {
    try {
        const event = db.getEventById(parseInt(req.params.id));
        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }
        res.json(parseData(event));
    } catch (error) {
        console.error('Error fetching event:', error);
        res.status(500).json({ error: 'Failed to fetch event' });
    }
});

app.post('/api/events', (req, res) => {
    try {
        const event = db.createEvent(req.body);
        res.status(201).json(parseData(event));
    } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).json({ error: 'Failed to create event' });
    }
});

app.put('/api/events/:id', (req, res) => {
    try {
        const event = { ...req.body, id: parseInt(req.params.id) };
        const updatedEvent = db.updateEvent(event);
        res.json(parseData(updatedEvent));
    } catch (error) {
        console.error('Error updating event:', error);
        res.status(500).json({ error: 'Failed to update event' });
    }
});

app.delete('/api/events/:id', (req, res) => {
    try {
        db.deleteEvent(parseInt(req.params.id));
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({ error: 'Failed to delete event' });
    }
});

// Settings API endpoints
app.get('/api/settings', (req, res) => {
    try {
        const settings = db.getSettings();
        res.json(parseData(settings));
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

app.put('/api/settings', (req, res) => {
    try {
        const settings = db.updateSettings(req.body);
        res.json(parseData(settings));
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down server...');
    db.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('Shutting down server...');
    db.close();
    process.exit(0);
}); 