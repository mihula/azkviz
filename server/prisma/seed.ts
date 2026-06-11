import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  await prisma.gameState.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  })
  console.log('GameState initialized')
}

main().then(() => prisma.$disconnect())
