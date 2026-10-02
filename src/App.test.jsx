import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from './App';

// Mock Supabase to prevent real network calls
vi.mock('./supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })
    }
  }
}));

describe('App Component', () => {
  it('renders the login screen initially when there is no session', async () => {
    render(<App />);
    
    // We expect "Login" or "Dispatch Board" to be rendered. 
    // In our Login.jsx, we have a "Dispatch Board" heading.
    const heading = await screen.findByText('Dispatch Board');
    expect(heading).toBeInTheDocument();
    
    // Check if Username label exists (from our recent changes)
    const usernameLabel = screen.getByText('Username');
    expect(usernameLabel).toBeInTheDocument();
  });
});
