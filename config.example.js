// 示例配置文件（可提交到仓库）
// 使用方式：复制本文件为 config.js，并填写你自己的私有配置。
export default {
  deepseek: {
    apiKey: '',
    baseURL: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat'
  },

  summary: {
    // 自动触发周总结的星期几 (1=周一, 0=周日)
    autoTriggerDay: 0,
    // 是否启用自动总结
    autoEnabled: true
  }
}
