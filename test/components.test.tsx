import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from '../index';

describe('App Component', () => {
  it('should render without crashing', () => {
    render(<App />);
    expect(screen.getByText(/Pathfinder/i)).toBeInTheDocument();
  });

  it('should display the main title', () => {
    render(<App />);
    const titleElement = screen.getByText(/Pathfinder/i);
    expect(titleElement).toBeInTheDocument();
  });

  it('should have navigation elements', () => {
    render(<App />);
    // Check for navigation elements (adjust based on your actual component structure)
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});
