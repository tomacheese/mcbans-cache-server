import cors from 'cors'
import express, { json as expressJson } from 'express'
import { rateLimit } from 'express-rate-limit'
import { FindOptionsWhere } from 'typeorm'
import { DBBan } from './entities/ban.entity'
import { DBPlayer } from './entities/player.entity'
import { DBServer } from './entities/server.entity'
import { AppDataSource } from './mysql'

async function main() {
  console.log('main()')

  console.log('Initializing database...')
  await AppDataSource.initialize()
  console.log('Database initialized')

  const app = express()
  app.use(expressJson())
  app.use(cors())
  app.use(
    rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 100, // limit each IP to 100 requests per windowMs
      standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
      legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    })
  )
  app.use(express.static('/app/public'))

  app.get('/stats', async (_req, res) => {
    const dbBans = await DBBan.count()
    const dbPlayers = await DBPlayer.count()
    const dbServers = await DBServer.count()
    res.json({
      bans: dbBans,
      players: dbPlayers,
      servers: dbServers,
    })
  })

  app.get('/ban/:banId', async (req, res) => {
    const banId = req.params.banId
    if (!banId) {
      res.status(400).json({ message: 'Missing banId' })
      return
    }
    if (!Number.isInteger(Number(banId)) || Number(banId) < 0) {
      res.status(400).json({ message: 'Invalid banId' })
      return
    }
    const numBanId = Number(banId)

    const dbBan = await DBBan.findOne({
      where: { banId: numBanId },
      relations: ['server', 'player', 'bannedBy'],
    })
    if (!dbBan) {
      res.status(404).json({ message: 'Not found' })
      return
    }
    res.json(dbBan.toJSON())
  })

  app.get('/player/:target', async (req, res) => {
    const target = req.params.target
    if (!target) {
      res.status(400).json({ message: 'Missing target' })
      return
    }
    const where: FindOptionsWhere<DBPlayer>[] = []
    if (Number.isInteger(Number(target))) {
      where.push({ playerId: Number(target) })
    } else {
      where.push({ uuid: target.replaceAll('-', '') })
    }

    const dbPlayer = await DBPlayer.findOne({
      where,
      relations: ['bans', 'issuedBans', 'ownedServers'],
    })
    if (!dbPlayer) {
      res.status(404).json({ message: 'Not found' })
      return
    }
    res.json(dbPlayer.toJSON())
  })

  app.get('/server/:target', async (req, res) => {
    const target = req.params.target
    if (!target) {
      res.status(400).json({ message: 'Missing target' })
      return
    }
    const where: FindOptionsWhere<DBServer>[] = []
    if (Number.isInteger(Number(target))) {
      where.push({ serverId: Number(target) })
    } else {
      where.push({ address: target })
    }

    const dbServer = await DBServer.findOne({
      where,
      relations: ['owner', 'bans'],
    })
    if (!dbServer) {
      res.status(404).json({ message: 'Not found' })
      return
    }
    res.json(dbServer.toJSON())
  })

  app.listen(80, '0.0.0.0', () => {
    console.log(`Server started.`)
  })
}

;(async () => {
  await main()
    .catch(async (err) => {
      console.error(err)
    })
    .finally(async () => {
      await AppDataSource.destroy()
    })
})()
