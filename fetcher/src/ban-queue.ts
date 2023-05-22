import fs from 'fs'

export default class BanQueue {
  private queue: number[] = []
  private alreadyProcessedBans: number[] = []

  constructor() {
    this.load()
  }

  add(banId: number) {
    if (this.alreadyProcessedBans.includes(banId)) {
      return
    }
    this.queue.push(banId)
    this.save()
  }

  addAll(banIds: number[]) {
    this.queue.push(
      ...banIds.filter((id) => !this.alreadyProcessedBans.includes(id))
    )
    this.save()
  }

  shift() {
    const item = this.queue.shift()
    if (item) {
      this.alreadyProcessedBans.push(item)
      this.save()
    }
    return item
  }

  length() {
    return this.queue.length
  }

  save() {
    fs.writeFileSync('/data/bans-queue.json', JSON.stringify(this.queue))
  }

  load() {
    if (!fs.existsSync('/data/bans-queue.json')) {
      return
    }
    try {
      this.queue = JSON.parse(fs.readFileSync('/data/bans-queue.json', 'utf8'))
      console.log(`Loaded ${this.queue.length} bans from queue.`)
    } catch (e) {
      console.error('Broken bans-queue.json file. Resetting.', e)
      this.queue = []
      this.save()
    }
  }
}
