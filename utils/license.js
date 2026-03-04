import jsrsasign from 'jsrsasign'
import {
  DEFAULT_FREE_MONTHLY_LIMIT,
  DEFAULT_PRO_MONTHLY_LIMIT,
  getCurrentMonthKey,
  getLicenseData,
  saveLicenseData,
  clearLicenseData,
  getSummaryQuotaUsage,
  saveSummaryQuotaUsage
} from '@/utils/storage.js'

const LICENSE_VERSION = 'MR1'

const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqPm22Igb54Rz/ti3WgNv
/A6fTiQ37tu9drV4POTUoHoBwGCl0IoZea8ZFwJaESw1awRFILRiXJ5zizcUO7vr
PSwsgpOESiFv67GuwrUzCD/pLrS3aSwdZ+XUsl+BTX2/uAEnyt5aGhi/hscRlfcl
+Qaqn/qPcQgJFm715vCdNly9yqnzd15aM2NdalYGzNSQTntgqZ9onXpNQ/2VxG/F
GEekF5CAtUgdRAsVz3cQUjOTFc/mgPi17ZSL3BiE59nYzvFoubhmk2JCPSBZwV77
8fj79CeRf9vrkN/jnymrAy7BYppg8zAuwpRdfF35alpk3zsi2DByioPO6ZpkrB7W
yQIDAQAB
-----END PUBLIC KEY-----`

function hasUsablePublicKey() {
  return !/REPLACE_WITH_YOUR_RSA_PUBLIC_KEY/.test(PUBLIC_KEY_PEM)
}

function decodePayload(payloadPart) {
  try {
    const text = jsrsasign.b64utoutf8(payloadPart)
    return JSON.parse(text)
  } catch (error) {
    return null
  }
}

function verifySignature(signingInput, signaturePart) {
  if (!hasUsablePublicKey()) {
    return {
      valid: false,
      message: '尚未配置 RSA 公钥，请联系管理员。'
    }
  }

  try {
    const verifier = new jsrsasign.KJUR.crypto.Signature({ alg: 'SHA256withRSA' })
    verifier.init(PUBLIC_KEY_PEM)
    verifier.updateString(signingInput)
    const signatureHex = jsrsasign.b64utohex(signaturePart)
    const valid = verifier.verify(signatureHex)
    return {
      valid,
      message: valid ? '' : '激活码签名无效'
    }
  } catch (error) {
    console.error('验签失败:', error)
    return {
      valid: false,
      message: '激活码验签失败'
    }
  }
}

function isLicenseExpired(expireAt) {
  if (!expireAt) return false
  const timestamp = Number(expireAt)
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return true
  }
  return Date.now() > timestamp
}

function buildBaseProfile() {
  return {
    userType: 'free',
    isPro: false,
    monthlyLimit: DEFAULT_FREE_MONTHLY_LIMIT,
    expireAt: null,
    activatedAt: null,
    licenseVersion: null
  }
}

function getValidLicenseData() {
  const data = getLicenseData()
  if (!data) return null

  if (!data.isPro) {
    return null
  }

  if (isLicenseExpired(data.expireAt)) {
    clearLicenseData()
    return null
  }

  return data
}

function getCurrentMonthlyUsage(limit) {
  const monthKey = getCurrentMonthKey()
  const usage = getSummaryQuotaUsage()
  const currentMonth = usage.monthly?.[monthKey] || {}
  const used = Math.max(0, Number(currentMonth.used || 0))
  const safeLimit = Math.max(0, Number(limit || 0))
  const remaining = Math.max(0, safeLimit - used)

  return {
    monthKey,
    used,
    remaining,
    limit: safeLimit,
    usage
  }
}

export function getUserLicenseProfile() {
  const base = buildBaseProfile()
  const license = getValidLicenseData()

  if (!license) {
    return base
  }

  return {
    userType: 'pro',
    isPro: true,
    monthlyLimit: Number(license.maxMonthlySummaries || DEFAULT_PRO_MONTHLY_LIMIT),
    expireAt: license.expireAt || null,
    activatedAt: license.activatedAt || null,
    licenseVersion: license.version || LICENSE_VERSION
  }
}

export function getSummaryQuotaSnapshot() {
  const profile = getUserLicenseProfile()
  const monthlyUsage = getCurrentMonthlyUsage(profile.monthlyLimit)

  return {
    userType: profile.userType,
    isPro: profile.isPro,
    limit: monthlyUsage.limit,
    used: monthlyUsage.used,
    remaining: monthlyUsage.remaining,
    monthKey: monthlyUsage.monthKey,
    expireAt: profile.expireAt
  }
}

export function canConsumeSummaryQuota() {
  const snapshot = getSummaryQuotaSnapshot()

  if (snapshot.remaining <= 0) {
    return {
      ...snapshot,
      allowed: false,
      message: `本月周总结次数已用完（${snapshot.used}/${snapshot.limit}）`
    }
  }

  return {
    ...snapshot,
    allowed: true,
    message: ''
  }
}

export function consumeSummaryQuota() {
  const check = canConsumeSummaryQuota()
  if (!check.allowed) {
    return {
      success: false,
      ...check
    }
  }

  const usage = check.usage || getSummaryQuotaUsage()
  const monthKey = check.monthKey
  const currentMonth = usage.monthly?.[monthKey] || {}
  const used = Math.max(0, Number(currentMonth.used || 0)) + 1

  const nextUsage = {
    ...usage,
    monthly: {
      ...(usage.monthly || {}),
      [monthKey]: {
        used,
        limit: check.limit,
        updateTime: Date.now()
      }
    },
    updateTime: Date.now()
  }

  const success = saveSummaryQuotaUsage(nextUsage)
  if (!success) {
    return {
      success: false,
      ...check,
      message: '扣减次数失败，请稍后重试'
    }
  }

  return {
    success: true,
    ...check,
    used,
    remaining: Math.max(0, check.limit - used)
  }
}

export function activateWithCode(code) {
  const raw = String(code || '').trim()
  if (!raw) {
    return {
      success: false,
      message: '激活码不能为空'
    }
  }

  const parts = raw.split('.')
  if (parts.length !== 3) {
    return {
      success: false,
      message: '激活码格式错误'
    }
  }

  const [version, payloadPart, signaturePart] = parts
  if (version !== LICENSE_VERSION) {
    return {
      success: false,
      message: '激活码版本不支持'
    }
  }

  const payload = decodePayload(payloadPart)
  if (!payload) {
    return {
      success: false,
      message: '激活码内容无效'
    }
  }

  const verifyResult = verifySignature(`${version}.${payloadPart}`, signaturePart)
  if (!verifyResult.valid) {
    return {
      success: false,
      message: verifyResult.message
    }
  }

  if (payload.plan !== 'pro') {
    return {
      success: false,
      message: '激活码套餐无效'
    }
  }

  if (payload.expireAt && isLicenseExpired(payload.expireAt)) {
    return {
      success: false,
      message: '激活码已过期'
    }
  }

  const maxMonthlySummaries = Math.max(
    1,
    Number(payload.maxMonthlySummaries || DEFAULT_PRO_MONTHLY_LIMIT)
  )

  const profile = {
    version,
    isPro: true,
    plan: 'pro',
    activatedAt: Date.now(),
    expireAt: payload.expireAt ? Number(payload.expireAt) : null,
    maxMonthlySummaries,
    payload,
    signature: signaturePart,
    raw
  }

  const saved = saveLicenseData(profile)
  if (!saved) {
    return {
      success: false,
      message: '激活信息保存失败'
    }
  }

  return {
    success: true,
    message: '激活成功',
    profile: getUserLicenseProfile()
  }
}

export function clearActivation() {
  return clearLicenseData()
}
