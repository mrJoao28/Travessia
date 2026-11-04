import assert from 'node:assert/strict';
import test from 'node:test';
import { geminiFailure } from '../apps/api/src/gemini-errors.ts';

test('classifica falhas Gemini sem retornar detalhes privados do provedor', () => {
  for (const [status, message, code] of [
    [400, 'API_KEY_INVALID', 'AI_CREDENTIALS'],
    [403, 'private credential', 'AI_CREDENTIALS'],
    [404, 'private model path', 'AI_MODEL'],
    [429, 'private quota payload', 'AI_PROVIDER_QUOTA'],
    [504, 'private request', 'AI_TIMEOUT'],
    [400, 'unsupported request', 'AI_FAILED'],
  ] as const) {
    const result = geminiFailure(Object.assign(new Error(message), { status }));
    assert.equal(result.code, code);
    assert.ok(!result.message.includes(message));
  }
  assert.equal(geminiFailure(new Error('socket closed'), true).code, 'AI_TIMEOUT');
});
