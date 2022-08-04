import { omitProperty } from '@/lib'
import ApiPlayerResponse from '@/models/ApiPlayerResponse'
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

  toJSON(): ApiPlayerResponse {
    return {
      playerId: this.playerId,
      name: this.name,
      uuid: this.uuid,
      reputation: this.reputation,
      bans: this.bans
        ? this.bans.map((ban) => omitProperty(ban, 'player'))
        : undefined,
      issuedBans: this.issuedBans
        ? this.issuedBans.map((ban) => omitProperty(ban, 'bannedBy'))
        : undefined,
      ownedServers: this.ownedServers
        ? this.ownedServers.map((server) => omitProperty(server, 'owner'))
        : undefined,
      lastCheckedAt: this.lastCheckedAt,
    }
  }
}
