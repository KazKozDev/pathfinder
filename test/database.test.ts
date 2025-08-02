import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock database functions
const mockDatabase = {
  jobs: [
    { id: 1, title: 'Developer', company: 'Tech Corp', status: 'Applied' },
    { id: 2, title: 'Designer', company: 'Design Inc', status: 'Interviewing' },
  ],
  resumes: [
    {
      id: 1,
      name: 'Resume 1',
      contact: { name: 'John Doe', email: 'john@example.com' },
    },
    {
      id: 2,
      name: 'Resume 2',
      contact: { name: 'Jane Smith', email: 'jane@example.com' },
    },
  ],
  contacts: [
    {
      id: 1,
      name: 'John Doe',
      company: 'Tech Corp',
      email: 'john@example.com',
    },
    {
      id: 2,
      name: 'Jane Smith',
      company: 'Design Inc',
      email: 'jane@example.com',
    },
  ],
};

// Mock database operations
const dbOperations = {
  getJobs: () => Promise.resolve(mockDatabase.jobs),
  getJob: (id: number) =>
    Promise.resolve(mockDatabase.jobs.find(job => job.id === id)),
  createJob: (job: any) => {
    const newJob = {
      ...job,
      id: Math.max(...mockDatabase.jobs.map(j => j.id)) + 1,
    };
    mockDatabase.jobs.push(newJob);
    return Promise.resolve(newJob);
  },
  updateJob: (id: number, updates: any) => {
    const jobIndex = mockDatabase.jobs.findIndex(job => job.id === id);
    if (jobIndex !== -1) {
      mockDatabase.jobs[jobIndex] = {
        ...mockDatabase.jobs[jobIndex],
        ...updates,
      };
      return Promise.resolve(mockDatabase.jobs[jobIndex]);
    }
    return Promise.reject(new Error('Job not found'));
  },
  deleteJob: (id: number) => {
    const jobIndex = mockDatabase.jobs.findIndex(job => job.id === id);
    if (jobIndex !== -1) {
      const deletedJob = mockDatabase.jobs.splice(jobIndex, 1)[0];
      return Promise.resolve(deletedJob);
    }
    return Promise.reject(new Error('Job not found'));
  },
  getResumes: () => Promise.resolve(mockDatabase.resumes),
  getContacts: () => Promise.resolve(mockDatabase.contacts),
};

describe('Database Operations', () => {
  beforeEach(() => {
    // Reset mock database to initial state
    mockDatabase.jobs = [
      { id: 1, title: 'Developer', company: 'Tech Corp', status: 'Applied' },
      {
        id: 2,
        title: 'Designer',
        company: 'Design Inc',
        status: 'Interviewing',
      },
    ];
    mockDatabase.resumes = [
      {
        id: 1,
        name: 'Resume 1',
        contact: { name: 'John Doe', email: 'john@example.com' },
      },
      {
        id: 2,
        name: 'Resume 2',
        contact: { name: 'Jane Smith', email: 'jane@example.com' },
      },
    ];
    mockDatabase.contacts = [
      {
        id: 1,
        name: 'John Doe',
        company: 'Tech Corp',
        email: 'john@example.com',
      },
      {
        id: 2,
        name: 'Jane Smith',
        company: 'Design Inc',
        email: 'jane@example.com',
      },
    ];
  });

  describe('Job Operations', () => {
    it('should retrieve all jobs', async () => {
      const jobs = await dbOperations.getJobs();
      expect(jobs).toHaveLength(2);
      expect(jobs[0].title).toBe('Developer');
      expect(jobs[1].title).toBe('Designer');
    });

    it('should retrieve a specific job', async () => {
      const job = await dbOperations.getJob(1);
      expect(job).toBeDefined();
      expect(job?.title).toBe('Developer');
      expect(job?.company).toBe('Tech Corp');
    });

    it('should return null for non-existent job', async () => {
      const job = await dbOperations.getJob(999);
      expect(job).toBeUndefined();
    });

    it('should create a new job', async () => {
      const newJob = {
        title: 'New Position',
        company: 'New Company',
        status: 'Applied',
      };

      const createdJob = await dbOperations.createJob(newJob);
      expect(createdJob.id).toBe(3);
      expect(createdJob.title).toBe('New Position');
      expect(mockDatabase.jobs).toHaveLength(3);
    });

    it('should update an existing job', async () => {
      const updates = { status: 'Offer' };
      const updatedJob = await dbOperations.updateJob(1, updates);

      expect(updatedJob.status).toBe('Offer');
      expect(updatedJob.title).toBe('Developer'); // Other fields unchanged
    });

    it('should throw error when updating non-existent job', async () => {
      const updates = { status: 'Offer' };

      await expect(dbOperations.updateJob(999, updates)).rejects.toThrow(
        'Job not found'
      );
    });

    it('should delete an existing job', async () => {
      const deletedJob = await dbOperations.deleteJob(1);

      expect(deletedJob.id).toBe(1);
      expect(mockDatabase.jobs).toHaveLength(1);
      expect(mockDatabase.jobs[0].id).toBe(2);
    });

    it('should throw error when deleting non-existent job', async () => {
      await expect(dbOperations.deleteJob(999)).rejects.toThrow(
        'Job not found'
      );
    });
  });

  describe('Resume Operations', () => {
    it('should retrieve all resumes', async () => {
      const resumes = await dbOperations.getResumes();
      expect(resumes).toHaveLength(2);
      expect(resumes[0].name).toBe('Resume 1');
      expect(resumes[1].name).toBe('Resume 2');
    });

    it('should have correct resume structure', async () => {
      const resumes = await dbOperations.getResumes();
      const resume = resumes[0];

      expect(resume).toHaveProperty('id');
      expect(resume).toHaveProperty('name');
      expect(resume).toHaveProperty('contact');
      expect(resume.contact).toHaveProperty('name');
      expect(resume.contact).toHaveProperty('email');
    });
  });

  describe('Contact Operations', () => {
    it('should retrieve all contacts', async () => {
      const contacts = await dbOperations.getContacts();
      expect(contacts).toHaveLength(2);
      expect(contacts[0].name).toBe('John Doe');
      expect(contacts[1].name).toBe('Jane Smith');
    });

    it('should have correct contact structure', async () => {
      const contacts = await dbOperations.getContacts();
      const contact = contacts[0];

      expect(contact).toHaveProperty('id');
      expect(contact).toHaveProperty('name');
      expect(contact).toHaveProperty('company');
      expect(contact).toHaveProperty('email');
    });
  });

  describe('Data Integrity', () => {
    it('should maintain data consistency across operations', async () => {
      // Create a job
      const newJob = await dbOperations.createJob({
        title: 'Test Job',
        company: 'Test Company',
        status: 'Applied',
      });

      // Verify it was created
      const retrievedJob = await dbOperations.getJob(newJob.id);
      expect(retrievedJob).toEqual(newJob);

      // Update it
      const updatedJob = await dbOperations.updateJob(newJob.id, {
        status: 'Interviewing',
      });
      expect(updatedJob.status).toBe('Interviewing');

      // Verify the update persisted
      const retrievedUpdatedJob = await dbOperations.getJob(newJob.id);
      expect(retrievedUpdatedJob?.status).toBe('Interviewing');

      // Delete it
      await dbOperations.deleteJob(newJob.id);

      // Verify it was deleted
      const deletedJob = await dbOperations.getJob(newJob.id);
      expect(deletedJob).toBeUndefined();
    });
  });
});
