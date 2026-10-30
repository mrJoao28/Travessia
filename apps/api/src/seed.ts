import type { PrismaClient, Prisma } from '@prisma/client';
import { z } from 'zod';
import { createAuth } from './auth.js';
import type { Config } from './config.js';
import { createVersion } from './product.service.js';
import { serial } from './database.js';

export function assertDemoDatabase(config: Config, env = process.env) {
  if (!config.demo || env.DEMO_DATABASE_NAME !== decodeURIComponent(new URL(env.DATABASE_URL!).pathname.slice(1))) {
    throw new Error('Seed exige banco dedicado identificado por DEMO_DATABASE_NAME e isolamento demo.');
  }
}

export async function seedDemo(db: PrismaClient, config: Config, options: { rotatePassword?: boolean } = {}) {
  assertDemoDatabase(config);
  const email = z.email().parse(process.env.DEMO_USER_EMAIL).toLowerCase();
  const password = z.string().min(5).max(128).parse(process.env.DEMO_USER_PASSWORD);
  const ctx = await createAuth(db, config).$context;
  // Better Auth owns hashing and credential creation. No private values are logged.
  const passwordHash = await ctx.password.hash(password);
  return db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(76483219)`;
    const existingDataset = await tx.demoDataset.findUnique({ where: { id: 'travessia-demo-v1' } });
    const nonDemo = await tx.user.count({ where: { AND: [{ id: { not: { startsWith: 'demo-' } } }, ...(existingDataset?.userId ? [{ id: { not: existingDataset.userId } }] : [])] } });
    if (nonDemo) throw new Error('Banco contém contas fora do dataset demo. Seed recusado.');
    const dataset = await tx.demoDataset.upsert({ where: { id: 'travessia-demo-v1' }, create: { id: 'travessia-demo-v1' }, update: {} });
    let userId = dataset.userId;
    if (!userId) {
      if (await tx.user.findUnique({ where: { email } })) throw new Error('Conta existente não pertence ao dataset.');
      const internal = (await createAuth(tx as PrismaClient, config).$context).internalAdapter;
      const user = await internal.createUser({ name: 'Joao Felipe', email, emailVerified: true }, { method: 'admin' });
      userId = user.id;
      await internal.createAccount({ userId, accountId: userId, providerId: 'credential', password: passwordHash });
      await tx.demoDataset.update({ where: { id: dataset.id }, data: { userId } });
    } else {
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      if (user.email !== email) throw new Error('Email configurado não corresponde ao dataset existente.');
      if (options.rotatePassword) {
        await tx.account.updateMany({ where: { userId, providerId: 'credential' }, data: { password: passwordHash } });
        await tx.session.deleteMany({ where: { userId } });
      }
    }
    await tx.studentProfile.upsert({ where: { userId }, create: { userId, course: 'Engenharia da Computação', institution: 'UEA' }, update: {} });
    await tx.teacherProfile.upsert({ where: { userId }, create: { userId, teachings: { create: [
      { subject: 'Oficina de Projetos Inclusivos', course: 'Engenharia da Computação', position: 0 },
    ] } }, update: {} });
    await tx.readingPreferences.upsert({ where: { userId }, create: { userId }, update: {} });
    const teacherIds = ['demo-teacher-programacao', 'demo-teacher-calculo', 'demo-teacher-estatistica'];
    const names = ['Ana Souza', 'Carlos Lima', 'Marina Alves'];
    for (let i = 0; i < teacherIds.length; i++) await tx.user.upsert({ where: { id: teacherIds[i] }, create: {
      id: teacherIds[i], name: names[i], email: `teacher-${i}@example.invalid`, emailVerified: false }, update: {} });
    const students = Array.from({ length: 8 }, (_, i) => `demo-student-${i + 1}`);
    for (const [i, id] of students.entries()) await tx.user.upsert({ where: { id }, create: { id,
      name: `Estudante Fictício ${i + 1}`, email: `student-${i + 1}@example.invalid` }, update: {} });
    for (const id of students) await tx.studentProfile.upsert({ where: { userId: id }, create: {
      userId: id, course: 'Engenharia da Computação', institution: 'UEA' }, update: {} });
    for (const [index, id] of teacherIds.entries()) await tx.teacherProfile.upsert({ where: { userId: id }, create: {
      userId: id, teachings: { create: [{ subject: ['Programação I', 'Cálculo Aplicado', 'Estatística'][index],
        course: 'Engenharia da Computação', position: 0 }] } }, update: {} });
    const classes = [
      { id: 'demo-class-programacao', name: 'Programação I', title: 'Uma biblioteca para todos', teacher: teacherIds[0], students: [userId] },
      { id: 'demo-class-calculo', name: 'Cálculo Aplicado', title: 'Energia no campus', teacher: teacherIds[1], students: [userId] },
      { id: 'demo-class-estatistica', name: 'Estatística', title: 'O tempo na fila', teacher: teacherIds[2], students: [userId] },
      { id: 'demo-class-oficina', name: 'Oficina de Projetos Inclusivos', title: 'Projetar caminhos acessíveis', teacher: userId, students },
    ];
    const dueAt = new Date(dataset.anchor.getTime() + 45 * 86400000).toISOString();
    for (const [index, c] of classes.entries()) {
      await tx.classroom.upsert({ where: { id: c.id }, create: { id: c.id, name: c.name }, update: {} });
      for (const uid of [c.teacher, ...c.students]) await tx.membership.upsert({ where: { userId_classroomId: { userId: uid, classroomId: c.id } },
        create: { id: `${c.id}-member-${uid === userId ? 'principal' : uid}`, userId: uid, classroomId: c.id, role: uid === c.teacher ? 'teacher' : 'student' }, update: {} });
      const missionId = `${c.id}-mission`;
      let mission = await tx.mission.findUnique({ where: { id: missionId } });
      if (!mission) {
        mission = await tx.mission.create({ data: { id: missionId, classroomId: c.id } });
        const version = await createVersion(tx, missionId, {
          title: c.title, description: 'Exemplo fictício para demonstração. Desenvolva uma solução e explique as decisões tomadas.',
          objectives: index === 0 ? ['Modelar e implementar uma coleção de livros em código.'] : ['Analisar uma situação e justificar a solução com evidências.'],
          criteria: ['Apresentar uma solução coerente com o objetivo.', 'Explicar o raciocínio e revisar com feedback.'], dueAt,
          steps: ['Conhecer o desafio', 'Planejar a solução', 'Construir uma proposta', 'Verificar os resultados', 'Compartilhar e revisar'].map((title, i) => ({
            title, instructions: `Etapa ${i + 1} de 5. Registre suas ideias e explique sua escolha. Você pode salvar e retomar.`,
            example: index === 0 ? 'Exemplo: represente um livro por título e autor; descreva como localizar um exemplar.' : 'Exemplo didático: compare duas alternativas e registre uma justificativa.' })),
          materials: [{ title: 'Material didático fictício', text: 'Exemplo próprio de planejamento: defina o problema, compare alternativas, implemente uma proposta e confira os critérios.' }],
        }, 'demo_fixture');
        mission = await tx.mission.update({ where: { id: missionId }, data: { status: 'published', publishedVersionId: version.id } });
      }
      const version = await tx.missionVersion.findUniqueOrThrow({ where: { id: mission.publishedVersionId! }, include: { steps: { orderBy: { position: 'asc' } } } });
      for (const [studentIndex, uid] of c.students.entries()) {
        const status = index === 0 ? 'draft' : index === 1 ? 'submitted' : index === 2 ? 'reviewed' : studentIndex < 2 ? 'submitted' : studentIndex === 2 ? 'reviewed' : 'draft';
        const submissionId = `${missionId}-submission-${uid === userId ? 'principal' : studentIndex}`;
        await tx.submission.upsert({ where: { versionId_userId: { versionId: version.id, userId: uid } }, create: {
          id: submissionId, versionId: version.id, userId: uid, status, content: index === 0 ? 'Planejamento em rascunho: organizar livros por título e autor.' : 'Atividade fictícia: proposta elaborada com justificativas e exemplos.',
          currentStepId: version.steps[index === 0 ? 1 : 3].id, completedStepIds: version.steps.slice(0, index === 0 ? 1 : 3).map(s => s.id),
          submittedAt: status === 'draft' ? null : new Date(dataset.anchor.getTime() - 86400000),
        }, update: {} });
        if (status === 'reviewed') await tx.feedback.upsert({ where: { id: `${submissionId}-feedback` }, create: {
          id: `${submissionId}-feedback`, submissionId, teacherId: c.teacher,
          content: 'Sua justificativa apresenta um caminho claro. Para melhorar, compare os resultados com um segundo exemplo e explique as diferenças.' }, update: {} });
      }
      if (index === 3) {
        for (const shared of [true, false]) await tx.barrierReport.upsert({ where: { id: `demo-barrier-${shared ? 'shared' : 'private'}` }, create: {
          id: `demo-barrier-${shared ? 'shared' : 'private'}`, stepId: version.steps[1].id, userId: students[0], sharedWithTeacher: shared,
          description: shared ? 'O material está disponível apenas como imagem' : 'Relato fictício privado para teste de isolamento.' }, update: {} });
        const draftId = `${c.id}-draft`;
        if (!await tx.mission.findUnique({ where: { id: draftId } })) {
          await tx.mission.create({ data: { id: draftId, classroomId: c.id } });
          const draft = await createVersion(tx, draftId, { title: 'Rascunho de demonstração — revisar antes de publicar',
            description: 'Exemplo preparado previamente, sem chamada ao Gemini.', objectives: ['Planejar uma solução inclusiva.'], criteria: ['Justificar as escolhas.'], dueAt,
            steps: [{ title: 'Planejar', instructions: 'Descreva uma proposta e revise os critérios.', example: 'Compare duas alternativas de acesso ao material.' }],
            materials: [{ title: 'Texto fictício para geração', text: 'Planejamento de projeto: objetivo, alternativas, implementação e revisão de resultados.' }] }, 'demo_fixture');
          await tx.mission.update({ where: { id: draftId }, data: { draftVersionId: draft.id } });
        }
      }
    }
    await tx.auditEvent.create({ data: { actorId: userId, action: options.rotatePassword ? 'demo.seed.rotate' : 'demo.seed', resourceId: dataset.id } });
    return { userId, anchor: dataset.anchor };
  }, { timeout: 30000 });
}
