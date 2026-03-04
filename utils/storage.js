/**
 * 本地存储工具函数
 */

const STORAGE_KEYS = {
  RECORDS: 'daily_records', // 每日记录
  SUMMARIES: 'weekly_summaries', // 周总结历史
  LAST_CHECK: 'last_summary_check', // 上次检查总结的时间
  SUMMARY_PROMPT_TEMPLATE: 'summary_prompt_template', // 周总结 Prompt 模板
  USER_LICENSE: 'user_license_profile', // 用户授权信息
  SUMMARY_QUOTA_USAGE: 'summary_quota_usage' // 周总结配额使用情况
}

export const DEFAULT_FREE_MONTHLY_LIMIT = 5
export const DEFAULT_PRO_MONTHLY_LIMIT = 100

export function getCurrentMonthKey(date = new Date()) {
  const currentDate = date instanceof Date ? date : new Date(date)
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
    const timestamp = new Date(date).getTime()
    if (timestamp >= startTime && timestamp <= endTime) {
      result.push(record)
    }
  }
  
  // 按日期排序
  result.sort((a, b) => new Date(a.date) - new Date(b.date))
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
