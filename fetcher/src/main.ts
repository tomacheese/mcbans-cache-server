import axios from 'axios'
import { LessThan } from 'typeorm'
import BanQueue from './ban-queue'
import { DBBan } from './entities/ban.entity'
import { DBPlayer } from './entities/player.entity'
import { DBServer } from './entities/server.entity'
import MCBans, { MCBansPlayer, MCBansRecentBan, MCBansServer } from './mcbans'
import { AppDataSource } from './mysql'

async function getAllRecentBans(mcbans: MCBans): Promise<MCBansRecentBan[]> {
  return await Promise.all(
    [1, 2, 3, 4, 5].map(async (page) => {
      return await mcbans.getRecentBans(page)
    })
  ).then((pages) => {
    return pages.flat()
  })
}

// -------------------------------------------------------------------------- //

const banQueue = new BanQueue()

async function getPlayer(
  mcbans: MCBans,
  playerId: number
): Promise<{
  row: DBPlayer
  player: MCBansPlayer | null
  created: boolean
  updated: boolean
}> {
  const dbPlayer = await DBPlayer.findOne({
    where: {
      playerId,
    },
  })
  if (!dbPlayer) {
    // Create new player
    const player = await mcbans.getPlayer(playerId)
    if (player === null) {
      throw new Error(`Player not found: ${playerId}`)
    }
    return {
      row: await DBPlayer.create({
        playerId,
        name: player.name,
        uuid: player.uuid,
        reputation: player.reputation,
        lastCheckedAt: new Date(),
      }).save(),
      player,
      created: true,
      updated: false,
    }
  } else if (
    dbPlayer.lastCheckedAt.getTime() <
    new Date(Date.now() - 24 * 60 * 60 * 1000).getTime()
  ) {
    // Update player
    const player = await mcbans.getPlayer(playerId)
    if (player === null) {
      throw new Error(`Player not found: ${playerId}`)
    }
    dbPlayer.name = player.name
    dbPlayer.uuid = player.uuid
    dbPlayer.reputation = player.reputation
    dbPlayer.lastCheckedAt = new Date()
    return {
      row: await dbPlayer.save(),
      player,
      created: false,
      updated: true,
    }
  }
  return {
    row: dbPlayer,
    player: null,
    created: false,
    updated: false,
  }
}

async function getServer(
  mcbans: MCBans,
  serverId: number
): Promise<{
  row: DBServer
  server: MCBansServer | null
  created: boolean
  updated: boolean
}> {
  const dbServer = await DBServer.findOne({
    where: {
      serverId,
    },
  })
  if (!dbServer) {
    // Create new server
    const server = await mcbans.getServer(serverId)
    if (server === null) {
      throw new Error(`Server not found: ${serverId}`)
    }
    const { row: owner } = await getPlayer(mcbans, server.owner.id)
    return {
      row: await DBServer.create({
        serverId,
        address: server.address,
        reputation: server.reputation,
        owner,
        registeredAt: server.registeredAt,
        lastCheckedAt: new Date(),
      }).save(),
      server,
      created: true,
      updated: false,
    }
  } else if (
    dbServer.lastCheckedAt.getTime() <
    new Date(Date.now() - 24 * 60 * 60 * 1000).getTime()
  ) {
    // Update server
    const server = await mcbans.getServer(serverId)
    if (server === null) {
      throw new Error(`Server not found: ${serverId}`)
    }
    const { row: owner } = await getPlayer(mcbans, server.owner.id)
    dbServer.address = server.address
    dbServer.reputation = server.reputation
    dbServer.owner = owner
    dbServer.registeredAt = server.registeredAt
    dbServer.lastCheckedAt = new Date()
    return {
      row: await dbServer.save(),
      server,
      created: false,
      updated: true,
    }
  }
  return {
    row: dbServer,
    server: null,
    created: false,
    updated: false,
  }
}

