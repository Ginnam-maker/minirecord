# 每日记录与周总结应用

基于 Vue3 + uni-app 开发的每日记录工具，支持每天写一句话记录，每周自动调用 DeepSeek API 生成总结复盘。

## 功能特性

✅ **每日记录**
- 日历视图，直观查看每天的记录状态
- 简洁的输入界面，每天一句话记录
- 滑动删除历史记录
- 本地存储，数据安全

✅ **周总结**
- 集成 DeepSeek AI，智能生成周总结
- 普通用户每月可提交 5 次周总结
- 付费用户每月可提交 100 次周总结
- 支持离线 RSA 激活码（MR1 通用码，无设备绑定）
- 自动检测周一提醒生成总结
- 支持查看上周/本周记录
- 总结历史归档，随时回顾
- 支持在总结页自定义 Prompt 模板
- 一键分享总结内容

✅ **界面设计**
- 清爽的 UI 设计
- 完整的底部标签栏导航
- 加载状态和错误提示
- 空状态友好提示

✅ **奖励系统（MVP）**
- 在设置页新增自然语言奖励规则（示例：每天读书超过5分钟加1分）
- 保存记录后自动匹配规则并结算积分
- 置信度分级：`>=80` 自动确认、`60-79` 虚线待确认、`<60` 不加分
- 支持对待确认积分进行手动撤销
- 同一天重复编辑记录时自动重算该日积分

## 快速开始

### 1. 配置 DeepSeek API（示例配置 + 本地私有配置）

先复制示例配置文件：

```bash
copy config.example.js config.js
```

然后打开 `config.js` 文件，填入你的 API Key：

```javascript
export default {
  deepseek: {
    apiKey: '你的私有 API Key',
    baseURL: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat'
  },
  // ...
}
```

`config.example.js` 可以提交到仓库，`config.js` 作为本地私有配置使用，不应包含在发布分支里。

