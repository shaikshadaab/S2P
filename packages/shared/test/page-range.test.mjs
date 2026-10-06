import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePageRange, formatPageRange } from '../dist/utils/page-range.js';

test('Page Range Parser - handles "all" and default empty', () => {
  assert.deepEqual(parsePageRange('all', 5), [1, 2, 3, 4, 5]);
  assert.deepEqual(parsePageRange('', 4), [1, 2, 3, 4]);
  assert.deepEqual(parsePageRange('   ', 3), [1, 2, 3]);
});

test('Page Range Parser - handles "odd" and "even"', () => {
  assert.deepEqual(parsePageRange('odd', 6), [1, 3, 5]);
  assert.deepEqual(parsePageRange('even', 6), [2, 4, 6]);
});

test('Page Range Parser - parses comma-separated and hyphen ranges', () => {
  assert.deepEqual(parsePageRange('1, 3, 5-7', 10), [1, 3, 5, 6, 7]);
  assert.deepEqual(parsePageRange('1-3, 8-10', 10), [1, 2, 3, 8, 9, 10]);
});

test('Page Range Parser - deduplicates and sorts', () => {
  assert.deepEqual(parsePageRange('5, 1, 3, 1-3', 10), [1, 2, 3, 5]);
});

test('Page Range Parser - validates out of bounds', () => {
  assert.throws(() => parsePageRange('12', 10), /exceeds total/);
  assert.throws(() => parsePageRange('1-15', 10), /exceeds total/);
  assert.throws(() => parsePageRange('5-2', 10), /Invalid page range/);
});

test('Page Range Formatter - formats cleanly', () => {
  assert.equal(formatPageRange([1, 2, 3, 4, 5]), '1-5');
  assert.equal(formatPageRange([1, 3, 5]), '1, 3, 5');
  assert.equal(formatPageRange([1, 2, 3, 7, 8, 9]), '1-3, 7-9');
  assert.equal(formatPageRange([]), 'None');
});