/**
 * キュー処理
 *
 * - キューから取得
 * - 最終確認日時が24時間以内であればスキップ
 * - 処罰情報を取得
 * - 被処罰者情報を取得
 *   - 受けている処罰情報をキューに追加
 * - 処罰実施者情報を取得
 *   - 受けている処罰情報をキューに追加
 * - 処罰サーバ情報を取得
 *   - 実施している処罰情報をキューに追加
 * - 処罰情報をDBに保存
 */
async function queueProcessor(mcbans: MCBans) {
  console.log('queueProcessor()')
  let cnt = 0
  while (banQueue.length() > 0) {
    cnt++
    // キューから取得
    const banId = banQueue.shift()
    if (!banId) {
      continue
    }
    console.log(`Processing banId: ${banId} (${cnt}/${banQueue.length()})`)

    try {
      const dbBan = await DBBan.findOne({
        where: {
          banId,
        },
      })
      // 最終確認日時が24時間以内であればスキップ
      if (
        dbBan &&
        dbBan.lastCheckedAt &&
        dbBan.lastCheckedAt.getTime() > Date.now() - 24 * 60 * 60 * 1000
      ) {
        console.log(`- The final confirmation time is within 24 hours, Skip.`)
        continue
      }

      // 処罰情報を取得
      const ban = await mcbans.getBan(banId)
      if (ban === null) {
        // 処罰情報がNULL = 処罰が解除された？
        console.log(`- Ban is null, Remove.`)
        if (dbBan) dbBan.remove()
        continue
      }

      console.log(`Player: ${ban.player.name}`)
      console.log(`Banned by: ${ban.bannedBy.name}`)
      console.log(`Server: ${ban.server.address}`)

      // 被処罰者情報を取得
      const {
        row: dbPlayer,
        created: isPlayerCreated,
        updated: isPlayerUpdated,
      } = await getPlayer(mcbans, ban.player.id)
      if (
        isPlayerCreated ||
        isPlayerUpdated ||
        !dbPlayer ||
        !dbPlayer.lastCheckedAt ||
        dbPlayer.lastCheckedAt.getTime() < Date.now() - 24 * 60 * 60 * 1000
      ) {
        console.log("Get player's ban history from MCBans.")
        const player = await mcbans.getPlayer(ban.player.id)
        if (player === null) {
          throw new Error(`Player not found: ${ban.player.id}`)
        }

        const playerBanIds = player.banIds
        console.log(
          `- Player|${player.name}: ${playerBanIds.length} bans add to queue.`
        )
        banQueue.addAll(playerBanIds)
      }

      // 処罰実施者情報を取得
      const {
        row: dbBannedByPlayer,
        player: mcbansPlayer,
        created: isBannedByCreated,
        updated: isBannedByUpdated,
      } = await getPlayer(mcbans, ban.bannedBy.id)
      if (
        isBannedByCreated ||
        isBannedByUpdated ||
        !dbBannedByPlayer ||
        !dbBannedByPlayer.lastCheckedAt ||
        dbBannedByPlayer.lastCheckedAt.getTime() <
          Date.now() - 24 * 60 * 60 * 1000
      ) {
        console.log("Get banned-by player's ban history from MCBans.")
        const player = mcbansPlayer ?? (await mcbans.getPlayer(ban.bannedBy.id))
        if (player === null) {
          throw new Error(`Player not found: ${ban.bannedBy.id}`)
        }

        const bannedByBanIds = player.banIds
        console.log(
          `- Player|${player.name}: ${bannedByBanIds.length} bans add to queue.`
        )
        banQueue.addAll(bannedByBanIds)
      }

      // 処罰サーバ情報を取得
      const {
        row: dbServer,
        server: mcbansServer,
        created: isServerCreated,
        updated: isServerUpdated,
      } = await getServer(mcbans, ban.server.id)
      if (
        isServerCreated ||
        isServerUpdated ||
        !dbServer ||
        !dbServer.lastCheckedAt ||
        dbServer.lastCheckedAt.getTime() < Date.now() - 24 * 60 * 60 * 1000
      ) {
        console.log("Get server's ban history from MCBans.")
        const server = mcbansServer ?? (await mcbans.getServer(ban.server.id))
        if (server === null) {
          throw new Error(`Server not found: ${ban.server.id}`)
        }
        const serverBanIds = server.banIds
        console.log(
          `- Server|${server.address}: ${serverBanIds.length} bans add to queue.`
        )
        banQueue.addAll(serverBanIds)
      }

      // 処罰情報をDBに保存
      if (dbBan) {
        // 更新
        console.log(`- Update data.`)
        dbBan.type = ban.banType
        dbBan.player = dbPlayer
        dbBan.server = dbServer
        dbBan.bannedBy = dbBannedByPlayer
        dbBan.reason = ban.reason
        dbBan.bannedAt = ban.bannedAt
        dbBan.lastCheckedAt = new Date()
        await dbBan.save()
      } else {
        // 新規
        console.log(`- Create data.`)
        const dbBan = DBBan.create({
          banId,
          type: ban.banType,
          player: dbPlayer,
          server: dbServer,
          bannedBy: dbBannedByPlayer,
          reason: ban.reason,
          bannedAt: ban.bannedAt,
          lastCheckedAt: new Date(),
        })
        await dbBan.save()
      }
    } catch (e) {
      console.error(`Failed to process banId: ${banId}, skip.`)
      console.error(e)
    }
  }

  console.log('queueProcessor() ended')
}

