import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

// Simple test component for testing
const TestComponent = () => {
  return (
    <div>
      <h1>Pathfinder</h1>
      <main>Test Content</main>
    </div>
  );
};

describe('React Components', () => {
  it('should render a simple component', () => {
    render(<TestComponent />);
    expect(screen.getByText(/Pathfinder/i)).toBeInTheDocument();
  });

  it('should display the main title', () => {
    render(<TestComponent />);
    const titleElement = screen.getByText(/Pathfinder/i);
    expect(titleElement).toBeInTheDocument();
  });

  it('should have main content', () => {
    render(<TestComponent />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});
