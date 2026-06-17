// @vitest-environment jsdom
import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, screen, act } from '@testing-library/react';

import { DataTable } from '../src/components/ui/DataTable/DataTable';
import type { ColumnDef } from '../src/components/ui/DataTable/types';

interface TestItem {
  id: string;
  name: string;
  email: string;
  role: string;
}

const sampleData: TestItem[] = [
  { id: '1', name: 'Alice', email: 'alice@test.com', role: 'Singer' },
  { id: '2', name: 'Bob', email: 'bob@test.com', role: 'Admin' },
  { id: '3', name: 'Charlie', email: 'charlie@test.com', role: 'Singer' },
  { id: '4', name: 'Diana', email: 'diana@test.com', role: 'Patron' },
  { id: '5', name: 'Eve', email: 'eve@test.com', role: 'Singer' },
];

const columns: ColumnDef<TestItem>[] = [
  {
    id: 'name',
    header: 'Name',
    accessorKey: 'name',
    cardSection: 0,
    cardSide: 'left',
  },
  {
    id: 'role',
    header: 'Role',
    accessorKey: 'role',
    cardSection: 0,
    cardSide: 'right',
  },
  {
    id: 'email',
    header: 'Email',
    accessorKey: 'email',
    cardSection: 1,
    cardSide: 'left',
    cardLabel: 'Email:',
  },
];

function renderTable(props: Partial<React.ComponentProps<typeof DataTable<TestItem>>> = {}) {
  return render(
    <DataTable
      columns={columns}
      data={sampleData}
      isLoading={false}
      emptyState={{
        title: 'No Items',
        description: 'No items found.',
        icon: '📦',
      }}
      {...props}
    />,
  );
}