/**
 * メイン関数
 *
 * - ユーザー、サーバ情報の更新は24時間に1回の制限を設ける（負荷軽減のためページにアクセスしない）
 *
 * ## 処理
 *
 * - 最近の処罰情報から、処罰IDを取得しキューに追加
 * - キュー処理を実施
 * - DBからBan情報を取得（最終確認日時から24時間以降のものを取得）
 *   - キューに追加
 * - DBからサーバ情報を取得（最終確認日時から24時間以降のものを取得）
 *  - キューに追加
 * - キュー処理を実施
 */
async function main() {
  console.log('main()')

  console.log('Initializing database...')
  await AppDataSource.initialize()
  console.log('Database initialized')

  const mcbans = new MCBans()

  // 最近の処罰情報から、処罰IDを取得しキューに追加
  console.log(`Fetching recent bans...`)
  const recentBans = await getAllRecentBans(mcbans)
  banQueue.addAll(recentBans.map((ban) => ban.banId))
  console.log(`- ${recentBans.length} bans added to queue.`)

  // キュー処理を実施
  await queueProcessor(mcbans)

  // DBからBan情報を取得（最終確認日時から24時間以降のものを取得）
  console.log(`Fetching bans from DB...`)
  const dbBans = await DBBan.find({
    where: {
      lastCheckedAt: LessThan(new Date(Date.now() - 24 * 60 * 60 * 1000)),
    },
  })
  console.log(`- ${dbBans.length} bans added to queue.`)
  banQueue.addAll(dbBans.map((ban) => ban.banId))

  // DBからサーバ情報を取得（最終確認日時から24時間以降のものを取得）
  console.log(`Fetching servers from DB...`)
  const dbServers = await DBServer.find({
    where: {
      lastCheckedAt: LessThan(new Date(Date.now() - 24 * 60 * 60 * 1000)),
    },
  })
  console.log(`- found ${dbServers.length} servers.`)
  for (const dbServer of dbServers) {
    const server = await mcbans.getServer(dbServer.serverId)
    if (server === null) {
      throw new Error(`Server not found: ${dbServer.serverId}`)
    }
    banQueue.addAll(server.banIds)
  }

  // キュー処理を実施
  await queueProcessor(mcbans)

  console.log('main() ended')
}

;(async () => {
  await main()
    .catch(async (err) => {
      console.error(err)
      await axios
        .post('http://discord-deliver', {
          embed: {
            title: `Error`,
            description: `${err.message}`,
            color: 0xff0000,
          },
        })
        .catch(() => null)
    })
    .finally(async () => {
      await AppDataSource.destroy()
    })
})()