**如何获取 API Key：**
1. 访问 [DeepSeek 官网](https://platform.deepseek.com/)
2. 注册/登录账号
3. 进入 API Keys 页面生成新的 API Key
4. 复制 API Key 并填入配置文件

### 2. 准备图标资源

为了让底部标签栏正常显示，需要准备以下图标（建议尺寸 81x81 px）：

在 `static/tabbar/` 目录下添加：
- `record.png` - 记录页未选中图标
- `record-active.png` - 记录页选中图标
- `summary.png` - 总结页未选中图标
- `summary-active.png` - 总结页选中图标

**临时方案：** 如果暂无图标，可以先注释掉 `pages.json` 中 tabBar 的 `iconPath` 和 `selectedIconPath` 配置，仅保留文字导航。

### 3. 安装依赖

```bash
npm install pinia jsrsasign
```

### 4. 运行项目

在 HBuilderX 中：
1. 打开项目
2. 选择运行到浏览器/微信小程序/App
3. 开始使用

## 项目结构

```
miniRecord/
├── config.js                 # 应用配置（API Key等）
├── main.js                   # 入口文件
├── App.vue                   # 根组件
├── pages.json                # 页面路由配置
├── utils/
│   ├── deepseek.js          # DeepSeek API 工具函数
│   ├── rewardEngine.js      # 奖励规则解析与匹配引擎
│   └── storage.js           # 本地存储工具函数
├── stores/
│   └── recordStore.js       # Pinia 状态管理
├── pages/
│   ├── record/
│   │   └── list.vue         # 记录列表页
│   └── summary/
│       └── index.vue        # 周总结页
└── static/
    └── tabbar/              # 底部标签栏图标
```

## 使用说明

### 记录页面

1. **选择日期**：点击日历选择要记录的日期
2. **输入内容**：在文本框中输入今天做了什么（限200字）
3. **保存记录**：点击"保存记录"按钮（会自动触发奖励匹配）
4. **查看历史**：向下滚动查看历史记录
5. **删除记录**：向左滑动记录项，点击删除
6. **处理待确认奖励**：在记录输入区下方可查看虚线待确认积分并手动撤销

### 设置页面（奖励规则）

1. 在设置页进入“奖励规则（MVP）”区域
2. 输入自然语言规则并点击“解析并添加”
3. 可通过开关启用/停用规则
4. 可删除不需要的规则

### 总结页面

1. **选择周期**：点击"上周"或"本周"按钮切换
2. **查看当月额度**：顶部可看到当月已用/总额（普通 5 次，付费 100 次）
3. **设置 Prompt（可选）**：点击右上方 "Prompt" 小按钮，编辑/恢复默认模板（建议保留 `{{records}}` 占位符）
4. **生成总结**：点击"生成总结"按钮，AI 将分析该周的记录并生成总结（仅成功生成并保存才扣减次数）
5. **激活付费版（可选）**：普通用户可输入离线激活码 `MR1.payload.signature` 升级付费额度
6. **查看详情**：点击历史总结卡片查看完整内容
7. **分享总结**：在详情页点击"分享"按钮

### 自动提醒

- 每周一打开应用时，会自动弹窗提醒生成上周总结
- 可在 `config.js` 中关闭自动提醒：
  ```javascript
  summary: {
    autoEnabled: false  // 设置为 false 关闭自动提醒
  }
  ```

## 配置选项

### config.example.js（模板）

```javascript
export default {
  // DeepSeek API 配置
  deepseek: {
    apiKey: '',                                    // 本地私有 API Key
    baseURL: 'https://api.deepseek.com/v1',       // API 地址
    model: 'deepseek-chat'                         // 模型名称
  },
  
  // 周总结配置
  summary: {
    autoTriggerDay: 1,    // 自动触发日期 (1=周一, 0=周日)
    autoEnabled: true     // 是否启用自动提醒
  }
}
```

发布前请执行密钥扫描：

```bash
npm run release:check
```

如扫描失败，请按输出的文件和行号清理敏感信息后再发布。

## 数据存储

应用使用 uni-app 的本地存储 API 保存数据：

- **每日记录**：存储在 `daily_records` key 下
- **周总结**：存储在 `weekly_summaries` key 下
- **检查时间**：存储在 `last_summary_check` key 下
- **授权信息**：存储在 `user_license_profile` key 下
- **月度配额**：存储在 `summary_quota_usage` key 下
- **奖励规则**：存储在 `reward_rules` key 下
- **奖励积分流水**：存储在 `reward_points_log` key 下

**注意**：数据仅保存在本地，卸载应用会清空数据。未来可考虑接入云数据库实现数据同步。

## 常见问题

### 1. 提示 "请先配置 DeepSeek API Key"

确保在本地 `config.js` 或设置页中填写了正确的 API Key。

### 2. 生成总结失败

可能的原因：
- API Key 无效或过期
- 网络连接问题
- 该周没有记录数据
- API 调用额度不足

### 3. 激活码无法使用

可能的原因：
- 激活码格式不正确（应为 `MR1.payload.signature`）
- 激活码已过期
- 内置 RSA 公钥尚未在 `utils/license.js` 中配置

### 4. 底部标签栏没有图标

需要在 `static/tabbar/` 目录下添加对应的图标文件，或者临时修改 `pages.json` 去掉图标配置。

### 5. 日历组件显示异常

确保已安装 uni-ui 组件库。可以在 HBuilderX 中通过"插件市场"搜索安装 `uni-calendar` 等组件。

## 技术栈

- **框架**：Vue 3 + uni-app
- **状态管理**：Pinia
- **UI 组件**：uni-ui
- **AI 服务**：DeepSeek API
- **存储方案**：uni.storage (本地存储)

## 后续优化

- [ ] 添加数据导出功能（导出为文本/PDF）
- [ ] 支持图片记录
- [ ] 添加标签分类功能
- [ ] 接入云数据库实现多设备同步
- [ ] 支持更多 AI 模型（如 OpenAI、文心一言等）
- [ ] 添加数据统计图表
- [x] 支持自定义总结提示词

## 开发者

开发工具：HBuilderX + VS Code  
框架版本：Vue 3 + uni-app  
开发时间：2026年2月

## 许可证

MIT License
