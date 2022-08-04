import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  Timestamp,
  UpdateDateColumn,
} from 'typeorm'
import { DBBan } from './ban.entity'
import { DBServer } from './server.entity'

@Entity('players')
export class DBPlayer extends BaseEntity {
  @PrimaryColumn({
    type: 'int',
    comment: 'Player ID',
  })
  playerId!: number

  @Column({
    type: 'varchar',
    length: 16,
    comment: 'プレイヤー名',
  })
  name!: string

  @Column({
    type: 'varchar',
    length: 32,
    comment: 'プレイヤーUUID',
  })
  uuid!: string

  @Column({
    type: 'double',
    comment: '評価値',
  })
  reputation!: number

  @OneToMany(() => DBBan, (ban) => ban.player)
  bans!: DBBan[]

  @OneToMany(() => DBBan, (ban) => ban.bannedBy)
  issuedBans!: DBBan[]

  @OneToMany(() => DBServer, (server) => server.owner)
  ownedServers!: DBServer[]

  @Column({
    type: 'datetime',
    comment: '最終確認日時',
  })
  lastCheckedAt!: Date

  @CreateDateColumn({
    comment: 'データ登録日時',
  })
  createdAt!: Timestamp

  @UpdateDateColumn({
    comment: 'データ更新日時',
  })
  updatedAt!: Timestamp

  toJSON() {
    return {
      playerId: this.playerId,
      name: this.name,
      uuid: this.uuid,
      bans: this.bans.map((ban) => {
        return {
          banId: ban.banId,
          type: ban.type,
          server: {
            id: ban.server.serverId,
            address: ban.server.address,
          },
          bannedBy: {
            id: ban.bannedBy.playerId,
            name: ban.bannedBy.name,
            uuid: ban.bannedBy.uuid,
          },
          reason: ban.reason,
          bannedAt: ban.bannedAt,
          lastCheckedAt: ban.lastCheckedAt,
        }
      }),
      issuedBanIds: this.issuedBans.map((ban) => ban.banId),
      ownedServerIds: this.ownedServers.map((server) => server.serverId),
      reputation: this.reputation,
      lastCheckedAt: this.lastCheckedAt,
    }
  }
}
