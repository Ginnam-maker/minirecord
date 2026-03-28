#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const ROOT_DIR = path.resolve(__dirname, '..')

const IGNORED_DIR_NAMES = new Set([
  '.git',
  'node_modules',
  'unpackage'
])

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.svg',
  '.zip', '.gz', '.7z', '.rar',
  '.mp3', '.mp4', '.mov', '.pdf',
  '.woff', '.woff2', '.ttf', '.eot'
])

const SECRET_RULES = [
  {
    name: 'API Key (sk-前缀)',
    regex: /\bsk-[A-Za-z0-9_-]{16,}\b/g
  },
  {
    name: 'Bearer Token',
    regex: /Bearer\s+[A-Za-z0-9._-]{20,}/g
  },
  {
    name: '私钥内容',
    regex: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/g
  },
  {
    name: '疑似密码字段',
    regex: /(?:password|passwd|secret|token)\s*[:=]\s*['\"][^'\"]{12,}['\"]/gi
  }
]

const SAFE_PLACEHOLDERS = [
  'sk-your-api-key-here',
  'sk-xxxxxxxx',
  'REPLACE_WITH_YOUR_API_KEY',
  'your_api_key',
  'your-api-key',
  'example',
  'placeholder',
  'demo',
  'test'
]

function normalizePath(filePath) {
  return filePath.split(path.sep).join('/')
}

function isIgnoredPath(filePath) {
  const relativePath = normalizePath(path.relative(ROOT_DIR, filePath))
  if (!relativePath || relativePath.startsWith('..')) {
    return true
  }

  const segments = relativePath.split('/')
  return segments.some((segment) => IGNORED_DIR_NAMES.has(segment))
}

function isLikelyBinary(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  return BINARY_EXTENSIONS.has(ext)
}

function isSafePlaceholderMatch(value) {
  const lowerValue = String(value || '').toLowerCase()
  return SAFE_PLACEHOLDERS.some((item) => lowerValue.includes(item))
}

function getTrackedFiles() {
  try {
    const output = execSync('git ls-files', {
      cwd: ROOT_DIR,
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8'
    })

    return output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((relativePath) => path.join(ROOT_DIR, relativePath))
  } catch (_) {
    return []
  }
}

function walkDirectory(currentPath, result) {
  const entries = fs.readdirSync(currentPath, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(currentPath, entry.name)

    if (entry.isDirectory()) {
      if (!IGNORED_DIR_NAMES.has(entry.name)) {
        walkDirectory(fullPath, result)
      }
      continue
    }

    result.push(fullPath)
  }
}

function getFilesToScan() {
  const trackedFiles = getTrackedFiles()
  if (trackedFiles.length > 0) {
    return trackedFiles.filter((filePath) => !isIgnoredPath(filePath) && !isLikelyBinary(filePath))
  }

  const allFiles = []
  walkDirectory(ROOT_DIR, allFiles)
  return allFiles.filter((filePath) => !isIgnoredPath(filePath) && !isLikelyBinary(filePath))
}

function scanFile(filePath) {
  let content

  try {
    content = fs.readFileSync(filePath, 'utf8')
  } catch (_) {
    return []
  }

  const findings = []
  const lines = content.split(/\r?\n/)

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]
    const lineNumber = index + 1

    for (const rule of SECRET_RULES) {
      rule.regex.lastIndex = 0
      const matches = line.match(rule.regex)
      if (!matches || matches.length === 0) {
        continue
      }

      for (const match of matches) {
        if (isSafePlaceholderMatch(match) || isSafePlaceholderMatch(line)) {
          continue
        }

        findings.push({
          filePath: normalizePath(path.relative(ROOT_DIR, filePath)),
          lineNumber,
          rule: rule.name,
          sample: match.length > 24 ? `${match.slice(0, 12)}...${match.slice(-6)}` : match
        })
      }
    }
  }

  return findings
}

function main() {
  const files = getFilesToScan()
  const findings = []

  for (const filePath of files) {
    findings.push(...scanFile(filePath))
  }

  if (findings.length === 0) {
    console.log('Secret scan passed: no suspected secrets found.')
    return
  }

  console.error('Secret scan failed: suspected secrets found.')
  findings.forEach((item) => {
    console.error(`- ${item.filePath}:${item.lineNumber} [${item.rule}] ${item.sample}`)
  })

  process.exitCode = 1
}

main()
