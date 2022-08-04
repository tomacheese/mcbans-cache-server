import fs from 'fs'

interface Config {
  db: {
    host: string
    port: number
    username: string
    password: string
    database: string
    type: 'mysql' | 'sqlite'
  }
}

export function getConfig() {
  const config = JSON.parse(
    fs.readFileSync('./config.json').toString()
  ) as Config
  return config
}
