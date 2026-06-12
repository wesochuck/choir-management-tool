// @vitest-environment jsdom
import { describe, it, mock, afterEach } from 'node:test';
import assert from 'node:assert';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ChartCopyDropdown } from './ChartCopyDropdown';
import type { SeatingChart } from '../../services/seatingService';

function makeChart(overrides: Partial<SeatingChart> & { id: string }): SeatingChart {
  return {
    performance: 'perf-1',
    venue: 'venue-1',
    name: 'Test Chart',
    assignments: {},
    formationId: 'fmt-1',
    sortOrder: 0,
    layoutOverride: null,
    expand: {
      performance: { id: 'perf-1', title: 'Performance 1', date: '2026-01-01' },
    },
    ...overrides,
  } as unknown as SeatingChart;
}

function getTriggerButton(): HTMLElement {
  return screen.getByRole('button', { name: /copy/i });
}

const charts: SeatingChart[] = [
  makeChart({ id: '1', name: 'Main', performance: 'perf-1', sortOrder: 0, expand: { performance: { id: 'perf-1', title: 'Spring Concert', date: '2026-06-01' } } }),
  makeChart({ id: '2', name: 'Alt Layout', performance: 'perf-1', sortOrder: 1, expand: { performance: { id: 'perf-1', title: 'Spring Concert', date: '2026-06-01' } } }),
  makeChart({ id: '3', name: 'Main', performance: 'perf-2', sortOrder: 0, expand: { performance: { id: 'perf-2', title: 'Fall Fundraiser', date: '2026-10-01' } } }),
];

describe('ChartCopyDropdown', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders trigger with "Copy: Choose..."', () => {
    render(
      <ChartCopyDropdown
        allCharts={charts}
        currentChartId="1"
        onCopy={() => {}}
      />
    );
    const btn = getTriggerButton();
    assert.ok(btn.textContent?.includes('Copy:'));
    assert.ok(btn.textContent?.includes('Choose...'));
  });

  it('opens dropdown panel on trigger click', () => {
    render(
      <ChartCopyDropdown
        allCharts={charts}
        currentChartId="1"
        onCopy={() => {}}
      />
    );
    fireEvent.click(getTriggerButton());
    assert.ok(screen.getByText('Spring Concert'));
    assert.ok(screen.getByText('Fall Fundraiser'));
  });

  it('shows chart names indented under performance groups', () => {
    render(
      <ChartCopyDropdown
        allCharts={charts}
        currentChartId="1"
        onCopy={() => {}}
      />
    );
    fireEvent.click(getTriggerButton());
    const mainCharts = screen.getAllByText('Main');
    assert.strictEqual(mainCharts.length, 2);
    assert.ok(screen.getByText('Alt Layout'));
  });

  it('disables current active chart option', () => {
    render(
      <ChartCopyDropdown
        allCharts={charts}
        currentChartId="1"
        onCopy={() => {}}
      />
    );
    fireEvent.click(getTriggerButton());
    const disabledCharts = screen.getAllByText('Main').filter(el => el.closest('[data-disabled]'));
    assert.strictEqual(disabledCharts.length, 1);
  });

  it('does not fire onCopy when clicking the disabled current chart', () => {
    const onCopy = mock.fn();
    render(
      <ChartCopyDropdown
        allCharts={charts}
        currentChartId="1"
        onCopy={onCopy}
      />
    );
    fireEvent.click(getTriggerButton());
    const disabledChart = screen.getAllByText('Main').find(el => el.closest('[data-disabled]'));
    assert.ok(disabledChart);
    fireEvent.click(disabledChart!);
    assert.strictEqual(onCopy.mock.callCount(), 0);
  });

  it('calls onCopy with chart id when clicking a different chart', () => {
    const onCopy = mock.fn();
    render(
      <ChartCopyDropdown
        allCharts={charts}
        currentChartId="1"
        onCopy={onCopy}
      />
    );
    fireEvent.click(getTriggerButton());
    fireEvent.click(screen.getByText('Alt Layout'));
    assert.strictEqual(onCopy.mock.callCount(), 1);
    assert.deepStrictEqual(onCopy.mock.calls[0].arguments, ['2']);
  });

  it('closes dropdown on Escape key', () => {
    render(
      <ChartCopyDropdown
        allCharts={charts}
        currentChartId="1"
        onCopy={() => {}}
      />
    );
    fireEvent.click(getTriggerButton());
    assert.ok(screen.getByText('Spring Concert'));
    fireEvent.keyDown(document, { key: 'Escape' });
    assert.ok(!screen.queryByText('Spring Concert'));
  });

  it('closes dropdown on click outside', () => {
    render(
      <div>
        <span data-testid="outside">Outside</span>
        <ChartCopyDropdown
          allCharts={charts}
          currentChartId="1"
          onCopy={() => {}}
        />
      </div>
    );
    fireEvent.click(getTriggerButton());
    assert.ok(screen.getByText('Spring Concert'));
    fireEvent.mouseDown(screen.getByTestId('outside'));
    assert.ok(!screen.queryByText('Spring Concert'));
  });

  it('shows empty state when no charts are available to copy', () => {
    render(
      <ChartCopyDropdown
        allCharts={[]}
        currentChartId="1"
        onCopy={() => {}}
      />
    );
    fireEvent.click(getTriggerButton());
    assert.ok(screen.getByText(/no.*chart/i));
  });
});
