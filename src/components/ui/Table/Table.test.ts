import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render } from '@testing-library/react';
import { Table } from './Table';

interface TestRow { id: number; name: string; }

const columns = [
  { key: 'id', header: 'ID', render: (row: TestRow) => row.id },
  { key: 'name', header: 'Name', render: (row: TestRow) => row.name },
];

test('Table renders headers', () => {
  const { container } = render(React.createElement(Table, {
    columns,
    data: [{ id: 1, name: 'Alice' }],
    keyExtractor: (row: TestRow) => row.id,
  }));
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  assert.equal(el.tagName, 'TABLE');
  const headers = el.querySelectorAll('th');
  assert.equal(headers.length, 2);
  assert.equal(headers[0].textContent, 'ID');
  assert.equal(headers[1].textContent, 'Name');
});

test('Table renders data rows', () => {
  const { container } = render(React.createElement(Table, {
    columns,
    data: [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ],
    keyExtractor: (row: TestRow) => row.id,
  }));
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  const rows = el.querySelectorAll('tbody tr');
  assert.equal(rows.length, 2);
  assert.equal(rows[0].textContent?.includes('Alice'), true);
  assert.equal(rows[1].textContent?.includes('Bob'), true);
});

test('Table renders default empty state when data is empty', () => {
  const { container } = render(React.createElement(Table, {
    columns,
    data: [],
    keyExtractor: (row: TestRow) => row.id,
  }));
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  const heading = el.querySelector('h3');
  assert.ok(heading, 'renders heading');
  assert.equal(heading.textContent, 'No data');
});

test('Table renders custom emptyState', () => {
  const customEmpty = React.createElement('div', null, 'Custom empty message');
  const { container } = render(React.createElement(Table, {
    columns,
    data: [],
    keyExtractor: (row: TestRow) => row.id,
    emptyState: customEmpty,
  }));
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  assert.equal(el.textContent, 'Custom empty message');
});
