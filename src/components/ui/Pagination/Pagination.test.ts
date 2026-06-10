import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost/',
});
globalThis.window = dom.window as unknown as Window & typeof globalThis;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, 'navigator', {
  value: dom.window.navigator,
});
(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { Pagination } from './Pagination';

test('Pagination returns null when totalPages <= 1', () => {
  const { container } = render(React.createElement(Pagination, {
    currentPage: 1, totalPages: 1, onPageChange: () => {},
  }));
  assert.equal(container.firstElementChild, null);
});

test('Pagination returns null when totalPages is 0', () => {
  const { container } = render(React.createElement(Pagination, {
    currentPage: 1, totalPages: 0, onPageChange: () => {},
  }));
  assert.equal(container.firstElementChild, null);
});

test('Pagination renders for 5 pages', () => {
  const { container } = render(React.createElement(Pagination, {
    currentPage: 1, totalPages: 5, onPageChange: () => {},
  }));
  const nav = container.firstElementChild;
  assert.ok(nav, 'renders nav element');
  const buttons = nav.querySelectorAll('button');
  assert.equal(buttons.length, 9, 'should have first, prev, 5 numbered, next, last = 9');
  const pageButtons = nav.querySelectorAll('button[aria-label^="Go to page"]');
  assert.equal(pageButtons.length, 5, 'should have 5 page number buttons');
});

test('Pagination calls onPageChange on page click', () => {
  let calledPage = 0;
  const handleChange = (page: number) => { calledPage = page; };
  const { container } = render(React.createElement(Pagination, {
    currentPage: 1, totalPages: 5, onPageChange: handleChange,
  }));
  const page2Btn = container.querySelector('[aria-label="Go to page 2"]');
  assert.ok(page2Btn, 'page 2 button exists');
  fireEvent.click(page2Btn);
  assert.equal(calledPage, 2, 'onPageChange called with page 2');
});

test('Pagination first/previous buttons disabled on page 1', () => {
  const { container } = render(React.createElement(Pagination, {
    currentPage: 1, totalPages: 5, onPageChange: () => {},
  }));
  const firstBtn = container.querySelector('[aria-label="Go to first page"]');
  const prevBtn = container.querySelector('[aria-label="Go to previous page"]');
  assert.ok(firstBtn, 'first page button exists');
  assert.ok(prevBtn, 'previous page button exists');
  assert.equal((firstBtn as HTMLButtonElement).disabled, true);
  assert.equal((prevBtn as HTMLButtonElement).disabled, true);
});

test('Pagination next/last buttons disabled on last page', () => {
  const { container } = render(React.createElement(Pagination, {
    currentPage: 5, totalPages: 5, onPageChange: () => {},
  }));
  const nextBtn = container.querySelector('[aria-label="Go to next page"]');
  const lastBtn = container.querySelector('[aria-label="Go to last page"]');
  assert.ok(nextBtn, 'next page button exists');
  assert.ok(lastBtn, 'last page button exists');
  assert.equal((nextBtn as HTMLButtonElement).disabled, true);
  assert.equal((lastBtn as HTMLButtonElement).disabled, true);
});
