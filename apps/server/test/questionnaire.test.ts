/** Unit tests for the questionnaire rules: conditional questions and answer validation. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { isVisible, loadQuestionnaire, validateAnswers } from '../src/services/questionnaire.js';

const q = loadQuestionnaire();
const byId = (id: string) => q.questions.find((x) => x.id === id)!;

const GOOD = {
  skin_type: 'combination',
  concerns: ['acne', 'dark_spots'],
  acne_frequency: 'often',
  acne_area: ['forehead', 'chin'],
  acne_type: ['whiteheads', 'papules'],
  sensitive: 'sometimes',
  duration: '1_6m',
  sudden_change: false,
  current_routine: ['cleanser'],
  goal: 'fewer_breakouts',
};

test('the questionnaire loads with a version and questions', () => {
  assert.equal(q.version, '1.0.0');
  assert.ok(q.questions.length > 5);
});

test('acne follow-up questions are only visible when "acne" is a concern', () => {
  assert.equal(isVisible(byId('acne_frequency'), { concerns: ['acne'] }), true);
  assert.equal(isVisible(byId('acne_frequency'), { concerns: ['redness'] }), false);
  assert.equal(isVisible(byId('acne_frequency'), {}), false);
  // A question without show_if is always visible.
  assert.equal(isVisible(byId('skin_type'), {}), true);
});

test('complete answers validate without errors', () => {
  assert.deepEqual(validateAnswers(q, GOOD), []);
});

test('missing required answers and wrong values are reported', () => {
  assert.ok(validateAnswers(q, {}).length > 0);
  const wrongType = validateAnswers(q, { ...GOOD, skin_type: 'banana' });
  assert.ok(wrongType.some((error) => error.includes('Ogiltigt svar')));
  const wrongBool = validateAnswers(q, { ...GOOD, sudden_change: 'nej' });
  assert.ok(wrongBool.length > 0);
});
