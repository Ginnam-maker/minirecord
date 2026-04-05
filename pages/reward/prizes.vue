<template>
  <view class="prizes-page">
    <view class="page-shell">
      <!-- 顶部横幅 -->
      <view class="hero">
        <view class="hero-icon">🎁</view>
        <view class="hero-content">
          <text class="hero-tag">✨ 积分商城</text>
          <text class="hero-title">奖品兑换设置</text>
          <text class="hero-desc">配置奖品和积分，打造专属奖励体系</text>
        </view>
      </view>

      <!-- 统计卡片 -->
      <view class="stat-grid">
        <view class="stat-card stat-card-primary">
          <view class="stat-icon">📦</view>
          <view class="stat-info">
            <text class="stat-value">{{ prizes.length }}</text>
            <text class="stat-label">奖品总数</text>
          </view>
        </view>
        <view class="stat-card stat-card-success">
          <view class="stat-icon">✅</view>
          <view class="stat-info">
            <text class="stat-value">{{ enabledPrizeCount }}</text>
            <text class="stat-label">启用中</text>
          </view>
        </view>
      </view>

      <!-- 新增奖品表单 -->
      <view class="section-card form-card">
        <view class="section-head">
          <view class="section-title-wrapper">
            <text class="section-icon">➕</text>
            <text class="section-title">新增奖品</text>
          </view>
          <text class="section-subtitle">填写后点击保存，即可加入兑换列表</text>
        </view>

        <view class="form-grid">
          <view class="field">
            <view class="label-wrapper">
              <text class="label-icon">🏷️</text>
              <text class="label">奖品名称</text>
            </view>
            <input
              class="input"
              type="text"
              v-model="formName"
              maxlength="20"
              placeholder="例如：看一场电影"
            />
          </view>

          <view class="field">
            <view class="label-wrapper">
              <text class="label-icon">💰</text>
              <text class="label">兑换积分</text>
            </view>
            <input
              class="input"
              type="number"
              v-model="formCost"
              maxlength="6"
              placeholder="例如：30"
            />
          </view>

          <view class="field field-full">
            <view class="label-wrapper">
              <text class="label-icon">📝</text>
              <text class="label">备注（可选）</text>
            </view>
            <textarea
              class="textarea"
              v-model="formDescription"
              maxlength="100"
              placeholder="例如：每周最多兑换一次"
            ></textarea>
          </view>
        </view>

        <button class="add-btn" @click="handleAddPrize">
          <text class="btn-icon">💾</text>
          <text>保存奖品</text>
        </button>
      </view>

      <!-- 奖品列表 -->
      <view class="section-card list-card">
        <view class="section-head">
          <view class="section-title-wrapper">
            <text class="section-icon">📋</text>
            <text class="section-title">奖品列表</text>
          </view>
          <text class="section-subtitle">支持启用、停用和删除</text>
        </view>

        <view v-if="prizes.length === 0" class="empty-state">
          <text class="empty-emoji">🎁</text>
          <text class="empty-text">还没有奖品，先添加第一项吧</text>
        </view>

        <view v-else class="prize-list">
          <view v-for="item in prizes" :key="item.id" class="prize-item" :class="{ disabled: item.enabled === false }">
            <view class="prize-main">
              <view class="prize-header">
                <text class="prize-emoji">🎯</text>
                <text class="prize-name">{{ item.name }}</text>
                <view class="status-chip" :class="item.enabled === false ? 'off' : 'on'">
                  <text class="status-dot"></text>
                  <text class="status-text">{{ item.enabled === false ? '停用' : '启用' }}</text>
                </view>
              </view>
              <view class="prize-meta">
                <view class="cost-badge">
                  <text class="cost-icon">💎</text>
                  <text class="cost-value">{{ item.cost }}</text>
                  <text class="cost-unit">积分</text>
                </view>
              </view>
              <text v-if="item.description" class="prize-desc">💬 {{ item.description }}</text>
            </view>

            <view class="prize-actions">
              <view class="switch-wrapper">
                <switch 
                  class="prize-switch"
                  :checked="item.enabled !== false" 
                  @change="onToggleEnabled($event, item)" 
                  color="#10b981"
                />
              </view>
              <view class="delete-btn" @click="onDeletePrize(item)">
                <text class="delete-icon">🗑️</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import {
  getRewardPrizes,
  upsertRewardPrize,
  deleteRewardPrize
} from '@/utils/storage.js'

