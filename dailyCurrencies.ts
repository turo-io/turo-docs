import got from 'got'
import { Octokit } from '@octokit/rest'
import { config } from 'dotenv'

config()

const ok = new Octokit({
  auth: process.env.AUTH_TOKEN
})

const alias = {
  EUR: ['€'],
  GBP: ['£'],
  CAD: ['C$', 'Can$'],
  INR: ['₹'],
  ZWL: ['Z$'],
  BTC: ['฿', '₿'],
  RON: ['lei']
} as any

type Latest = {
  base: string,
  date: string,
  rates: {
    [key: string]: number
  }
}

async function run() {
  let src = '';

  const response = await got('https://api.exchangerate.host/currencies.json?base=USD');
  const latest: Latest = JSON.parse(response.body)

  src += `unit('USD', 'CURRENCY', ['$'])\n`

  Object.keys(latest.rates).forEach(cur => {
    let al = []
    if (alias[cur] != null) {
      al = alias[cur].map((v: string) => `'${v}'`).join(',')
    }
    src += `unit('${cur}', ${latest.rates[cur]} $, [${al}])\n`
  })

  const share = {
    owner: 'turo-io',
    repo: 'turo-docs',
  }

  let sha = undefined
  let manifestSha = undefined

  const today = (new Date()).toISOString().slice(0,10)

  const path = `currency/${today}.turo`


  try {
    const content = await ok.repos.getContent({
      ...share,
      path
    }) as any
    sha = content.data.sha

    const manifest = await ok.repos.getContent({
      ...share,
      path: 'manifest.json'
    }) as any

    manifestSha = manifest.data.sha
  } catch(err) {
    console.info('file does not exist')
  }

  try {
    await ok.repos.createOrUpdateFileContents({
      ...share,
      content: Buffer.from(src).toString("base64"),
      message: 'Upload daily currency turo units',
      sha,
      path,
      branch: 'main'
    })

    await ok.repos.createOrUpdateFileContents({
      ...share,
      content: Buffer.from(`{"currency": "${path}"}`).toString("base64"),
      message: 'Update manifest json',
      sha: manifestSha,
      path: 'manifest.json',
      branch: 'main'
    })

  } catch (err) {
    console.error('create or update file contents errored')
    console.error(err)
    process.exit(2)
  }
}

run()
