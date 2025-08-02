import { describe, it, expect } from 'vitest';

// Mock functions that would normally be imported
const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const calculateDaysBetween = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const generateId = (): number => {
  return Math.floor(Math.random() * 1000000);
};

describe('Utility Functions', () => {
  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2025-01-15');
      const result = formatDate(date);
      expect(result).toBe('2025-01-15');
    });

    it('should handle different date formats', () => {
      const date = new Date('2025-12-31T10:30:00Z');
      const result = formatDate(date);
      expect(result).toBe('2025-12-31');
    });
  });

  describe('calculateDaysBetween', () => {
    it('should calculate days between two dates', () => {
      const result = calculateDaysBetween('2025-01-01', '2025-01-10');
      expect(result).toBe(9);
    });

    it('should handle same date', () => {
      const result = calculateDaysBetween('2025-01-01', '2025-01-01');
      expect(result).toBe(0);
    });

    it('should handle reverse dates', () => {
      const result = calculateDaysBetween('2025-01-10', '2025-01-01');
      expect(result).toBe(9);
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
      expect(validateEmail('test+tag@example.org')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('test@example')).toBe(false);
    });
  });

  describe('generateId', () => {
    it('should generate a number', () => {
      const id = generateId();
      expect(typeof id).toBe('number');
      expect(id).toBeGreaterThanOrEqual(0);
      expect(id).toBeLessThan(1000000);
    });

    it('should generate different IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });
  });
});
