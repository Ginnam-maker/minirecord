/**
 * 本地存储工具函数
 */

const STORAGE_KEYS = {
  RECORDS: 'daily_records', // 每日记录
  SUMMARIES: 'weekly_summaries', // 周总结历史
  LAST_CHECK: 'last_summary_check', // 上次检查总结的时间
  SUMMARY_PROMPT_TEMPLATE: 'summary_prompt_template', // 周总结 Prompt 模板
  USER_LICENSE: 'user_license_profile', // 用户授权信息
  SUMMARY_QUOTA_USAGE: 'summary_quota_usage', // 周总结配额使用情况
  REWARD_RULES: 'reward_rules', // 奖励规则
  REWARD_POINTS_LOG: 'reward_points_log', // 奖励积分流水
  REWARD_PRIZES: 'reward_prizes' // 奖品兑换配置
}

export const DEFAULT_FREE_MONTHLY_LIMIT = 5
export const DEFAULT_PRO_MONTHLY_LIMIT = 100

function createLocalId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function normalizeRewardRule(rule) {
  if (!rule || typeof rule !== 'object') return null

  const reward = Number(rule.reward)
  if (!Number.isFinite(reward) || reward <= 0) {
    return null
  }

  const now = Date.now()
  const flexibility = rule.flexibility === 'strict' ? 'strict' : 'lenient'

  return {
    id: typeof rule.id === 'string' && rule.id.trim() ? rule.id : createLocalId('rule'),
    originalText: String(rule.originalText || '').trim(),
    intent: String(rule.intent || 'general'),
    condition: rule.condition && typeof rule.condition === 'object' ? rule.condition : null,
    reward,
    flexibility,
    enabled: rule.enabled !== false,
    createTime: Number(rule.createTime) || now,
    updateTime: Number(rule.updateTime) || now
  }
}

function normalizeRewardPointLog(item) {
  if (!item || typeof item !== 'object') return null

  const points = Number(item.points)
  if (!Number.isFinite(points) || points <= 0) {
    return null
  }

  const status = item.status === 'pending' || item.status === 'revoked' ? item.status : 'confirmed'

  return {
    id: typeof item.id === 'string' && item.id.trim() ? item.id : createLocalId('point'),
    date: String(item.date || '').trim(),
    ruleId: String(item.ruleId || '').trim(),
    ruleText: String(item.ruleText || '').trim(),
    points,
    confidence: Number(item.confidence) || 0,
    status,
    reason: String(item.reason || '').trim(),
    manualOverride: Boolean(item.manualOverride),
    createTime: Number(item.createTime) || Date.now(),
    updateTime: Number(item.updateTime) || Date.now()
  }
}

function normalizeRewardPrize(item) {
  if (!item || typeof item !== 'object') return null

  const name = String(item.name || '').trim()
  const cost = Number(item.cost)
  if (!name || !Number.isFinite(cost) || cost <= 0) {
    return null
  }

  const now = Date.now()

  return {
    id: typeof item.id === 'string' && item.id.trim() ? item.id : createLocalId('prize'),
    name,
    cost: Math.floor(cost),
    description: String(item.description || '').trim(),
    enabled: item.enabled !== false,
    createTime: Number(item.createTime) || now,
    updateTime: Number(item.updateTime) || now
  }
}

function parseYmdToLocalDate(dateStr) {
  if (typeof dateStr !== 'string') return null

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim())
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day, 0, 0, 0, 0)

  // 无效日期（如 2026-02-30）会在构造时溢出，需要回查校验
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null
  }

  return date
}

function getDateKeyTimestamp(dateStr) {
  const date = parseYmdToLocalDate(dateStr)
  return date ? date.getTime() : NaN
}

function toSafeDate(input) {
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input
  }

  if (typeof input === 'number' && Number.isFinite(input)) {
    const date = new Date(input)
    return Number.isNaN(date.getTime()) ? null : date
  }

  if (typeof input === 'string') {
    const trimmed = input.trim()
    const ymdDate = parseYmdToLocalDate(trimmed)
    if (ymdDate) {
      return ymdDate
    }

    if (/^\d+$/.test(trimmed)) {
      const timestamp = Number(trimmed)
      if (Number.isFinite(timestamp)) {
        const date = new Date(timestamp)
        return Number.isNaN(date.getTime()) ? null : date
      }
    }
  }

  return null
}

