import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import App from './App';

test('renders the application shell', () => {
  render(<App />);

  expect(
    screen.getByRole('heading', { name: /d&d companion/i }),
  ).toBeInTheDocument();
});
