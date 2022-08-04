import ApiBanResponse from './ApiBanResponse'
import ApiPlayerResponse from './ApiPlayerResponse'

export default interface ApiServerResponse {
  serverId: number
  address: string
  reputation: number
  owner?: Pick<ApiPlayerResponse, 'playerId' | 'name' | 'uuid'>
  bans?: Omit<ApiBanResponse, 'server'>[]
  registeredAt: Date
  lastCheckedAt: Date
}
