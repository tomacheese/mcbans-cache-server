import axios, { AxiosInstance, AxiosProxyConfig, AxiosResponse } from 'axios'
import { Cheerio, CheerioAPI, Element, load } from 'cheerio'

export interface MCBansRecentBan {
  banType: string
  banId: number
  player: {
    name: string
    uuid: string
  }
  server: {
    id: number
    address: string
  }
  bannedBy: {
    id: number
    name: string
  }
  reason: string
  bannedAt: Date
  reputation: number
}

interface MCBansBan {
  banId: number
  banType: string
  player: {
    id: number
    name: string
  }
  reputation: number
  bannedBy: {
    id: number
    name: string
  }
  server: {
    id: number
    address: string
  }
  bannedAt: Date
  reason: string
}

interface MCBansSummary {
  [key: string]: {
    text: string | null
    url: string | undefined
  }
}

interface MCBansPlayer {
  playerId: number
  name: string
  uuid: string | null
  reputation: number
  banIssued: number
  ownedServers: number[]
  banIds: number[]
}

interface MCBansServer {
  serverId: number
  address: string
  owner: {
    id: number
    name: string
  }
  reputation: number
  status: string
  registeredAt: Date
  banIds: number[]
}

export default class MCBans {
  $axios: AxiosInstance
  private response: AxiosResponse<string> | null = null

  constructor() {
    this.$axios = axios.create({
      baseURL: 'https://www.mcbans.com/',
      validateStatus: () => true,
      proxy: this.parseHttpProxy(),
    })
  }

  parseHttpProxy(): AxiosProxyConfig | false {
    const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY
    if (!proxy) return false

    const parsed = new URL(proxy)
    if (!parsed.hostname || !parsed.port) return false

    return {
      host: parsed.hostname,
      port: parseInt(parsed.port),
      auth:
        parsed.username && parsed.password
          ? {
              username: parsed.username,
              password: parsed.password,
            }
          : undefined,
      protocol: parsed.protocol.replace(':', ''),
    }
  }

  async getRecentBans(page = 1): Promise<MCBansRecentBan[]> {
    console.log(`MCBans.getRecentBans(${page})`)
    this.response = await this.$axios.get<string>(
      `https://www.mcbans.com/${page}`
    )
    if (this.response.status !== 200) {
      throw new Error(`Failed to get recent bans page ${page}`)
    }
    const $ = load(this.response.data)
    const table = $('div.dataTables_wrapper > table')
    const rows = table.find('tbody > tr')
    const ret = []
    for (const row of rows) {
      const cells = $(row).find('td')

      const [
        banType,
        banId,
        ,
        playerName,
        playerUrl,
        ,
        serverUrl,
        bannedBy,
        bannedByUrl,
        banReason,
        dateIssued,
        ,
        reputation,
      ] = cells
        .map((_, cell) => {
          const text = $(cell).text().trim()
          const anchor = $(cell).find('a')
          if (anchor.length === 0) {
            return text
          }
          const url = 'https://www.mcbans.com' + anchor.attr('href')
          return [text, url]
        })
        .get()

      const playerUuid = playerUrl
        .split('/')
        .filter((s) => s.trim().length !== 0)
        .pop() as string
      const serverRegex =
        /^https:\/\/www\.mcbans\.com\/server\/(\d+)\/([\S ]+)\/$/
      const serverMatch = serverUrl.match(serverRegex)
      if (!serverMatch) {
        throw new Error(`Failed to parse server url ${serverUrl}`)
      }
      const serverId = Number(serverMatch[1].trim())
      const serverAddress = serverMatch[2].trim()
      const bannedById = Number(
        bannedByUrl
          .split('/')
          .filter((s) => s.trim().length !== 0)
          .pop()
      )

      ret.push({
        banType: banType.toLowerCase(),
        banId: Number(banId),
        player: {
          name: playerName,
          uuid: playerUuid,
        },
        server: {
          id: serverId,
          address: serverAddress,
        },
        bannedBy: {
          name: bannedBy,
          id: bannedById,
        },
        reason: banReason,
        bannedAt: new Date(dateIssued.replace(' ', 'T') + 'Z'),
        reputation: Number(reputation.replace(' / 10', '')),
      })
    }
    return ret
  }

