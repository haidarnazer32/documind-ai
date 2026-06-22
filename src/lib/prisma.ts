// Singleton Prisma client instance
import { PrismaClient } from '@/generated/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL ?? 'file:./prisma/dev.db'
  // Prisma 7 expects file:./ relative to project root; strip the `file:` prefix
  const filePath = url.startsWith('file:') ? url.slice('file:'.length) : url
  const adapter = new PrismaBetterSqlite3({ url: filePath })
  return new PrismaClient({ adapter })
}

let prisma: PrismaClient
if (process.env.NODE_ENV === 'production') {
  prisma = createPrismaClient()
} else {
  if (!global.prisma) {
    global.prisma = createPrismaClient()
  }
  prisma = global.prisma
}

export { prisma }
