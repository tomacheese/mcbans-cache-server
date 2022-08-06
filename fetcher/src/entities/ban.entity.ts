import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryColumn,
  Timestamp,
  UpdateDateColumn,
} from 'typeorm'
import { DBPlayer } from './player.entity'
import { DBServer } from './server.entity'

@Entity('bans')
export class DBBan extends BaseEntity {
  @PrimaryColumn({
    type: 'int',
    comment: 'Ban ID',
  })
  banId!: number

  @Column({
    type: 'varchar',
    length: 10,
    comment: '処罰種別',
  })
  type!: string // 'Global' | 'Local' ?

  @ManyToOne(() => DBPlayer, (player) => player.bans)
  player!: DBPlayer

  @ManyToOne(() => DBServer, (server) => server.bans)
  server!: DBServer

  @ManyToOne(() => DBPlayer, (player) => player.issuedBans)
  bannedBy!: DBPlayer

  @Column({
    type: 'varchar',
    length: 255,
    comment: '処罰理由',
  })
  reason!: string

  @Column({
    type: 'datetime',
    comment: '処罰日時',
  })
  bannedAt!: Date

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
}
