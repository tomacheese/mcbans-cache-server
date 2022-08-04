import MCBans from './mcbans'

jest.setTimeout(60000) // 60sec

describe('MCBans', () => {
  test('getRecentBans', async () => {
    const mcbans = new MCBans()
    const recentBans = await mcbans.getRecentBans(1)
    expect(recentBans).toHaveLength(30)

    const ban = recentBans[0]
    expect(ban.banId).toBeGreaterThan(0)
    expect(ban.banType).toMatch(/^(global|local)$/)
    expect(ban.player.name).toMatch(/^[a-zA-Z0-9_]{3,16}$/)
    expect(ban.player.uuid).toMatch(
      /^[0-9a-f]{8}[0-9a-f]{4}[0-9a-f]{4}[0-9a-f]{4}[0-9a-f]{12}$/
    )
    expect(ban.server.id).toBeGreaterThan(0)
    expect(ban.server.address).toBeDefined() // 必要があれば(IP/Host):PORTを検証
    expect(ban.bannedBy.id).toBeGreaterThan(0)
    expect(ban.bannedBy.name).toMatch(/^[a-zA-Z0-9_]{3,16}$/)
    expect(ban.reason).toBeDefined()
    expect(ban.reason.length).toBeGreaterThan(0)
    expect(ban.bannedAt).toBeInstanceOf(Date)
    expect(ban.reputation).toBeGreaterThanOrEqual(0)
  })

  test('getBan', async () => {
    const mcbans = new MCBans()
    const ban = await mcbans.getBan(5625028)
    expect(ban).not.toBeNull()
    if (!ban) {
      return
    }
    expect(ban.banId).toBe(5625028)
    expect(ban.banType).toBe('global')
    expect(ban.player.id).toBe(39600394)
    expect(ban.player.name).toBe('gingermex')
    expect(ban.reputation).toBe(7.63)
    expect(ban.bannedBy.id).toBe(34608829)
    expect(ban.bannedBy.name).toBe('x9z')
    expect(ban.server.id).toBe(57007)
    expect(ban.server.address).toBe('play.jaoafa.com')
    expect(ban.bannedAt).toStrictEqual(new Date('2021-12-10T12:05:51Z'))
    expect(ban.reason).toBe(
      'griefing( https://storage.jaoafa.com/7fedd6ef24b5be625f721f1c4ef2e60e.png )'
    )
  })

  test('getPlayer (x4z/UUID)', async () => {
    const mcbans = new MCBans()
    const player = await mcbans.getPlayer('5799296ad1ec425293bd440bb9caa65c')
    expect(player).not.toBeNull()
    if (!player) {
      return
    }
    expect(player.playerId).toBe(30165108)
    expect(player.name).toBe('x4z')
    expect(player.uuid).toBe('5799296ad1ec425293bd440bb9caa65c')
    expect(player.reputation).toBe(10)
    expect(player.banIssued).toBe(77)
    expect(player.ownedServers).toStrictEqual([57007, 62158])
    expect(player.banIds).toHaveLength(0)
  })

  test('getPlayer (gingermex/ID)', async () => {
    // 39600394
    const mcbans = new MCBans()
    const player = await mcbans.getPlayer(39600394)
    expect(player).not.toBeNull()
    if (!player) {
      return
    }
    expect(player.playerId).toBe(39600394)
    expect(player.name).toBe('gingermex')
    expect(player.uuid).toBe('28c251cce3d345b78294136d54522a47')
    expect(player.reputation).toBe(7.63)
    expect(player.banIssued).toBe(0)
    expect(player.ownedServers).toHaveLength(0)
    expect(player.banIds).toStrictEqual([5625028])
  })

  test('getServer', async () => {
    const mcbans = new MCBans()
    const server = await mcbans.getServer(57007)
    expect(server).not.toBeNull()
    if (!server) {
      return
    }
    expect(server.serverId).toBe(57007)
    expect(server.address).toBe('play.jaoafa.com')
    expect(server.owner.id).toBe(30165108)
    expect(server.owner.name).toBe('x4z')
    expect(server.reputation).toBe(2.3749999999999742)
    expect(server.status).toBe('Server showing offline!')
    expect(server.registeredAt).toStrictEqual(new Date('2016-04-06T15:04:41Z'))
    expect(server.banIds).toHaveLength(496)
  })
})
