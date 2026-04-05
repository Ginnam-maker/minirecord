<template>
  <view class="settings-container">
    <view class="section">
      <text class="title">基本设置</text>
      <view class="settings-list">
        <view class="item">
          <text class="label">当前使用的AI模型</text>
          <picker :value="apiTypeIndex" :range="apiTypes" range-key="name" @change="onApiTypeChange">
            <view class="picker-value">{{ apiTypes[apiTypeIndex].name }}</view>
          </picker>
        </view>
      </view>
    </view>

    <!-- 自定义 API 设置 -->
    <view class="section" v-if="currentApiType === 'custom'">
      <text class="title">自定义 API 接口配置</text>
      <view class="settings-list">
        <view class="item-col">
          <text class="label">API Base URL</text>
          <input class="input" type="text" v-model="customApiBaseUrl" placeholder="如: https://api.openai.com/v1" />
        </view>
        <view class="item-col">
          <text class="label">API Key</text>
          <input class="input" type="text" v-model="customApiKey" placeholder="sk-..." />
        </view>
        <view class="item-col">
          <text class="label">模型名称 (Model)</text>
          <input class="input" type="text" v-model="customModel" placeholder="如: gpt-3.5-turbo" />
        </view>
      </view>
    </view>

    <!-- 内置 API 的设置（默认模型不显示配置项） -->
    <view class="section" v-else-if="currentApiType !== 'default'">
      <text class="title">{{ apiTypes[apiTypeIndex].name }} 配置</text>
      <view class="settings-list">
        <view class="item-col">
          <text class="label">API Key</text>
          <input class="input" type="text" v-model="apiKey" placeholder="输入您的 API Key" />
        </view>
      </view>
    </view>

    <view class="section">
      <text class="title">自定义Prompt</text>
      <view class="settings-list">
        <textarea class="textarea" v-model="customPrompt" placeholder="如果你想改变AI分析报告的倾向，可以在此修改（需包含 {{records}} 占位符）"></textarea>
      </view>
    </view>

    <view class="action-btn">
      <button type="primary" @click="saveSettings">保存设置</button>
      <button class="reset-btn" @click="resetDefaultSettings">恢复默认设置</button>
    </view>
  </view>
</template>

<script>
import { DEFAULT_WEEKLY_SUMMARY_PROMPT } from '@/utils/deepseek.js'

export default {
  data() {
    return {
      apiTypes: [
        { name: '默认模型', value: 'default' },
        { name: 'DeepSeek', value: 'deepseek' },
        { name: 'Kimi (Moonshot)', value: 'moonshot' },
        { name: '阿里云 (通义千问)', value: 'qwen' },
        { name: '智谱 AI (GLM)', value: 'zhipu' },
        { name: '硅基流动 (SiliconFlow)', value: 'siliconflow' },
        { name: '自定义 API (兼容 OpenAI)', value: 'custom' }
      ],
      apiTypeIndex: 0,
      apiKey: '',
      customApiBaseUrl: '',
      customApiKey: '',
      customModel: '',
      customPrompt: '',
      promptLoadedFromDefault: true
    }
  },
  computed: {
    currentApiType() {
      return this.apiTypes[this.apiTypeIndex]?.value || 'default'
    }
  },
  onLoad() {
    this.loadSettings()
  },
  methods: {
    loadSettings() {
      const type = uni.getStorageSync('ai_api_type') || 'default'
      const index = this.apiTypes.findIndex(item => item.value === type)
      this.apiTypeIndex = index >= 0 ? index : 0
      
      this.apiKey = uni.getStorageSync('ai_api_key_default') || ''
      this.customApiBaseUrl = uni.getStorageSync('ai_custom_api_base_url') || ''
      this.customApiKey = uni.getStorageSync('ai_custom_api_key') || ''
      this.customModel = uni.getStorageSync('ai_custom_model') || ''

      const savedPrompt = uni.getStorageSync('summary_prompt_template') || ''
      this.promptLoadedFromDefault = !savedPrompt.trim()
      this.customPrompt = savedPrompt || DEFAULT_WEEKLY_SUMMARY_PROMPT
    },
    onApiTypeChange(e) {
      this.apiTypeIndex = e.detail.value
    },
    saveSettings() {
      const type = this.apiTypes[this.apiTypeIndex].value
      uni.setStorageSync('ai_api_type', type)
      uni.setStorageSync('ai_api_key_default', this.apiKey)
      uni.setStorageSync('ai_custom_api_base_url', this.customApiBaseUrl)
      uni.setStorageSync('ai_custom_api_key', this.customApiKey)
      uni.setStorageSync('ai_custom_model', this.customModel)

      const prompt = (this.customPrompt || '').trim()
      const defaultPrompt = DEFAULT_WEEKLY_SUMMARY_PROMPT.trim()

      if (!prompt || (this.promptLoadedFromDefault && prompt === defaultPrompt)) {
        uni.removeStorageSync('summary_prompt_template')
      } else {
        uni.setStorageSync('summary_prompt_template', this.customPrompt)
      }
      
      uni.showToast({
        title: '保存成功',
        icon: 'success'
      })
    },
    resetDefaultSettings() {
      uni.showModal({
        title: '恢复默认设置',
        content: '将恢复默认模型并重置Prompt，是否继续？',
        success: (res) => {
          if (!res.confirm) return

          const defaultIndex = this.apiTypes.findIndex(item => item.value === 'default')
          this.apiTypeIndex = defaultIndex >= 0 ? defaultIndex : 0
          this.customPrompt = DEFAULT_WEEKLY_SUMMARY_PROMPT
          this.promptLoadedFromDefault = true

          uni.setStorageSync('ai_api_type', 'default')
          uni.removeStorageSync('summary_prompt_template')

          uni.showToast({
            title: '已恢复默认设置',
            icon: 'success'
          })
        }
      })
    }
  }
}
</script>

<style lang="scss">
.settings-container {
  padding: 15px;
  background-color: #f8f8f8;
  min-height: 100vh;
}
.section {
  margin-bottom: 20px;
}
.title {
  font-size: 14px;
  color: #666;
  margin-bottom: 10px;
  display: block;
}
.settings-list {
  background-color: #fff;
  border-radius: 8px;
  overflow: hidden;
}
.item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid #eee;
  font-size: 15px;
}
.item:last-child {
  border-bottom: none;
}
.item-col {
  display: flex;
  flex-direction: column;
  padding: 12px 15px;
  border-bottom: 1px solid #eee;
  
  .label {
    font-size: 13px;
    color: #666;
    margin-bottom: 8px;
  }
}
.picker-value {
  color: #333;
}
.input {
  font-size: 15px;
  width: 100%;
}
.textarea {
  width: 100%;
  padding: 15px;
  font-size: 15px;
  box-sizing: border-box;
  min-height: 150px;
}
.action-btn {
  margin-top: 30px;
  padding: 0 15px;

  .reset-btn {
    margin-top: 12px;
    background-color: #fff;
    color: #666;
    border: 1px solid #ddd;
  }
}
</style>
