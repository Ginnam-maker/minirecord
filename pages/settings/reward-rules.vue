<template>
  <view class="reward-rules-container">
    <view class="section">
      <text class="title">奖励规则</text>
      <view class="settings-list">
        <view class="item-col">
          <textarea class="textarea rule-input" v-model="newRuleText" placeholder="示例：每天读书超过5分钟加1分"></textarea>
          <button class="add-rule-btn" type="primary" size="mini" :loading="parsingRule" @click="handleAddRule">
            {{ parsingRule ? '解析中...' : '解析并添加' }}
          </button>
          <text class="rule-hint">当前仅支持正向加分规则，负分规则暂不开放。</text>
        </view>

        <view v-if="rewardRules.length === 0" class="empty-rule">
          <text>暂无奖励规则，添加后会在保存记录时自动匹配。</text>
        </view>

        <view v-for="rule in rewardRules" :key="rule.id" class="rule-item">
          <view class="rule-main">
            <text class="rule-text">{{ rule.originalText }}</text>
            <text class="rule-meta">+{{ rule.reward }} 分 · {{ rule.flexibility === 'strict' ? '严格' : '宽松' }}</text>
          </view>
          <view class="rule-actions">
            <switch :checked="rule.enabled !== false" @change="onRuleEnabledChange($event, rule)" />
            <text class="delete-link" @click="removeRule(rule)">删除</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import {
  getRewardRules,
  upsertRewardRule,
  deleteRewardRule as deleteRewardRuleById
} from '@/utils/storage.js'
import { parseRewardRuleText } from '@/utils/rewardEngine.js'

export default {
  data() {
    return {
      rewardRules: [],
      newRuleText: '',
      parsingRule: false
    }
  },
  onLoad() {
    this.loadRewardRules()
  },
  methods: {
    loadRewardRules() {
      this.rewardRules = getRewardRules()
    },
    async handleAddRule() {
      const text = (this.newRuleText || '').trim()
      if (!text) {
        uni.showToast({
          title: '请输入规则内容',
          icon: 'none'
        })
        return
      }

      this.parsingRule = true
      const result = await parseRewardRuleText(text)
      this.parsingRule = false

      if (!result.success) {
        uni.showToast({
          title: result.error || '规则解析失败',
          icon: 'none'
        })
        return
      }

      const saved = upsertRewardRule(result.rule)
      if (!saved) {
        uni.showToast({
          title: '规则保存失败',
          icon: 'none'
        })
        return
      }

      this.newRuleText = ''
      this.loadRewardRules()
      uni.showToast({
        title: '规则已添加',
        icon: 'success'
      })
    },
    onRuleEnabledChange(event, rule) {
      const enabled = Boolean(event?.detail?.value)
      const updated = upsertRewardRule({
        ...rule,
        enabled
      })

      if (!updated) {
        uni.showToast({
          title: '更新失败，请重试',
          icon: 'none'
        })
        return
      }

      this.loadRewardRules()
    },
    removeRule(rule) {
      if (!rule?.id) return

      uni.showModal({
        title: '删除规则',
        content: '确认删除这条奖励规则吗？',
        success: (res) => {
          if (!res.confirm) return

          const success = deleteRewardRuleById(rule.id)
          if (!success) {
            uni.showToast({
              title: '删除失败，请重试',
              icon: 'none'
            })
            return
          }

          this.loadRewardRules()
          uni.showToast({
            title: '已删除',
            icon: 'success'
          })
        }
      })
    }
  }
}
</script>

<style lang="scss">
.reward-rules-container {
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
.textarea {
  width: 100%;
  padding: 15px;
  font-size: 15px;
  box-sizing: border-box;
  min-height: 150px;
}

.rule-input {
  min-height: 100px;
  margin-bottom: 8px;
}

.add-rule-btn {
  width: 120px;
}

.rule-hint {
  font-size: 12px;
  color: #999;
  margin-top: 8px;
}

.empty-rule {
  padding: 14px 15px;
  font-size: 13px;
  color: #999;
  border-top: 1px solid #eee;
}

.rule-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 15px;
  border-top: 1px solid #eee;
}

.rule-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.rule-text {
  font-size: 14px;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rule-meta {
  font-size: 12px;
  color: #888;
  margin-top: 4px;
}

.rule-actions {
  display: flex;
  align-items: center;
  margin-left: 12px;
}

.delete-link {
  margin-left: 10px;
  color: #dd524d;
  font-size: 13px;
}
</style>
