import ApiPlayerResponse from './ApiPlayerResponse'
import ApiServerResponse from './ApiServerResponse'

export default interface ApiBanResponse {
  banId: number
  type: string
  player?: Pick<
    ApiPlayerResponse,
    'playerId' | 'name' | 'uuid' | 'reputation' | 'lastCheckedAt'
  >
  server?: Pick<ApiServerResponse, 'serverId' | 'address' | 'lastCheckedAt'>
  bannedBy?: Pick<
    ApiPlayerResponse,
    'playerId' | 'name' | 'uuid' | 'lastCheckedAt'
  >
  reason: string
  bannedAt: Date
  lastCheckedAt: Date
}
