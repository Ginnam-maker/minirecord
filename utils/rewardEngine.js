import { getApiConfig } from '@/utils/deepseek.js'

const REWARD_CONFIDENCE = {
  CONFIRMED: 80,
  PENDING: 60
}

function normalizeJsonText(text) {
  if (!text || typeof text !== 'string') {
    return ''
  }

  const trimmed = text.trim()
  const fenced = trimmed
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim()

  const start = fenced.indexOf('{')
  const end = fenced.lastIndexOf('}')

  if (start >= 0 && end > start) {
    return fenced.slice(start, end + 1)
  }

  return fenced
}

function normalizeRuleObject(parsed, originalText) {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('解析结果格式错误')
  }

  const reward = Number(parsed.reward)
  if (!Number.isFinite(reward) || reward <= 0) {
    throw new Error('规则奖励分必须大于 0')
  }

  const condition = parsed.condition && typeof parsed.condition === 'object'
    ? parsed.condition
    : {}

  return {
    id: parsed.rule_id || '',
    originalText,
    intent: String(parsed.intent || 'general'),
    condition: {
      metric: String(condition.metric || 'duration'),
      operator: String(condition.operator || '>='),
      value: Number(condition.value) || 1,
      unit: String(condition.unit || 'minutes')
    },
    reward,
    flexibility: parsed.flexibility === 'strict' ? 'strict' : 'lenient',
    enabled: true
  }
}

function buildRuleParsePrompt(ruleText) {
  return `请将用户的奖励规则解析为 JSON。
要求：
1. 只返回 JSON，不要返回额外说明。
2. 字段结构严格如下：
{
  "rule_id": "",
  "intent": "",
  "condition": {
    "metric": "duration|count|completion",
    "operator": ">=|>|<=|<|==|!=",
    "value": 0,
    "unit": "minutes|hours|times|percentage"
  },
  "reward": 1,
  "flexibility": "lenient|strict"
}
3. reward 必须是正整数。
4. 若原句偏模糊，请按最合理方式补全 condition。

用户规则：${ruleText}`
}

function buildLogMatchingPrompt(dailyLog, rules) {
  const rulesText = JSON.stringify(rules, null, 2)

  return `你是奖励规则判定引擎。请根据每日记录文本和规则列表，判断每条规则是否命中。
判定要求：
1. 显式数值优先：若文本出现明确时长/次数，按规则条件判断。
2. 对 flexibility=lenient 的规则，可进行隐式推断（例如“读了一会”）。
3. 若语义明显未达标，不要命中。
4. confidence 输出 0-100 的整数。
5. 仅返回 JSON，不要附加解释。

返回结构：
{
  "matches": [
    {
      "rule_id": "",
      "matched": true,
      "confidence": 0,
      "reason": ""
    }
  ]
}

每日记录：${dailyLog}
规则列表：${rulesText}`
}

async function requestChatCompletion(messages, maxTokens = 1200) {
  const apiConfig = getApiConfig()
  const type = uni.getStorageSync('ai_api_type') || 'default'

  if (!apiConfig.apiKey) {
    if (type === 'default') {
      throw new Error('请先在 config.js 中配置 deepseek.apiKey')
    }
    throw new Error('请先到设置页配置 API Key')
  }

  const url = apiConfig.baseURL.endsWith('/')
    ? `${apiConfig.baseURL}chat/completions`
    : `${apiConfig.baseURL}/chat/completions`

  const response = await uni.request({
    url,
    method: 'POST',
    header: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiConfig.apiKey}`
    },
    data: {
      model: apiConfig.model,
      messages,
      temperature: 0.2,
      max_tokens: maxTokens
    },
    timeout: 30000
  })

  if (response.statusCode === 200 && response.data?.choices?.length > 0) {
    return response.data.choices[0].message.content || ''
  }

  throw new Error(response.data?.error?.message || '奖励引擎调用失败')
}

export async function parseRewardRuleText(ruleText) {
  const text = String(ruleText || '').trim()
  if (!text) {
    return {
      success: false,
      error: '请输入规则内容'
    }
  }

  try {
    const content = await requestChatCompletion([
      {
        role: 'system',
        content: '你是严格的 JSON 解析器，只输出合法 JSON。'
      },
      {
        role: 'user',
        content: buildRuleParsePrompt(text)
      }
    ], 800)

    const jsonText = normalizeJsonText(content)
    const parsed = JSON.parse(jsonText)
    const rule = normalizeRuleObject(parsed, text)

    return {
      success: true,
      rule
    }
  } catch (error) {
    console.error('解析奖励规则失败:', error)
    return {
      success: false,
      error: error.message || '规则解析失败，请稍后重试'
    }
  }
}

export async function matchLogWithRules(dailyLog, rules = []) {
  const content = String(dailyLog || '').trim()
  const activeRules = Array.isArray(rules) ? rules.filter(rule => rule && rule.enabled !== false) : []

  if (!content || activeRules.length === 0) {
    return {
      success: true,
      matchedEntries: [],
      confirmedPoints: 0,
      pendingPoints: 0,
      totalPoints: 0
    }
  }

  const compactRules = activeRules.map(rule => ({
    rule_id: rule.id,
    original_text: rule.originalText,
    intent: rule.intent,
    condition: rule.condition,
    reward: rule.reward,
    flexibility: rule.flexibility || 'lenient'
  }))

  try {
    const responseText = await requestChatCompletion([
      {
        role: 'system',
        content: '你是奖励规则匹配器，只输出 JSON。'
      },
      {
        role: 'user',
        content: buildLogMatchingPrompt(content, compactRules)
      }
    ])

    const parsed = JSON.parse(normalizeJsonText(responseText))
    const matches = Array.isArray(parsed.matches) ? parsed.matches : []
    const byRuleId = new Map(matches.map(item => [String(item.rule_id || ''), item]))

    const matchedEntries = []
    let confirmedPoints = 0
    let pendingPoints = 0

    activeRules.forEach(rule => {
      const result = byRuleId.get(rule.id)
      if (!result || !result.matched) {
        return
      }

      const confidence = Math.max(0, Math.min(100, Number(result.confidence) || 0))
      if (confidence < REWARD_CONFIDENCE.PENDING) {
        return
      }

      const status = confidence >= REWARD_CONFIDENCE.CONFIRMED ? 'confirmed' : 'pending'
      if (status === 'confirmed') {
        confirmedPoints += Number(rule.reward)
      } else {
        pendingPoints += Number(rule.reward)
      }

      matchedEntries.push({
        ruleId: rule.id,
        ruleText: rule.originalText,
        points: Number(rule.reward),
        confidence,
        status,
        reason: String(result.reason || '')
      })
    })

    return {
      success: true,
      matchedEntries,
      confirmedPoints,
      pendingPoints,
      totalPoints: confirmedPoints + pendingPoints
    }
  } catch (error) {
    console.error('匹配奖励规则失败:', error)
    return {
      success: false,
      error: error.message || '奖励匹配失败，请稍后重试',
      matchedEntries: [],
      confirmedPoints: 0,
      pendingPoints: 0,
      totalPoints: 0
    }
  }
}
