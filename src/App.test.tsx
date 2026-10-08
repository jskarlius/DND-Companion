import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test } from 'vitest';
import App from './App';

afterEach(cleanup);

test('renders the application shell', () => {
  render(<App />);

  expect(
    screen.getByRole('heading', { name: /ariel thorne/i }),
  ).toBeInTheDocument();
});

test('applies and remembers an explicitly selected dark theme', () => {
  window.localStorage.setItem('dnd-companion-theme', 'light');
  render(<App />);

  userEvent.click(screen.getByRole('button', { name: 'Use dark theme' }));
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  expect(window.localStorage.getItem('dnd-companion-theme')).toBe('dark');
  expect(screen.getByRole('button', { name: 'Use light theme' })).toBeInTheDocument();
});
