import ApiBanResponse from './ApiBanResponse'
import ApiServerResponse from './ApiServerResponse'

export default interface ApiPlayerResponse {
  playerId: number
  name: string
  uuid: string
  reputation: number
  bans?: Omit<ApiBanResponse, 'player'>[]
  issuedBans?: Omit<ApiBanResponse, 'bannedBy'>[]
  ownedServers?: Omit<ApiServerResponse, 'owner'>[]
  lastCheckedAt: Date
}
