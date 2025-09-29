
import { render, screen } from '@testing-library/react';
import { type TranscriptEntry, TranscriptDisplay } from './TranscriptDisplay';
import { test, expect } from 'vitest';

const mockEntries: TranscriptEntry[] = [
  { speaker: 'USER', content: 'Hello, this is a test.' },
  { speaker: 'AI', content: 'I am the AI. I hear you.' },
  { speaker: 'USER', content: 'This is another test from the user.' },
];

test('renders a list of transcript entries', () => {
  render(<TranscriptDisplay entries={mockEntries} />);

  // Check that the content is rendered
  expect(screen.getByText('Hello, this is a test.')).toBeInTheDocument();
  expect(screen.getByText('I am the AI. I hear you.')).toBeInTheDocument();
  expect(screen.getByText('This is another test from the user.')).toBeInTheDocument();

  // Check that speakers are identified
  const userEntries = screen.getAllByText(/USER:/);
  const aiEntries = screen.getAllByText(/AI:/);

  expect(userEntries).toHaveLength(2);
  expect(aiEntries).toHaveLength(1);
});

test('renders nothing for empty entries', () => {
  const { container } = render(<TranscriptDisplay entries={[]} />);
  expect(container).toBeEmptyDOMElement();
});
