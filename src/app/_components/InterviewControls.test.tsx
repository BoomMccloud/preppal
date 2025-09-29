
import { render, screen, fireEvent } from '@testing-library/react';
import { InterviewControls } from './InterviewControls';
import { vi, test, expect } from 'vitest';

test('renders buttons and handles clicks', () => {
  const onStart = vi.fn();
  const onEnd = vi.fn();

  render(<InterviewControls onStart={onStart} onEnd={onEnd} />);

  const startButton = screen.getByText('Start Interview');
  const endButton = screen.getByText('End Interview');

  expect(startButton).toBeInTheDocument();
  expect(endButton).toBeInTheDocument();

  fireEvent.click(startButton);
  expect(onStart).toHaveBeenCalledTimes(1);

  fireEvent.click(endButton);
  expect(onEnd).toHaveBeenCalledTimes(1);
});
