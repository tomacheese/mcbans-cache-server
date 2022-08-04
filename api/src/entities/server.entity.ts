import { omitProperty, pickProperties } from '@/lib'
import ApiServerResponse from '@/models/ApiServerResponse'
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  Timestamp,
  UpdateDateColumn,
} from 'typeorm'
import { DBBan } from './ban.entity'
import { DBPlayer } from './player.entity'

@Entity('servers')
export class DBServer extends BaseEntity {
  @PrimaryColumn({
    type: 'int',
    comment: 'Server ID',
  })
  serverId!: number

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'サーバアドレス',
  })
  address!: string

  @Column({
    type: 'double',
    comment: '評価値',
  })
  reputation!: number

  @ManyToOne(() => DBPlayer, (player) => player.ownedServers)
  owner!: DBPlayer

  @OneToMany(() => DBBan, (ban) => ban.server)
  bans!: DBBan[]

  @Column({
    type: 'datetime',
    comment: '登録日時',
  })
  registeredAt!: Date

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

  toJSON(): ApiServerResponse {
    return {
      serverId: this.serverId,
      address: this.address,
      reputation: this.reputation,
      owner: this.owner ? pickProperties(this.owner.toJSON(), [
        'playerId',
        'name',
        'uuid',
      ]) : undefined,
      bans: this.bans
        ? this.bans.map((ban) => omitProperty(ban.toJSON(), 'server'))
        : undefined,
      registeredAt: this.registeredAt,
      lastCheckedAt: this.lastCheckedAt,
    }
  }
}
