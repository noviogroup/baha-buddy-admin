import { describe, expect, test, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const testState = vi.hoisted(() => ({
  reload: vi.fn(),
  apiFetch: vi.fn(),
  useApi: vi.fn(),
}));

vi.mock('@/lib/use-api', () => ({
  useApi: (...args: unknown[]) => testState.useApi(...args),
}));

vi.mock('@/lib/api-client', () => ({
  apiFetch: (...args: unknown[]) => testState.apiFetch(...args),
}));

import { LaunchReadinessModule } from '@/components/launch-readiness-module';

beforeEach(() => {
  vi.clearAllMocks();
  testState.reload.mockResolvedValue(undefined);
  testState.apiFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
  testState.useApi.mockReturnValue({
    data: {
      tasks: [
        task({ id: 'task-approval', title: 'Approve booking failure states', status: 'needs_approval', priority: 'p0', owner: 'CPO / QA', workstream: 'Bookings' }),
        task({ id: 'task-progress', title: 'Verify account upgrade', status: 'in_progress', priority: 'p1', owner: 'Engineering', workstream: 'Identity' }),
      ],
      summary: {
        total: 2,
        openP0: 1,
        needsApproval: 1,
        approved: 0,
        blocked: 0,
        completionRate: 0,
        byStatus: { todo: 0, in_progress: 1, needs_approval: 1, approved: 0, blocked: 0, done: 0 },
        byPriority: { p0: 1, p1: 1, p2: 0, p3: 0 },
      },
      workstreams: ['Bookings', 'Identity'],
    },
    loading: false,
    error: null,
    reload: testState.reload,
  });
});

describe('<LaunchReadinessModule />', () => {
  test('renders launch gates, task columns, and readiness summary', () => {
    render(<LaunchReadinessModule />);

    expect(screen.getByRole('heading', { name: /launch readiness/i })).toBeInTheDocument();
    expect(screen.getByText('Open P0')).toBeInTheDocument();
    expect(screen.getByText('Approve booking failure states')).toBeInTheDocument();
    expect(screen.getByText('Verify account upgrade')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /needs approval/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /in progress/i })).toBeInTheDocument();
  });

  test('approves a task through the API and reloads board data', async () => {
    const user = userEvent.setup();
    render(<LaunchReadinessModule />);

    await user.click(screen.getByRole('button', { name: /approve/i }));

    await waitFor(() => {
      expect(testState.apiFetch).toHaveBeenCalledWith('/api/launch-readiness', {
        method: 'PATCH',
        body: JSON.stringify({ id: 'task-approval', status: 'approved' }),
      });
    });
    expect(testState.reload).toHaveBeenCalled();
  });
});

function task(overrides: Record<string, unknown> = {}) {
  return {
    id: 'task',
    source_key: null,
    title: 'Launch task',
    description: 'Task description',
    workstream: 'Operations',
    priority: 'p1',
    status: 'todo',
    owner: null,
    approver_email: null,
    approved_at: null,
    due_date: null,
    scenario_ref: 'P0 #1',
    source_doc_path: 'docs/2026-06-19-USER-SCENARIO-COVERAGE-PLAN.md',
    evidence_url: null,
    notes: null,
    sort_order: 0,
    created_by: null,
    updated_by: null,
    created_at: '2026-06-19T00:00:00Z',
    updated_at: '2026-06-19T00:00:00Z',
    ...overrides,
  };
}
