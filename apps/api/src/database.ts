import { Prisma, PrismaClient } from '@prisma/client';
export const db = new PrismaClient({ log: [] });
export type Tx = Prisma.TransactionClient;

// PostgreSQL serialization/deadlock retries only; never wraps an external provider call.
export async function serial<T>(client: PrismaClient, operation: (tx: Tx) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await client.$transaction(operation, { isolationLevel: 'Serializable', timeout: 10000 }); }
    catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2034' || attempt >= 3) throw error;
    }
  }
}