export default {
  data() {
    return {
      formName: '',
      formCost: '',
      formDescription: '',
      prizes: []
    }
  },
  computed: {
    enabledPrizeCount() {
      return this.prizes.filter(item => item.enabled !== false).length
    }
  },
  onLoad() {
    this.loadPrizes()
  },
  methods: {
    loadPrizes() {
      this.prizes = getRewardPrizes()
    },
    resetForm() {
      this.formName = ''
      this.formCost = ''
      this.formDescription = ''
    },
    handleAddPrize() {
      const name = (this.formName || '').trim()
      const cost = Number(this.formCost)
      const description = (this.formDescription || '').trim()

      if (!name) {
        uni.showToast({
          title: '请输入奖品名称',
          icon: 'none'
        })
        return
      }

      if (!Number.isFinite(cost) || cost <= 0) {
        uni.showToast({
          title: '请输入有效积分',
          icon: 'none'
        })
        return
      }

      const saved = upsertRewardPrize({
        name,
        cost: Math.floor(cost),
        description,
        enabled: true
      })

      if (!saved) {
        uni.showToast({
          title: '保存失败，请重试',
          icon: 'none'
        })
        return
      }

      this.resetForm()
      this.loadPrizes()
      uni.showToast({
        title: '奖品已保存',
        icon: 'success'
      })
    },
    onToggleEnabled(event, item) {
      const enabled = Boolean(event?.detail?.value)
      const updated = upsertRewardPrize({
        ...item,
        enabled
      })

      if (!updated) {
        uni.showToast({
          title: '更新失败，请重试',
          icon: 'none'
        })
        return
      }

      this.loadPrizes()
    },
    onDeletePrize(item) {
      if (!item?.id) return

      uni.showModal({
        title: '删除奖品',
        content: `确认删除“${item.name}”吗？`,
        success: (res) => {
          if (!res.confirm) return

          const success = deleteRewardPrize(item.id)
          if (!success) {
            uni.showToast({
              title: '删除失败，请重试',
              icon: 'none'
            })
            return
          }

          this.loadPrizes()
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
// 色彩变量
.prizes-page {
  // 主题色
  --primary-gradient-start: #6366f1;
  --primary-gradient-end: #8b5cf6;
  --primary-color: #7c3aed;
  --primary-light: #a78bfa;
  
  // 成功色
  --success-color: #10b981;
  --success-light: #d1fae5;
  
  // 警告色
  --warning-color: #f59e0b;
  --warning-light: #fef3c7;
  
  // 危险色
  --danger-color: #ef4444;
  --danger-light: #fee2e2;
  
  // 文字色
  --text-primary: #1f2937;
  --text-secondary: #6b7280;
  --text-tertiary: #9ca3af;
  
  // 背景色
  --bg-page: #f9fafb;
  --bg-card: #ffffff;
  --bg-input: #f3f4f6;
  
  // 边框色
  --border-light: #e5e7eb;
  --border-normal: #d1d5db;
  
  // 阴影
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);

  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  background-attachment: fixed;
  padding: 32rpx;
  box-sizing: border-box;
}

.page-shell {
  max-width: 900px;
  margin: 0 auto;
}

// ========== 顶部横幅 ==========
.hero {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 32rpx;
  padding: 40rpx;
  box-shadow: var(--shadow-xl);
  display: flex;
  align-items: center;
  gap: 24rpx;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -10%;
    width: 300rpx;
    height: 300rpx;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
    border-radius: 50%;
  }
}

.hero-icon {
  font-size: 80rpx;
  line-height: 1;
  animation: bounce 2s infinite;
  z-index: 1;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10rpx); }
}

.hero-content {
  flex: 1;
  z-index: 1;
}

.hero-tag {
  display: inline-block;
  padding: 8rpx 20rpx;
  border-radius: 999rpx;
  background-color: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  color: #fff;
  font-size: 24rpx;
  font-weight: 500;
  margin-bottom: 16rpx;
}

.hero-title {
  display: block;
  font-size: 48rpx;
  font-weight: 700;
  color: #fff;
  margin-bottom: 12rpx;
  letter-spacing: 1rpx;
}

.hero-desc {
  display: block;
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.6;
}

// ========== 统计卡片 ==========
.stat-grid {
  margin-top: 24rpx;
  display: flex;
  gap: 20rpx;
}

.stat-card {
  flex: 1;
  background: var(--bg-card);
  border-radius: 24rpx;
  padding: 32rpx 28rpx;
  box-shadow: var(--shadow-lg);
  display: flex;
  align-items: center;
  gap: 20rpx;
  transition: all 0.3s ease;
  border: 2px solid transparent;
  
  &:active {
    transform: scale(0.98);
  }
}

.stat-card-primary {
  border-color: rgba(124, 58, 237, 0.1);
  background: linear-gradient(135deg, #fff 0%, #f5f3ff 100%);
}

.stat-card-success {
  border-color: rgba(16, 185, 129, 0.1);
  background: linear-gradient(135deg, #fff 0%, #f0fdf4 100%);
}

.stat-icon {
  font-size: 56rpx;
  line-height: 1;
}

.stat-info {
  flex: 1;
}

.stat-value {
  display: block;
  font-size: 52rpx;
  font-weight: 700;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-light));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1.2;
}

.stat-card-success .stat-value {
  background: linear-gradient(135deg, var(--success-color), #34d399);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-label {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: var(--text-secondary);
  font-weight: 500;
}

// ========== 卡片容器 ==========
.section-card {
  margin-top: 24rpx;
  background-color: var(--bg-card);
  border-radius: 28rpx;
  padding: 36rpx;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border-light);
}

.section-head {
  margin-bottom: 32rpx;
}

.section-title-wrapper {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 12rpx;
}

.section-icon {
  font-size: 36rpx;
  line-height: 1;
}

.section-title {
  font-size: 36rpx;
  color: var(--text-primary);
  font-weight: 700;
  letter-spacing: 0.5rpx;
}

.section-subtitle {
  display: block;
  font-size: 24rpx;
  color: var(--text-tertiary);
  line-height: 1.5;
  padding-left: 48rpx;
}

// ========== 表单样式 ==========
.form-card {
  background: linear-gradient(135deg, #fff 0%, #faf5ff 100%);
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24rpx;
}

.field {
  display: flex;
  flex-direction: column;
}

.field-full {
  grid-column: 1 / -1;
}

.label-wrapper {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 12rpx;
}

.label-icon {
  font-size: 28rpx;
  line-height: 1;
}

.label {
  font-size: 26rpx;
  color: var(--text-secondary);
  font-weight: 500;
}

.input,
.textarea {
  width: 100%;
  font-size: 28rpx;
  color: var(--text-primary);
  background-color: var(--bg-input);
  border: 2px solid var(--border-light);
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  box-sizing: border-box;
  transition: all 0.3s ease;
  
  &:focus {
    background-color: #fff;
    border-color: var(--primary-light);
    box-shadow: 0 0 0 4rpx rgba(124, 58, 237, 0.1);
  }
}

.textarea {
  min-height: 160rpx;
  font-family: inherit;
  line-height: 1.6;
}

.add-btn {
  margin-top: 32rpx;
  border: none;
  border-radius: 16rpx;
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
  background: linear-gradient(135deg, var(--primary-gradient-start), var(--primary-gradient-end));
  box-shadow: 0 8rpx 24rpx rgba(124, 58, 237, 0.3);
  padding: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  transition: all 0.3s ease;
  
  &:active {
    transform: scale(0.98);
    box-shadow: 0 4rpx 12rpx rgba(124, 58, 237, 0.4);
  }
}

.btn-icon {
  font-size: 32rpx;
  line-height: 1;
}

// ========== 空状态 ==========
.empty-state {
  padding: 80rpx 0;
  display: flex;
  align-items: center;
  flex-direction: column;
}

.empty-emoji {
  font-size: 96rpx;
  line-height: 1;
  margin-bottom: 24rpx;
  opacity: 0.6;
}

.empty-text {
  color: var(--text-tertiary);
  font-size: 26rpx;
  line-height: 1.5;
}

// ========== 奖品列表 ==========
.list-card {
  background: linear-gradient(135deg, #fff 0%, #f0fdf4 100%);
}

.prize-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.prize-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 28rpx;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border: 2px solid var(--border-light);
  border-radius: 20rpx;
  transition: all 0.3s ease;
  
  &:hover {
    border-color: var(--primary-light);
  }
  
  &.disabled {
    opacity: 0.6;
    background: rgba(255, 255, 255, 0.5);
  }
}

.prize-main {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.prize-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-wrap: wrap;
}

.prize-emoji {
  font-size: 36rpx;
  line-height: 1;
}

.prize-name {
  flex: 1;
  min-width: 0;
  font-size: 32rpx;
  color: var(--text-primary);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  font-size: 22rpx;
  font-weight: 500;
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
}

.status-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
}

.status-chip.on {
  color: var(--success-color);
  background-color: var(--success-light);
  
  .status-dot {
    background-color: var(--success-color);
    box-shadow: 0 0 8rpx rgba(16, 185, 129, 0.5);
  }
}

.status-chip.off {
  color: var(--text-tertiary);
  background-color: #f3f4f6;
  
  .status-dot {
    background-color: var(--text-tertiary);
  }
}

.prize-meta {
  display: flex;
  align-items: center;
}

.cost-badge {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  border: 2px solid #fbbf24;
  color: #92400e;
  font-weight: 600;
  border-radius: 12rpx;
  padding: 8rpx 20rpx;
}

.cost-icon {
  font-size: 24rpx;
  line-height: 1;
}

.cost-value {
  font-size: 28rpx;
}

.cost-unit {
  font-size: 22rpx;
  opacity: 0.8;
}

.prize-desc {
  font-size: 24rpx;
  color: var(--text-secondary);
  line-height: 1.6;
  padding: 12rpx 16rpx;
  background-color: rgba(243, 244, 246, 0.5);
  border-radius: 12rpx;
  border-left: 4rpx solid var(--primary-light);
}

.prize-actions {
  margin-left: 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}

.switch-wrapper {
  display: flex;
  align-items: center;
}

.prize-switch {
  transform: scale(0.9);
}

.delete-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--danger-light);
  border-radius: 12rpx;
  transition: all 0.3s ease;
  
  &:active {
    transform: scale(0.95);
    background: #fecaca;
  }
}

.delete-icon {
  font-size: 32rpx;
  line-height: 1;
}

// ========== 响应式设计 ==========
@media screen and (max-width: 750rpx) {
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .field-full {
    grid-column: 1;
  }
}

@media screen and (min-width: 960px) {
  .prizes-page {
    padding: 24px;
  }

  .hero-title {
    font-size: 32px;
  }

  .hero-desc {
    font-size: 15px;
  }

  .section-title {
    font-size: 20px;
  }
  
  .prize-name {
    font-size: 18px;
  }
}
</style>
