export function requiredText(value, field, max = 5000) {
  if (typeof value !== 'string' || !value.trim()) { const e = new Error(`${field} is required.`); e.status = 400; throw e; }
  if (value.trim().length > max) { const e = new Error(`${field} must be ${max} characters or fewer.`); e.status = 400; throw e; }
  return value.trim();
}
export function positiveId(value, field = 'id') {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) { const e = new Error(`${field} must be a positive integer.`); e.status = 400; throw e; }
  return n;
}
