// @vitest-environment jsdom
import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert';
import { cleanup, render } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ReadinessChecklist } from '../../../src/components/setup/ReadinessChecklist';
import type { ReadinessResult } from '../../../src/lib/readiness';

afterEach(() => {
  cleanup();
});

describe('ReadinessChecklist Component', () => {
  const items: ReadinessResult[] = [
    {
      id: 'admin-claimed',
      label: 'Claim administrator account',
      applicable: true,
      completed: true,
      requiredForLaunch: true,
      destination: '/login',
    },
    {
      id: 'email-verified',
      label: 'Verify Mailjet credentials',
      applicable: true,
      completed: false,
      requiredForLaunch: true,
      destination: '/admin/settings',
    },
    {
      id: 'stripe-configured',
      label: 'Configure Stripe keys',
      applicable: false,
      completed: false,
      requiredForLaunch: false,
      destination: '/admin/settings',
    },
  ];

  it('renders only applicable items', () => {
    const { queryByText } = render(
      <BrowserRouter>
        <ReadinessChecklist items={items} />
      </BrowserRouter>
    );

    assert.ok(queryByText('Claim administrator account'));
    assert.ok(queryByText('Verify Mailjet credentials'));
    assert.ok(!queryByText('Configure Stripe keys'));
  });

  it('displays correct indicators for complete and incomplete items', () => {
    const { getByText } = render(
      <BrowserRouter>
        <ReadinessChecklist items={items} />
      </BrowserRouter>
    );

    assert.ok(getByText('Ready'));
    assert.ok(getByText('Configure'));
  });
});
