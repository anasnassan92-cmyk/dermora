import type { Answers, Question, Questionnaire } from '../types/api';

/** Same rule as backend context_builder.is_visible – keep in sync. */
export function isVisible(question: Question, answers: Answers): boolean {
  const cond = question.show_if;
  if (!cond) return true;
  const value = answers[cond.question_id];
  if (cond.equals !== undefined && cond.equals !== null) return value === cond.equals;
  if (cond.includes !== undefined && cond.includes !== null) {
    return Array.isArray(value) && value.includes(cond.includes);
  }
  if (cond.gte !== undefined && cond.gte !== null) return typeof value === 'number' && value >= cond.gte;
  return true;
}

export function visibleQuestions(q: Questionnaire, answers: Answers): Question[] {
  return q.questions.filter((question) => isVisible(question, answers));
}

export function isAnswered(question: Question, answers: Answers): boolean {
  const v = answers[question.id];
  if (v === undefined || v === null || v === '') return false;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

export function missingRequired(q: Questionnaire, answers: Answers): Question[] {
  return visibleQuestions(q, answers).filter((question) => question.required !== false && !isAnswered(question, answers));
}

export function progress(q: Questionnaire, answers: Answers): number {
  const visible = visibleQuestions(q, answers);
  if (!visible.length) return 0;
  const done = visible.filter((question) => isAnswered(question, answers)).length;
  return done / visible.length;
}
