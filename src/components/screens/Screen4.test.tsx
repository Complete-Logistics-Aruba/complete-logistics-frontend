/* eslint-disable unicorn/filename-case */
/**
 * Screen 4: Empty Container Registration - Tests
 *
 * Tests for Story 4.0: Empty Container Registration
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { SnackbarProvider } from 'notistack';
import Screen4 from './Screen4';
import * as _wmsApi from '../../lib/api/wms-api';

// Mock wmsApi
vi.mock('../../lib/api/wms-api', () => ({
  default: {
    manifests: {
      create: vi.fn(),
    },
  },
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Screen 4: Empty Container Registration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderScreen = () => {
    return render(
      <BrowserRouter>
        <SnackbarProvider>
          <Screen4 />
        </SnackbarProvider>
      </BrowserRouter>
    );
  };

  it('should render form with container and seal fields', () => {
    renderScreen();
    
    expect(screen.getByLabelText(/Container Number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Seal Number/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Register Container/i })).toBeInTheDocument();
  });

  it('should display header', () => {
    renderScreen();
    
    expect(screen.getByText(/Register Empty Container/i)).toBeInTheDocument();
  });

  it('should have submit button disabled initially', () => {
    renderScreen();
    
    const submitButton = screen.getByRole('button', { name: /Register Container/i });
    expect(submitButton).not.toBeDisabled();
  });

  it('should display info alert', () => {
    renderScreen();
    
    expect(screen.getByText(/This container will be available for loading/i)).toBeInTheDocument();
  });
});
