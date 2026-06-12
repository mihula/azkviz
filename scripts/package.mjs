import { cpSync, rmSync, readFileSync, writeFileSync } from 'fs'

const OUT = 'release'

rmSync(OUT, { recursive: true, force: true })

cpSync('client/dist',    `${OUT}/client/dist`,    { recursive: true })
cpSync('server/dist',    `${OUT}/server/dist`,    {
  recursive: true,
  filter: (src) => !src.includes('__tests__'),
})
cpSync('server/prisma/schema.prisma', `${OUT}/server/prisma/schema.prisma`)
cpSync('server/package.json', `${OUT}/server/package.json`)
cpSync('shared/dist',    `${OUT}/shared/dist`,    { recursive: true })
cpSync('shared/package.json', `${OUT}/shared/package.json`)

// Root package.json: jen server + shared workspace, start script pro produkci
const rootPkg = JSON.parse(readFileSync('package.json', 'utf8'))
rootPkg.workspaces = ['shared', 'server']
rootPkg.scripts = { start: 'npm start --workspace=server' }
writeFileSync(`${OUT}/package.json`, JSON.stringify(rootPkg, null, 2))

console.log('✓ Release připraven v ./release/')
console.log('  Na serveru: npm install && NODE_ENV=production npm start')
