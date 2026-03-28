import config from '@/config.js'
import { getSummaryPromptTemplate } from '@/utils/storage.js'

export const DEFAULT_WEEKLY_SUMMARY_PROMPT = `你是一个专业的个人成长顾问。以下是用户过去一周的每日记录：

{{records}}

请根据这些记录，生成一份周总结复盘报告，包含以下内容：
1. 本周主要活动和成就总结
2. 时间分配分析（工作、学习、生活等）
3. 发现的亮点和值得继续保持的地方
4. 需要改进的方面
5. 下周的建议和行动计划

请用简洁、友好的语气，帮助用户更好地认识自己的一周。`

export function buildWeeklySummaryPrompt(recordsText) {
  const customTemplate = getSummaryPromptTemplate().trim()
  const template = customTemplate || DEFAULT_WEEKLY_SUMMARY_PROMPT
  if (/\{\{records\}\}/.test(template)) {
    return template.replace(/\{\{records\}\}/g, recordsText)
  }
  return `${template}\n\n本周记录：\n${recordsText}`
}

/**
 * 获取请求参数
 * 根据 storage 配置生成不同 API 提供商的请求参数
 */
function getApiConfig() {
  const type = uni.getStorageSync('ai_api_type') || 'deepseek'
  const defaultKey = uni.getStorageSync('ai_api_key_default') || ''
  
  if (type === 'custom') {
    return {
      baseURL: uni.getStorageSync('ai_custom_api_base_url') || '',
      apiKey: uni.getStorageSync('ai_custom_api_key') || '',
      model: uni.getStorageSync('ai_custom_model') || ''
    }
  } else if (type === 'moonshot') {
    return {
      baseURL: 'https://api.moonshot.cn/v1',
      apiKey: defaultKey,
      model: 'moonshot-v1-8k'
    }
  } else if (type === 'qwen') {
    return {
      baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      apiKey: defaultKey,
      model: 'qwen-plus'
    }
  } else if (type === 'zhipu') {
    return {
      baseURL: 'https://open.bigmodel.cn/api/paas/v4',
      apiKey: defaultKey,
      model: 'glm-4'
    }
  } else if (type === 'siliconflow') {
    return {
      baseURL: 'https://api.siliconflow.cn/v1',
      apiKey: defaultKey,
      model: 'deepseek-ai/DeepSeek-V3' // 默认使用硅基流动的 DeepSeek V3 接口
    }
  } else {
    // deepseek
    return {
      baseURL: config.deepseek.baseURL || 'https://api.deepseek.com/v1',
      apiKey: defaultKey || config.deepseek.apiKey,
      model: config.deepseek.model || 'deepseek-chat'
    }
  }
}

/**
 * 调用 API 生成周总结
 * @param {Array} records 一周的记录列表 [{date, content}]
 * @returns {Promise<string>} 总结内容
 */
export async function generateWeeklySummary(records) {
  const apiConfig = getApiConfig()
  
  if (!apiConfig.apiKey) {
    throw new Error('请先到设置页配置 API Key')
  }
  
  if (!records || records.length === 0) {
    throw new Error('本周暂无记录')
  }
  
  // 构建提示词
  const recordsText = records.map(r => `${r.date}: ${r.content}`).join('\n')
  const prompt = buildWeeklySummaryPrompt(recordsText)

  try {
    const url = apiConfig.baseURL.endsWith('/') ? 
                `${apiConfig.baseURL}chat/completions` : 
                `${apiConfig.baseURL}/chat/completions`
                
    const response = await uni.request({
      url: url,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiConfig.apiKey}`
      },
      data: {
        model: apiConfig.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      },
      timeout: 30000
    })
    
    if (response.statusCode === 200 && response.data.choices && response.data.choices.length > 0) {
      return response.data.choices[0].message.content
    } else {
      throw new Error(response.data.error?.message || 'API 调用失败')
    }
  } catch (error) {
    console.error('API 调用失败:', error)
    throw new Error(`生成总结失败: ${error.errMsg || error.message}`)
  }
}

/**
 * 获取指定周的日期范围
 * @param {Date} date 参考日期
 * @returns {Object} {startDate, endDate, weekLabel}
 */
export function getWeekRange(date = new Date()) {
  const current = new Date(date)
  const day = current.getDay()
  const diff = day === 0 ? -6 : 1 - day // 周一为一周的开始
  
  const startDate = new Date(current)
  startDate.setDate(current.getDate() + diff)
  startDate.setHours(0, 0, 0, 0)
  
  const endDate = new Date(startDate)
  endDate.setDate(startDate.getDate() + 6)
  endDate.setHours(23, 59, 59, 999)
  
  const weekLabel = `${formatDate(startDate, 'MM-DD')} ~ ${formatDate(endDate, 'MM-DD')}`
  
  return {
    startDate: startDate.getTime(),
    endDate: endDate.getTime(),
    weekLabel
  }
}

/**
 * 格式化日期
 * @param {Date|number} date 日期对象或时间戳
 * @param {string} format 格式 (YYYY-MM-DD, MM-DD等)
 * @returns {string} 格式化后的日期字符串
 */
export function formatDate(date, format = 'YYYY-MM-DD') {
  const d = typeof date === 'number' ? new Date(date) : date
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
}

/**
 * 检查是否需要自动触发周总结
 * @returns {boolean}
 */
export function shouldAutoTrigger() {
  if (!config.summary.autoEnabled) {
    return false
  }
  
  const today = new Date().getDay()
  return today === config.summary.autoTriggerDay
}