  async getBan(banId: number): Promise<MCBansBan | null> {
    this.response = await this.$axios.get<string>(
      `https://www.mcbans.com/ban/${banId}`,
      {
        maxRedirects: 0,
      }
    )
    if (this.response.status === 302) {
      return null
    }
    if (this.response.status !== 200) {
      throw new Error(`Failed to get ban ${banId}`)
    }
    const $ = load(this.response.data)

    const summaryElements = $(
      '#content .box-holder-one-third > div.box-element:nth-child(1) > div.box-content'
    ).find('fieldset > section')
    const summary = this.parseSummary($, summaryElements)

    const reasonElement = $(
      '#content .box-holder-two-third > div.box-element:nth-child(1) > div.box-content'
    )
    const reason = reasonElement.text().trim()

    // validate
    if (!summary.player || !summary.player.text || !summary.player.url) {
      throw new Error(`Failed to get ban ${banId} (player row not found)`)
    }
    if (!summary.type || !summary.type.text) {
      throw new Error(`Failed to get ban ${banId} (type row not found)`)
    }
    if (!summary.reputation || !summary.reputation.text) {
      throw new Error(`Failed to get ban ${banId} (reputation row not found)`)
    }
    if (
      !summary['issued by'] ||
      !summary['issued by'].text ||
      !summary['issued by'].url
    ) {
      throw new Error(`Failed to get ban ${banId} (bannedBy row not found)`)
    }
    if (!summary.server || !summary.server.text || !summary.server.url) {
      throw new Error(`Failed to get ban ${banId} (server row not found)`)
    }
    if (!summary['date issued'] || !summary['date issued'].text) {
      throw new Error(`Failed to get ban ${banId} (bannedAt row not found)`)
    }

    const playerId = Number(
      summary.player.url
        .split('/')
        .filter((s) => s.trim().length !== 0)
        .pop()
    )
    const reputation = Number(summary.reputation.text.replace(' / 10', ''))
    const bannedById = Number(
      summary['issued by'].url
        .split('/')
        .filter((s) => s.trim().length !== 0)
        .pop()
    )
    const serverId = Number(
      summary.server.url
        .split('/')
        .filter((s) => s.trim().length !== 0)
        .pop()
    )

    return {
      banId,
      banType: summary.type.text,
      player: {
        name: summary.player.text,
        id: playerId,
      },
      reputation,
      bannedBy: {
        id: bannedById,
        name: summary['issued by'].text,
      },
      server: {
        id: serverId,
        address: summary.server.text,
      },
      bannedAt: new Date(summary['date issued'].text.replace(' ', 'T') + 'Z'),
      reason,
    }
  }

  async getPlayer(
    target: number | string,
    isSkipBanIds = false
  ): Promise<MCBansPlayer | null> {
    console.log(`getPlayer(${target}, ${isSkipBanIds})`)
    this.response = await this.$axios.get<string>(
      `https://www.mcbans.com/player/${target}/`,
      {
        maxRedirects: 0,
      }
    )
    if (this.response.status === 302) {
      return null
    }
    if (this.response.status !== 200) {
      throw new Error(`Failed to get player ${target}`)
    }
    const $ = load(this.response.data)

    const playerElement = $('div#left-menu li.active a').attr('href')
    if (!playerElement) {
      throw new Error(
        `Failed to get player ${target} (player element href not found)`
      )
    }
    const playerId = playerElement
      .split('/')
      .filter((s) => s.trim().length !== 0)
      .pop() as string
    const playerRegex = /^(\S+)'s Information$/
    const playerRawText = $(
      'div#content:nth-child(1) div.box-holder-one-third div.box-element:nth-child(1) h4'
    )
      .text()
      .trim()
    const playerMatch = playerRawText.match(playerRegex)
    if (!playerMatch) {
      throw new Error(`Failed to get player ${target} (player name not found)`)
    }
    const playerName = playerMatch[1]

    const playerSummaryElements = $(
      'div#content:nth-child(1) div.box-holder-one-third div.box-element:nth-child(1) div.box-content'
    ).find('fieldset > section')
    const playerSummary = this.parseSummary($, playerSummaryElements)

    if (!playerSummary.reputation.text) {
      throw new Error(
        `Failed to get player ${target} (player reputation row not found)`
      )
    }
    let uuid = null
    if (playerSummary.uuid.text) {
      uuid = playerSummary.uuid.text
    }
    if (!playerSummary.bans.text) {
      throw new Error(
        `Failed to get player ${target} (player bans row not found)`
      )
    }
    const reputation = Number(
      playerSummary.reputation.text.replace(' / 10', '')
    )
    const issuedBans = Number(playerSummary['issued bans'].text)
    const banCount = Number(playerSummary.bans.text)

    const serversElement = $(
      'div#content:nth-child(1) div.box-holder-two-third div.box-element div.box-content table'
    )
    const serverIds = serversElement
      .find('tbody tr')
      .map((_, el) => {
        const serverUrl: string | undefined = $(el)
          .find('td:nth-child(1) a')
          .attr('href')
        if (!serverUrl) {
          throw new Error(
            `Failed to get player ${target} (server element href not found)`
          )
        }
        const serverRegex = /^\/server\/(\d+)\/(\S+)\/$/
        const serverMatch: RegExpMatchArray | null =
          serverUrl.match(serverRegex)
        if (!serverMatch) {
          throw new Error(`Failed to parse server url ${serverUrl}`)
        }
        const serverId = Number(serverMatch[1])
        return serverId
      })
      .get()

    const banIds = !isSkipBanIds ? await this.getBanIds('player', playerId) : []
    if (!isSkipBanIds && banCount !== banIds.length) {
      throw new Error(
        `Failed to get player ${target} (ban count mismatch | ${banCount} != ${banIds.length})`
      )
    }

    return {
      playerId: Number(playerId),
      name: playerName,
      uuid,
      reputation,
      banIssued: issuedBans,
      ownedServers: serverIds,
      banIds,
    }
  }