export function getCurrentMonthKey(date = new Date()) {
  const currentDate = toSafeDate(date) || new Date()

  const year = currentDate.getFullYear()
  const month = String(currentDate.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

/**
 * 获取所有记录
 * @returns {Object} {date: content}
 */
export function getRecords() {
  try {
    const data = uni.getStorageSync(STORAGE_KEYS.RECORDS)
    return data || {}
  } catch (error) {
    console.error('读取记录失败:', error)
    return {}
  }
}

/**
 * 保存记录
 * @param {string} date 日期 YYYY-MM-DD
 * @param {string} content 内容
 */
export function saveRecord(date, content) {
  try {
    const records = getRecords()
    records[date] = {
      date,
      content,
      updateTime: Date.now()
    }
    uni.setStorageSync(STORAGE_KEYS.RECORDS, records)
    return true
  } catch (error) {
    console.error('保存记录失败:', error)
    return false
  }
}

/**
 * 删除记录
 * @param {string} date 日期 YYYY-MM-DD
 */
export function deleteRecord(date) {
  try {
    const records = getRecords()
    delete records[date]
    uni.setStorageSync(STORAGE_KEYS.RECORDS, records)
    return true
  } catch (error) {
    console.error('删除记录失败:', error)
    return false
  }
}

/**
 * 获取指定日期范围的记录
 * @param {number} startTime 开始时间戳
 * @param {number} endTime 结束时间戳
 * @returns {Array} [{date, content, updateTime}]
 */
export function getRecordsByRange(startTime, endTime) {
  const records = getRecords()
  const result = []
  
  for (const [date, record] of Object.entries(records)) {
    const timestamp = getDateKeyTimestamp(date)
    if (Number.isNaN(timestamp)) {
      continue
    }

    if (timestamp >= startTime && timestamp <= endTime) {
      result.push(record)
    }
  }
  
  // 按日期排序
  result.sort((a, b) => getDateKeyTimestamp(a.date) - getDateKeyTimestamp(b.date))
  return result
}

/**
 * 保存周总结
 * @param {string} weekLabel 周标签
 * @param {string} summary 总结内容
 * @param {Array} records 相关记录
 */
export function saveSummary(weekLabel, summary, records) {
  try {
    const summaries = getSummaries()
    const id = `summary_${Date.now()}`
    summaries[id] = {
      id,
      weekLabel,
      summary,
      records,
      createTime: Date.now()
    }
    uni.setStorageSync(STORAGE_KEYS.SUMMARIES, summaries)
    return id
  } catch (error) {
    console.error('保存总结失败:', error)
    return null
  }
}

/**
 * 获取所有周总结
 * @returns {Array} 总结列表（按时间倒序）
 */
export function getSummaries() {
  try {
    const data = uni.getStorageSync(STORAGE_KEYS.SUMMARIES)
    return data || {}
  } catch (error) {
    console.error('读取总结失败:', error)
    return {}
  }
}

/**
 * 获取总结列表（数组格式）
 * @returns {Array}
 */
export function getSummaryList() {
  const summaries = getSummaries()
  return Object.values(summaries).sort((a, b) => b.createTime - a.createTime)
}

/**
 * 更新上次检查时间
 */
export function updateLastCheckTime() {
  try {
    uni.setStorageSync(STORAGE_KEYS.LAST_CHECK, Date.now())
  } catch (error) {
    console.error('更新检查时间失败:', error)
  }
}

/**
 * 获取上次检查时间
 * @returns {number} 时间戳
 */
export function getLastCheckTime() {
  try {
    return uni.getStorageSync(STORAGE_KEYS.LAST_CHECK) || 0
  } catch (error) {
    console.error('读取检查时间失败:', error)
    return 0
  }
}

/**
 * 是否今天已检查过
 * @returns {boolean}
 */
export function isCheckedToday() {
  const lastCheck = getLastCheckTime()
  if (!lastCheck) return false
  
  const lastCheckDate = new Date(lastCheck)
  const today = new Date()
  
  return lastCheckDate.toDateString() === today.toDateString()
}

/**
 * 获取周总结 Prompt 模板
 * @returns {string}
 */
export function getSummaryPromptTemplate() {
  try {
    return uni.getStorageSync(STORAGE_KEYS.SUMMARY_PROMPT_TEMPLATE) || ''
  } catch (error) {
    console.error('读取 Prompt 模板失败:', error)
    return ''
  }
}

/**
 * 保存周总结 Prompt 模板
 * @param {string} template 模板内容
 * @returns {boolean}
 */
export function saveSummaryPromptTemplate(template) {
  try {
    uni.setStorageSync(STORAGE_KEYS.SUMMARY_PROMPT_TEMPLATE, template)
    return true
  } catch (error) {
    console.error('保存 Prompt 模板失败:', error)
    return false
  }
}

/**
 * 清空周总结 Prompt 模板
 * @returns {boolean}
 */
export function clearSummaryPromptTemplate() {
  try {
    uni.removeStorageSync(STORAGE_KEYS.SUMMARY_PROMPT_TEMPLATE)
    return true
  } catch (error) {
    console.error('清空 Prompt 模板失败:', error)
    return false
  }
}

/**
 * 获取授权信息
 * @returns {Object|null}
 */
export function getLicenseData() {
  try {
    return uni.getStorageSync(STORAGE_KEYS.USER_LICENSE) || null
  } catch (error) {
    console.error('读取授权信息失败:', error)
    return null
  }
}

/**
 * 保存授权信息
 * @param {Object} data 授权信息
 * @returns {boolean}
 */
export function saveLicenseData(data) {
  try {
    uni.setStorageSync(STORAGE_KEYS.USER_LICENSE, data)
    return true
  } catch (error) {
    console.error('保存授权信息失败:', error)
    return false
  }
}

/**
 * 清空授权信息
 * @returns {boolean}
 */
export function clearLicenseData() {
  try {
    uni.removeStorageSync(STORAGE_KEYS.USER_LICENSE)
    return true
  } catch (error) {
    console.error('清空授权信息失败:', error)
    return false
  }
}

/**
 * 获取周总结配额使用数据
 * @returns {Object}
 */
export function getSummaryQuotaUsage() {
  try {
    const data = uni.getStorageSync(STORAGE_KEYS.SUMMARY_QUOTA_USAGE)
    if (!data || typeof data !== 'object') {
      return { monthly: {} }
    }

    if (!data.monthly || typeof data.monthly !== 'object') {
      return {
        ...data,
        monthly: {}
      }
    }

    return data
  } catch (error) {
    console.error('读取周总结配额失败:', error)
    return { monthly: {} }
  }
}

/**
 * 保存周总结配额使用数据
 * @param {Object} usage 配额数据
 * @returns {boolean}
 */
export function saveSummaryQuotaUsage(usage) {
  try {
    uni.setStorageSync(STORAGE_KEYS.SUMMARY_QUOTA_USAGE, usage)
    return true
  } catch (error) {
    console.error('保存周总结配额失败:', error)
    return false
  }
}

/**
 * 获取奖励规则列表
 * @returns {Array}
 */
export function getRewardRules() {
  try {
    const data = uni.getStorageSync(STORAGE_KEYS.REWARD_RULES)
    if (!Array.isArray(data)) {
      return []
    }

    return data
      .map(normalizeRewardRule)
      .filter(Boolean)
      .sort((a, b) => b.updateTime - a.updateTime)
  } catch (error) {
    console.error('读取奖励规则失败:', error)
    return []
  }
}

/**
 * 保存奖励规则列表
 * @param {Array} rules
 * @returns {boolean}
 */
export function saveRewardRules(rules) {
  try {
    const list = Array.isArray(rules)
      ? rules.map(normalizeRewardRule).filter(Boolean)
      : []
    uni.setStorageSync(STORAGE_KEYS.REWARD_RULES, list)
    return true
  } catch (error) {
    console.error('保存奖励规则失败:', error)
    return false
  }
}

/**
 * 新增或更新奖励规则
 * @param {Object} rule
 * @returns {Object|null}
 */
export function upsertRewardRule(rule) {
  const normalized = normalizeRewardRule(rule)
  if (!normalized) {
    return null
  }

  const list = getRewardRules()
  const index = list.findIndex(item => item.id === normalized.id)

  if (index >= 0) {
    normalized.createTime = list[index].createTime
    list[index] = normalized
  } else {
    list.unshift(normalized)
  }

  const success = saveRewardRules(list)
  return success ? normalized : null
}

/**
 * 删除奖励规则
 * @param {string} ruleId
 * @returns {boolean}
 */
export function deleteRewardRule(ruleId) {
  if (!ruleId) return false

  const list = getRewardRules().filter(item => item.id !== ruleId)
  return saveRewardRules(list)
}

/**
 * 获取启用中的奖励规则
 * @returns {Array}
 */
export function getActiveRewardRules() {
  return getRewardRules().filter(item => item.enabled !== false)
}

/**
 * 获取奖励积分流水
 * @returns {Array}
 */
export function getRewardPointsLog() {
  try {
    const data = uni.getStorageSync(STORAGE_KEYS.REWARD_POINTS_LOG)
    if (!Array.isArray(data)) {
      return []
    }

    return data
      .map(normalizeRewardPointLog)
      .filter(item => item && item.date)
      .sort((a, b) => b.createTime - a.createTime)
  } catch (error) {
    console.error('读取奖励积分流水失败:', error)
    return []
  }
}

/**
 * 保存奖励积分流水
 * @param {Array} logs
 * @returns {boolean}
 */
export function saveRewardPointsLog(logs) {
  try {
    const list = Array.isArray(logs)
      ? logs.map(normalizeRewardPointLog).filter(item => item && item.date)
      : []
    uni.setStorageSync(STORAGE_KEYS.REWARD_POINTS_LOG, list)
    return true
  } catch (error) {
    console.error('保存奖励积分流水失败:', error)
    return false
  }
}

/**
 * 计算奖励积分统计
 * @param {Array} logs
 * @returns {Object}
 */
export function getRewardPointsOverview(logs = getRewardPointsLog()) {
  return logs.reduce((result, item) => {
    if (item.status === 'revoked') {
      return result
    }

    if (item.status === 'pending') {
      result.pendingPoints += item.points
    } else {
      result.confirmedPoints += item.points
    }

    result.totalPoints = result.confirmedPoints + result.pendingPoints
    return result
  }, {
    confirmedPoints: 0,
    pendingPoints: 0,
    totalPoints: 0
  })
}

/**
 * 获取某一天的奖励积分
 * @param {string} date
 * @param {boolean} includeRevoked
 * @returns {Array}
 */
export function getRewardPointsByDate(date, includeRevoked = false) {
  if (!date) return []

  const logs = getRewardPointsLog()
  return logs.filter(item => {
    if (item.date !== date) return false
    if (!includeRevoked && item.status === 'revoked') return false
    return true
  })
}

/**
 * 替换某天积分流水（用于同日重算）
 * @param {string} date
 * @param {Array} entries
 * @returns {Object}
 */
export function replaceRewardPointsForDate(date, entries = []) {
  if (!date) {
    return getRewardPointsOverview()
  }

  const existing = getRewardPointsLog().filter(item => item.date !== date)
  const normalizedEntries = Array.isArray(entries)
    ? entries
      .map(item => normalizeRewardPointLog({ ...item, date }))
      .filter(Boolean)
    : []

  const next = existing.concat(normalizedEntries)
  saveRewardPointsLog(next)
  return getRewardPointsOverview(next)
}

/**
 * 清空某天积分流水
 * @param {string} date
 * @returns {Object}
 */
export function clearRewardPointsByDate(date) {
  if (!date) {
    return getRewardPointsOverview()
  }

  const next = getRewardPointsLog().filter(item => item.date !== date)
  saveRewardPointsLog(next)
  return getRewardPointsOverview(next)
}

/**
 * 撤销待确认积分
 * @param {string} pointId
 * @returns {Object}
 */
export function revokePendingRewardPoint(pointId) {
  if (!pointId) {
    return {
      success: false,
      error: '缺少积分记录标识'
    }
  }

  const logs = getRewardPointsLog()
  const index = logs.findIndex(item => item.id === pointId)

  if (index < 0) {
    return {
      success: false,
      error: '未找到对应的积分记录'
    }
  }

  const target = logs[index]
  if (target.status === 'revoked') {
    return {
      success: true,
      entry: target,
      stats: getRewardPointsOverview(logs)
    }
  }

  logs[index] = {
    ...target,
    status: 'revoked',
    manualOverride: true,
    updateTime: Date.now()
  }

  saveRewardPointsLog(logs)
  return {
    success: true,
    entry: logs[index],
    stats: getRewardPointsOverview(logs)
  }
}

/**
 * 获取奖品配置
 * @returns {Array}
 */
export function getRewardPrizes() {
  try {
    const data = uni.getStorageSync(STORAGE_KEYS.REWARD_PRIZES)
    if (!Array.isArray(data)) {
      return []
    }

    return data
      .map(normalizeRewardPrize)
      .filter(Boolean)
      .sort((a, b) => b.updateTime - a.updateTime)
  } catch (error) {
    console.error('读取奖品配置失败:', error)
    return []
  }
}

/**
 * 保存奖品配置
 * @param {Array} prizes
 * @returns {boolean}
 */
export function saveRewardPrizes(prizes) {
  try {
    const list = Array.isArray(prizes)
      ? prizes.map(normalizeRewardPrize).filter(Boolean)
      : []
    uni.setStorageSync(STORAGE_KEYS.REWARD_PRIZES, list)
    return true
  } catch (error) {
    console.error('保存奖品配置失败:', error)
    return false
  }
}

/**
 * 新增或更新奖品
 * @param {Object} prize
 * @returns {Object|null}
 */
export function upsertRewardPrize(prize) {
  const normalized = normalizeRewardPrize(prize)
  if (!normalized) {
    return null
  }

  const list = getRewardPrizes()
  const index = list.findIndex(item => item.id === normalized.id)

  if (index >= 0) {
    normalized.createTime = list[index].createTime
    list[index] = normalized
  } else {
    list.unshift(normalized)
  }

  const success = saveRewardPrizes(list)
  return success ? normalized : null
}

/**
 * 删除奖品
 * @param {string} prizeId
 * @returns {boolean}
 */
export function deleteRewardPrize(prizeId) {
  if (!prizeId) return false

  const list = getRewardPrizes().filter(item => item.id !== prizeId)
  return saveRewardPrizes(list)
}