describe('DataTable', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders desktop table with correct column headers', () => {
    renderTable();
    const table = document.querySelector('table');
    assert.ok(table, 'should render a <table> element');

    const headers = table!.querySelectorAll('th');
    assert.equal(headers.length, 3);
    assert.equal(headers[0]!.textContent!.trim(), 'Name');
    assert.equal(headers[1]!.textContent!.trim(), 'Role');
    assert.equal(headers[2]!.textContent!.trim(), 'Email');
  });

  it('renders mobile cards with correct section/side layout', () => {
    renderTable();

    const mobileContainer = document.querySelector('[class*="md:hidden"]');
    assert.ok(mobileContainer, 'should render mobile container');

    const cards = mobileContainer!.querySelectorAll(':scope > div');
    assert.equal(cards.length, 5, 'should render one card per row');

    const firstCard = cards[0]!;
    assert.ok(firstCard.textContent!.includes('Alice'), 'should show name in first card');
    assert.ok(firstCard.textContent!.includes('Singer'), 'should show role in first card');
    assert.ok(firstCard.textContent!.includes('alice@test.com'), 'should show email in first card');
    assert.ok(firstCard.textContent!.includes('Email:'), 'should show email label in first card');
  });

  it('shows loading spinner when isLoading is true', () => {
    renderTable({ isLoading: true, data: [] });

    const loadingText = screen.getByText('Loading...');
    assert.ok(loadingText, 'should show loading text');

    const table = document.querySelector('table');
    assert.equal(table, null, 'should not render table while loading');
  });

  it('shows empty state when data is empty', () => {
    renderTable({ data: [] });

    assert.ok(screen.getByText('No Items'), 'should show empty state title');
    assert.ok(screen.getByText('No items found.'), 'should show empty state description');

    const table = document.querySelector('table');
    assert.equal(table, null, 'should not render table when empty');
  });

  it('selection: checkbox toggles and calls onSelectionChange', () => {
    const onSelectionChange = (() => {}) as (ids: Set<string>) => void;
    const calls: Set<string>[] = [];
    const spy = (ids: Set<string>) => {
      calls.push(ids);
    };

    renderTable({ enableSelection: true, onSelectionChange: spy });

    const checkboxes = document.querySelectorAll<HTMLInputElement>(
      'input[type="checkbox"]',
    );
    assert.equal(checkboxes.length >= 6, true, 'should render checkboxes (select-all + 5 rows)');

    act(() => { checkboxes[1]!.click(); });
    assert.equal(calls.length, 1, 'should call onSelectionChange after first click');
    assert.equal(calls[0]!.size, 1, 'should have 1 selected id');

    act(() => { checkboxes[1]!.click(); });
    assert.equal(calls.length, 2, 'should call onSelectionChange after second click');
    assert.equal(calls[1]!.size, 0, 'should have 0 selected ids after uncheck');
  });

  it('selection: select-all toggles all rows', () => {
    const calls: Set<string>[] = [];
    const spy = (ids: Set<string>) => {
      calls.push(ids);
    };

    renderTable({ enableSelection: true, onSelectionChange: spy });

    const checkboxes = document.querySelectorAll<HTMLInputElement>(
      'input[type="checkbox"]',
    );
    const selectAll = checkboxes[0]!;

    act(() => { selectAll.click(); });
    assert.equal(calls.length, 1, 'should call onSelectionChange');
    assert.equal(calls[0]!.size, 5, 'should select all 5 rows');

    act(() => { selectAll.click(); });
    assert.equal(calls[1]!.size, 0, 'should deselect all');
  });

  it('sort: clicking a sortable header toggles sort direction', () => {
    renderTable();

    const nameHeader = screen.getByText('Name');
    assert.ok(nameHeader, 'should find Name header');

    const th = nameHeader.closest('th');
    assert.ok(th, 'should find th element');

    assert.equal(th!.className.includes('cursor-pointer'), true,
      'sortable header should have cursor-pointer');

    act(() => { th!.click(); });
    const sortedSpan = th!.querySelector('.text-primary');
    assert.ok(sortedSpan, 'sort indicator should appear after click');
    assert.equal(sortedSpan!.textContent, '\u25B2', 'first click should sort ascending');

    act(() => { th!.click(); });
    assert.equal(sortedSpan!.textContent, '\u25BC', 'second click should sort descending');
  });

  it('sort: disabled sorting column does not add sort indicator', () => {
    const noSortColumns: ColumnDef<TestItem>[] = [
      {
        id: 'name',
        header: 'Name',
        accessorKey: 'name',
        enableSorting: false,
        cardSection: 0,
        cardSide: 'left',
      },
    ];

    renderTable({ columns: noSortColumns });

    const nameHeader = screen.getByText('Name');
    const th = nameHeader.closest('th');
    assert.ok(th);
    assert.equal(th!.className.includes('cursor-pointer'), false, 'non-sortable header should not have cursor-pointer');
  });

  it('row click: fires onRowClick, checkbox click does not', () => {
    const rowCalls: TestItem[] = [];
    const onRowClick = (row: TestItem) => {
      rowCalls.push(row);
    };

    renderTable({ onRowClick });

    const rows = document.querySelectorAll('tbody > tr');
    assert.equal(rows.length, 5);

    rows[0]!.click();
    assert.equal(rowCalls.length, 1, 'should fire onRowClick on row click');
    assert.equal(rowCalls[0]!.name, 'Alice');
  });

  it('pagination: renders prev/next when pageCount > 1', () => {
    renderTable({ pageSize: 2 });

    const prevBtn = screen.queryByText('Prev');
    const nextBtn = screen.queryByText('Next');
    assert.ok(prevBtn, 'should render Prev button');
    assert.ok(nextBtn, 'should render Next button');

    assert.equal(
      prevBtn!.hasAttribute('disabled'),
      true,
      'Prev should be disabled on first page',
    );
    assert.equal(
      nextBtn!.hasAttribute('disabled'),
      false,
      'Next should be enabled when there are more pages',
    );
  });

  it('pagination: hidden when pageCount <= 1', () => {
    const { container } = renderTable({ pageSize: 20 });

    const prevBtn = container.querySelector('nav');
    assert.equal(prevBtn, null, 'pagination nav should not be rendered when pageCount <= 1');
  });

  it('renderMobileCard overrides default card', () => {
    const renderMobileCard = (row: TestItem) => (
      <div data-testid={`custom-card-${row.id}`}>
        Custom: {row.name} - {row.role}
      </div>
    );

    renderTable({ renderMobileCard });

    const customCards = document.querySelectorAll('[data-testid^="custom-card-"]');
    assert.equal(customCards.length, 5, 'should render 5 custom cards');

    const firstCard = customCards[0]!;
    assert.ok(firstCard.textContent!.includes('Custom: Alice - Singer'));
  });

  it('column hiding: hideBelow adds hidden class', () => {
    const hideColumns: ColumnDef<TestItem>[] = [
      {
        id: 'name',
        header: 'Name',
        accessorKey: 'name',
        cardSection: 0,
        cardSide: 'left',
      },
      {
        id: 'email',
        header: 'Email',
        accessorKey: 'email',
        hideBelow: 'sm',
        cardSection: 1,
        cardSide: 'left',
      },
    ];

    renderTable({ columns: hideColumns });

    const ths = document.querySelectorAll('th');
    assert.equal(ths.length, 2);

    const emailTh = ths[1]!;
    assert.ok(emailTh.className.includes('hidden'), 'email th should have hidden class');
    assert.ok(emailTh.className.includes('sm:table-cell'), 'email th should have sm:table-cell class');
  });

  it('renders correct number of data rows', () => {
    renderTable();
    const rows = document.querySelectorAll('tbody > tr');
    assert.equal(rows.length, 5);
  });

  it('stops propagation when clicking checkbox inside a row with onRowClick', () => {
    const rowCalls: TestItem[] = [];
    const selCalls: Set<string>[] = [];

    renderTable({
      enableSelection: true,
      onRowClick: (row) => { rowCalls.push(row); },
      onSelectionChange: (ids) => { selCalls.push(ids); },
    });

    const checkboxes = document.querySelectorAll<HTMLInputElement>(
      'tbody input[type="checkbox"]',
    );
    assert.equal(checkboxes.length, 5);

    // Click a checkbox
    act(() => { checkboxes[0]!.click(); });

    // Row click should NOT have fired
    assert.equal(rowCalls.length, 0, 'onRowClick should not fire when clicking checkbox');
    assert.equal(selCalls.length, 1, 'onSelectionChange should fire when clicking checkbox');
    // TanStack uses index-based row IDs
    assert.equal(selCalls[0]!.has('0'), true, 'should select first row by index');
  });

  it('renders selection actions when items are selected', () => {
    renderTable({
      enableSelection: true,
      onSelectionChange: () => {},
      renderSelectionActions: ({ selectedCount }) => (
        <span>Action for {selectedCount}</span>
      ),
    });

    // Initially no selection actions
    assert.equal(screen.queryByText(/Action for/), null);

    // Select one row
    const checkboxes = document.querySelectorAll<HTMLInputElement>(
      'input[type="checkbox"]',
    );
    act(() => { checkboxes[1]!.click(); });

    assert.ok(screen.getByText('Action for 1'), 'should show selection actions');
    assert.ok(screen.getByText('1 selected'), 'should show selection count');
  });
});
