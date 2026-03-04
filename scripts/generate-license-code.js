#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const LICENSE_VERSION = 'MR1'

function toBase64Url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function parseArgs() {
  const rawArgs = process.argv.slice(2)
  const args = {}

  for (let i = 0; i < rawArgs.length; i += 1) {
    const token = rawArgs[i]
    if (!token.startsWith('--')) continue

    const key = token.slice(2)
    const value = rawArgs[i + 1]
    if (!value || value.startsWith('--')) {
      args[key] = true
    } else {
      args[key] = value
      i += 1
    }
  }

  return args
}

function resolveExpireAt(args) {
  if (args.permanent) {
    return null
  }

  if (args.expireAt) {
    const timestamp = Number(args.expireAt)
    if (!Number.isFinite(timestamp) || timestamp <= Date.now()) {
      throw new Error('--expireAt 必须是未来时间戳（毫秒）')
    }
    return timestamp
  }

  const days = Number(args.days || 365)
  if (!Number.isFinite(days) || days <= 0) {
    throw new Error('--days 必须是正数')
  }

  return Date.now() + days * 24 * 60 * 60 * 1000
}

function loadPrivateKey(args) {
  const keyPath = args.key || path.resolve(__dirname, 'secrets', 'license_private_key.pem')
  if (!fs.existsSync(keyPath)) {
    throw new Error(`私钥文件不存在: ${keyPath}`)
  }
  return fs.readFileSync(keyPath, 'utf8')
}

function createActivationCode(payload, privateKeyPem) {
  const payloadJson = JSON.stringify(payload)
  const payloadPart = toBase64Url(payloadJson)
  const signingInput = `${LICENSE_VERSION}.${payloadPart}`

  const signature = crypto.sign('RSA-SHA256', Buffer.from(signingInput, 'utf8'), privateKeyPem)
  const signaturePart = signature
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')

  return `${LICENSE_VERSION}.${payloadPart}.${signaturePart}`
}

function main() {
  const args = parseArgs()
  const privateKeyPem = loadPrivateKey(args)

  const maxMonthlySummaries = Number(args.limit || 100)
  if (!Number.isFinite(maxMonthlySummaries) || maxMonthlySummaries <= 0) {
    throw new Error('--limit 必须是正整数')
  }

  const payload = {
    plan: 'pro',
    maxMonthlySummaries,
    issuedAt: Date.now(),
    expireAt: resolveExpireAt(args)
  }

  const code = createActivationCode(payload, privateKeyPem)
  console.log(code)
}

try {
  main()
} catch (error) {
  console.error(`生成失败: ${error.message}`)
  process.exit(1)
}
