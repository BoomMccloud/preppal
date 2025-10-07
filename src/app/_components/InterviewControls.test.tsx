
import { render, screen, fireEvent } from '@testing-library/react';
import { InterviewControls } from './InterviewControls';
import { vi, test, expect } from 'vitest';

test('renders buttons and handles clicks', () => {
  const onEndCall = vi.fn();
  const onToggleMute = vi.fn();

  render(
    <InterviewControls
      interviewId="test-123"
      onEndCall={onEndCall}
      onToggleMute={onToggleMute}
    />
  );

  // Get buttons by their roles
  const muteButton = screen.getByRole('button');
  const endCallLink = screen.getByRole('link');

  expect(muteButton).toBeInTheDocument();
  expect(endCallLink).toBeInTheDocument();
  expect(endCallLink).toHaveAttribute('href', '/interview/test-123/feedback');

  fireEvent.click(muteButton);
  expect(onToggleMute).toHaveBeenCalledTimes(1);

  fireEvent.click(endCallLink);
  expect(onEndCall).toHaveBeenCalledTimes(1);
});
