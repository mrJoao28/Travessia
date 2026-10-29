import test from 'node:test';
import assert from 'node:assert/strict';
import { canAccess, type Membership } from '../packages/contracts/src/access-policy.ts';

const memberships: Membership[] = [
  { userId: 'alice', classroomId: 'programacao', role: 'student' },
  { userId: 'bob', classroomId: 'programacao', role: 'student' },
  { userId: 'prof', classroomId: 'programacao', role: 'teacher' },
  { userId: 'prof', classroomId: 'matematica', role: 'student' },
  { userId: 'outro-prof', classroomId: 'matematica', role: 'teacher' }
];
const submission = { classroomId: 'programacao', ownerId: 'alice' };
test('nega acesso anônimo e vínculo ausente ou revogado', () => {
  assert.equal(canAccess(null, memberships, 'readSubmission', submission), false);
  assert.equal(canAccess({ id: 'alice' }, [], 'readSubmission', submission), false);
});
test('aluno acessa sua entrega e não a de outro aluno', () => {
  assert.equal(canAccess({ id: 'alice' }, memberships, 'readSubmission', submission), true);
  assert.equal(canAccess({ id: 'bob' }, memberships, 'readSubmission', submission), false);
});
test('docente acessa somente entregas de sua turma', () => {
  assert.equal(canAccess({ id: 'prof' }, memberships, 'readSubmission', submission), true);
  assert.equal(canAccess({ id: 'outro-prof' }, memberships, 'readSubmission', submission), false);
});
test('papel de professor não se propaga para outra turma', () => {
  assert.equal(canAccess({ id: 'prof' }, memberships, 'manageMission', { classroomId: 'matematica', ownerId: 'outro-prof' }), false);
  assert.equal(canAccess({ id: 'prof' }, memberships, 'manageMission', submission), true);
  assert.equal(canAccess({ id: 'alice' }, memberships, 'manageMission', submission), false);
});
test('aluno não envia trabalho em nome de outro usuário', () => {
  assert.equal(canAccess({ id: 'alice' }, memberships, 'submitWork', submission), true);
  assert.equal(canAccess({ id: 'bob' }, memberships, 'submitWork', submission), false);
});
test('relato só é compartilhado com docente por escolha explícita', () => {
  assert.equal(canAccess({ id: 'alice' }, memberships, 'readBarrier', submission), true);
  assert.equal(canAccess({ id: 'prof' }, memberships, 'readBarrier', submission), false);
  assert.equal(canAccess({ id: 'prof' }, memberships, 'readBarrier', { ...submission, sharedWithTeachers: true }), true);
  assert.equal(canAccess({ id: 'bob' }, memberships, 'readBarrier', { ...submission, sharedWithTeachers: true }), false);
});
