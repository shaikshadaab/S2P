import test from "node:test";
import assert from "node:assert/strict";
import { parsePageRange, formatPageRange } from "../dist/utils/page-range.js";

test("Page Range Parser - handles 'all'", () => {
  const result = parsePageRange("all", 5);
  assert.deepEqual(result, [1, 2, 3, 4, 5]);
});

test("Page Range Parser - handles blank as 'all'", () => {
  const result = parsePageRange("", 3);
  assert.deepEqual(result, [1, 2, 3]);
});

test("Page Range Parser - handles 'odd'", () => {
  const result = parsePageRange("odd", 6);
  assert.deepEqual(result, [1, 3, 5]);
});

test("Page Range Parser - handles 'even'", () => {
  const result = parsePageRange("even", 6);
  assert.deepEqual(result, [2, 4, 6]);
});

test("Page Range Parser - handles comma-separated and ranges", () => {
  const result = parsePageRange("1-3, 5, 8-10", 12);
  assert.deepEqual(result, [1, 2, 3, 5, 8, 9, 10]);
});

test("Page Range Parser - deduplicates and sorts", () => {
  const result = parsePageRange("5, 2, 2-4, 1", 10);
  assert.deepEqual(result, [1, 2, 3, 4, 5]);
});

test("Page Range Parser - throws on page exceeding total", () => {
  assert.throws(() => parsePageRange("15", 10), /exceeds total pages/);
});

test("Page Range Parser - throws on invalid range order", () => {
  assert.throws(() => parsePageRange("7-3", 10), /Range start cannot be greater/);
});

test("Format Page Range - formats continuous and disjoint pages", () => {
  assert.equal(formatPageRange([1, 2, 3, 5, 8, 9, 10]), "1-3, 5, 8-10");
  assert.equal(formatPageRange([1]), "1");
  assert.equal(formatPageRange([1, 2, 3]), "1-3");
});