  async getServer(
    target: number | string,
    isSkipBanIds = false
  ): Promise<MCBansServer | null> {
    this.response = await this.$axios.get<string>(
      `https://www.mcbans.com/server/${target}/`,
      {
        maxRedirects: 0,
      }
    )
    if (this.response.status === 302) {
      return null
    }
    if (this.response.status !== 200) {
      throw new Error(`Failed to get server ${target}`)
    }
    const $ = load(this.response.data)

    const serverUrl = $('div#left-menu li.active a').attr('href')
    if (!serverUrl) {
      throw new Error(
        `Failed to get server ${target} (server element href not found)`
      )
    }
    const serverRegex = /^\/server\/(\d+)\/(\S+)\/$/
    const serverMatch: RegExpMatchArray | null = serverUrl.match(serverRegex)
    if (!serverMatch) {
      throw new Error(`Failed to parse server url ${serverUrl}`)
    }
    const serverId = Number(serverMatch[1])
    const serverAddress = $(
      'div#content:nth-child(1) > div.c-tables > div.box-element:nth-child(1) h3'
    )
      .text()
      .trim()

    const serverSummaryElements = $(
      'div#content div.box-holder-one-third div.box-element:nth-child(1) div.box-content'
    ).find('fieldset > section')
    const serverSummary = this.parseSummary($, serverSummaryElements)

    if (
      !serverSummary.owner ||
      !serverSummary.owner.text ||
      !serverSummary.owner.url
    ) {
      throw new Error(
        `Failed to get server ${target} (server owner row not found)`
      )
    }
    if (!serverSummary.reputation || !serverSummary.reputation.text) {
      throw new Error(
        `Failed to get server ${target} (server reputation row not found)`
      )
    }
    if (!serverSummary.status || !serverSummary.status.text) {
      throw new Error(
        `Failed to get server ${target} (server status row not found)`
      )
    }
    if (!serverSummary['created on'] || !serverSummary['created on'].text) {
      throw new Error(
        `Failed to get server ${target} (server created on row not found)`
      )
    }

    const ownerId = Number(
      serverSummary.owner.url
        .split('/')
        .filter((s) => s.trim().length !== 0)
        .pop()
    )

    const banIds = !isSkipBanIds ? await this.getBanIds('server', target) : []
    if (!banIds) {
      throw new Error(`Failed to get server ${target} (get ban ids failed)`)
    }

    return {
      serverId: Number(serverId),
      address: serverAddress,
      owner: {
        id: ownerId,
        name: serverSummary.owner.text,
      },
      reputation: Number(serverSummary.reputation.text.replace(' / 3', '')),
      status: serverSummary.status.text,
      registeredAt: new Date(
        serverSummary['created on'].text.replace(' ', 'T') + 'Z'
      ),
      banIds,
    }
  }

  private async getBanIds(
    targetType: 'player' | 'server',
    target: number | string,
    page = 1
  ): Promise<number[]> {
    console.log(`getBanIds(${targetType}, ${target}, ${page})`)
    if (page > 150) {
      // memory leak prevention
      return []
    }
    this.response = await this.$axios.get<string>(
      `https://www.mcbans.com/${targetType}/${target}/bans/page/${page}`
    )
    if (this.response.status !== 200) {
      throw new Error(`Failed to get ban ids ${targetType}:${target}`)
    }
    if (this.response.data.length === 0) {
      throw new Error(
        `Failed to get ban ids ${targetType}:${target} (empty response)`
      )
    }
    const $ = load(this.response.data)
    const table = $('div.dataTables_wrapper > table')
    const rows = table.find('tbody > tr')
    if (rows.length === 0) {
      return []
    }

    const bans = rows
      .map((_, el) => {
        return Number($(el).find('td:nth-child(2)').text().trim())
      })
      .get()
    const nextBtn = $(
      'div#datatable_paginate > div.paginate > a > span.fa-step-forward'
    )
    if (nextBtn.length === 0) {
      return bans
    }
    return [...bans, ...(await this.getBanIds(targetType, target, page + 1))]
  }

  parseSummary(
    $: CheerioAPI,
    summaryElements: Cheerio<Element>
  ): MCBansSummary {
    const summarys: MCBansSummary = {}
    for (const element of summaryElements) {
      const labelElement = $(element).find('label')
      if (labelElement.length === 0) {
        continue
      }
      const label = labelElement.text().replace('(?)', '').trim()
      const div = $(element).find('div.section-content')
      const anchor = $(element).find('a')
      const value =
        div.length !== 0
          ? div.text().trim()
          : anchor.length !== 0
          ? anchor.text().trim()
          : null
      summarys[label.toLowerCase()] = {
        text: value,
        url: anchor.length !== 0 ? anchor.attr('href') : undefined,
      }
    }
    return summarys
  }

  public getLastResponse(): AxiosResponse<string> | null {
    return this.response
  }
}
