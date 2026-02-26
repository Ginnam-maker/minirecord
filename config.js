// 应用配置文件
export default {
  // DeepSeek API 配置
  deepseek: {
    apiKey: 'sk-0a1c6bea0a2c4af8928ea9b00912cdbb', // 请填入你的 DeepSeek API Key
    baseURL: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat'
  },
  
  // 周总结配置
  summary: {
    // 自动触发周总结的星期几 (1=周一, 0=周日)
    autoTriggerDay: 1,
    // 是否启用自动总结
    autoEnabled: true
  }
}
