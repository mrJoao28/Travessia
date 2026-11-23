import type { Prisma, PrismaClient } from '@prisma/client';
import type { Body } from './contracts.js';
import { serial, type Tx } from './database.js';

const include = { profile: true, studentProfile: true,
  teacherProfile: { include: { teachings: { orderBy: { position: 'asc' as const } } } } };
type ProfileRow = Prisma.UserGetPayload<{ include: typeof include }>;

function view(user: ProfileRow) {
  const s = user.studentProfile;
  return { id: user.id, name: user.name, email: user.email, emailVerified: user.emailVerified,
    phone: user.profile?.phone ?? null, alternateEmail: user.profile?.alternateEmail ?? null,
    student: s ? { registration: s.registration, institution: s.institution, unit: s.unit, course: s.course, period: s.period } : null,
    teacher: user.teacherProfile ? { teachings: user.teacherProfile.teachings.map(t => ({ subject: t.subject, course: t.course })) } : null };
}

export async function getProfile(db: PrismaClient | Tx, userId: string) {
  return view(await db.user.findUniqueOrThrow({ where: { id: userId }, include }));
}

// The owner is always the validated session. Academic metadata never writes Membership.
export async function updateProfile(db: PrismaClient, userId: string, input: Body<'updateProfile'>) {
  return serial(db, async tx => {
    if (input.name !== undefined) await tx.user.update({ where: { id: userId }, data: { name: input.name } });
    if (input.phone !== undefined || input.alternateEmail !== undefined) {
      const data = { ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.alternateEmail !== undefined ? { alternateEmail: input.alternateEmail } : {}) };
      await tx.profile.upsert({ where: { userId }, create: { userId, ...data }, update: data });
    }
    if (input.student !== undefined) {
      await tx.studentProfile.upsert({ where: { userId }, create: { userId, ...input.student }, update: input.student });
    }
    if (input.teacher !== undefined) {
      await tx.teacherProfile.upsert({ where: { userId }, create: { userId }, update: { updatedAt: new Date() } });
      await tx.teachingAssignment.deleteMany({ where: { teacherId: userId } });
      if (input.teacher.teachings.length) await tx.teachingAssignment.createMany({ data:
        input.teacher.teachings.map((t, position) => ({ teacherId: userId, subject: t.subject, course: t.course, position })) });
    }
    return getProfile(tx, userId);
  });
}
