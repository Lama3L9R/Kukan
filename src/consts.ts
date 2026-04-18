import dayjs from 'dayjs'
import fs from 'fs'
import path from 'path'

export const SITE_TITLE = 'lamadaemon.blog'
export const SITE_DESCRIPTION = '前后端 | 电子 | 嵌入式 | 逆向 | 喜欢老技术但是新技术'
export const COPYRIGHT = 'lamadaemon. All rights reserved.'

export const GITHUB = "https://github.com/Lama3L9R"
export const EMAIL = "mailto:i@lama.icu"
export const TG = "https://t.me/hereLamadaemon"

export let BUILD_INFO = {
    buildTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    commitHash: "ffffff",
    branch: "master",
    ci: "local",
    buildNum: "1",
    buildType: "dev",
    tag: "1.0"
}

export const ENABLE_LINK = false

const infoPath = path.resolve(process.cwd(), 'build.json')

if (fs.existsSync(infoPath)) {
    const fileContent = fs.readFileSync(infoPath, 'utf-8')
    BUILD_INFO = JSON.parse(fileContent)
}