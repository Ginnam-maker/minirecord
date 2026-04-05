<template>
  <view class="prizes-page">
    <view class="page-shell">
      <view class="hero">
        <text class="hero-tag">积分商城</text>
        <text class="hero-title">奖品兑换设置</text>
        <text class="hero-desc">配置每个奖品需要多少积分，保存后可用于后续兑换。</text>
      </view>

      <view class="stat-grid">
        <view class="stat-card">
          <text class="stat-value">{{ prizes.length }}</text>
          <text class="stat-label">奖品总数</text>
        </view>
        <view class="stat-card">
          <text class="stat-value">{{ enabledPrizeCount }}</text>
          <text class="stat-label">启用中</text>
        </view>
      </view>

      <view class="section-card">
        <view class="section-head">
          <text class="section-title">新增奖品</text>
          <text class="section-subtitle">填写后点击保存，即可加入兑换列表</text>
        </view>

        <view class="field">
          <text class="label">奖品名称</text>
          <input
            class="input"
            type="text"
            :value="formName"
            maxlength="20"
            placeholder="例如：看一场电影"
            @input="onNameInput"
          />
        </view>

        <view class="field">
          <text class="label">兑换积分</text>
          <input
            class="input"
            type="number"
            :value="formCost"
            maxlength="6"
            placeholder="例如：30"
            @input="onCostInput"
          />
        </view>

        <view class="field">
          <text class="label">备注（可选）</text>
          <textarea
            class="textarea"
            :value="formDescription"
            maxlength="100"
            placeholder="例如：每周最多兑换一次"
            @input="onDescriptionInput"
          ></textarea>
        </view>

        <button class="add-btn" @click="handleAddPrize">保存奖品</button>
      </view>

      <view class="section-card list-card">
        <view class="section-head">
          <text class="section-title">奖品列表</text>
          <text class="section-subtitle">支持启用、停用和删除</text>
        </view>

        <view v-if="prizes.length === 0" class="empty-state">
          <text class="empty-emoji">🎁</text>
          <text class="empty-text">还没有奖品，先添加第一项吧</text>
        </view>

        <view v-else>
          <view v-for="item in prizes" :key="item.id" class="prize-item">
            <view class="prize-main">
              <view class="prize-header">
                <text class="prize-name">{{ item.name }}</text>
                <text class="status-chip" :class="item.enabled === false ? 'off' : 'on'">
                  {{ item.enabled === false ? '停用' : '启用' }}
                </text>
              </view>
              <view class="prize-meta">
                <text class="cost-chip">{{ item.cost }} 积分</text>
                <text class="cost-label">可兑换</text>
              </view>
              <text v-if="item.description" class="prize-desc">{{ item.description }}</text>
            </view>

            <view class="prize-actions">
              <switch :checked="item.enabled !== false" @change="onToggleEnabled($event, item)" />
              <text class="delete-link" @click="onDeletePrize(item)">删除</text>
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
    onNameInput(event) {
      this.formName = event?.detail?.value || ''
    },
    onCostInput(event) {
      this.formCost = event?.detail?.value || ''
    },
    onDescriptionInput(event) {
      this.formDescription = event?.detail?.value || ''
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
.prizes-page {
  --brand-color: #ff8a3d;
  --brand-strong: #ff6a00;
  --text-main: #2c2f36;
  --text-secondary: #687282;
  --line-soft: #eef2f7;

  min-height: 100vh;
  background: linear-gradient(180deg, #fff8f1 0%, #fff0de 48%, #f6f9ff 100%);
  padding: 24rpx;
  box-sizing: border-box;
}

.page-shell {
  max-width: 860px;
  margin: 0 auto;
}

.hero {
  background: linear-gradient(135deg, #ff9f57 0%, #ff7a18 65%, #ff6a00 100%);
  border-radius: 28rpx;
  padding: 30rpx;
  box-shadow: 0 18rpx 32rpx rgba(255, 125, 40, 0.25);
}

.hero-tag {
  display: inline-block;
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  background-color: rgba(255, 255, 255, 0.24);
  color: #fff;
  font-size: 22rpx;
}

.hero-title {
  display: block;
  margin-top: 14rpx;
  font-size: 40rpx;
  font-weight: 700;
  color: #fff;
}

.hero-desc {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.88);
  line-height: 1.6;
}

.stat-grid {
  margin-top: 20rpx;
  display: flex;
  gap: 16rpx;
}

.stat-card {
  flex: 1;
  background: #fff;
  border-radius: 20rpx;
  padding: 20rpx 24rpx;
  border: 1px solid #fff4e9;
  box-shadow: 0 10rpx 24rpx rgba(56, 66, 80, 0.08);
}

.stat-value {
  display: block;
  font-size: 42rpx;
  color: var(--brand-strong);
  font-weight: 700;
}

.stat-label {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: var(--text-secondary);
}

.section-card {
  margin-top: 20rpx;
  background-color: #fff;
  border-radius: 24rpx;
  padding: 24rpx;
  box-shadow: 0 12rpx 28rpx rgba(57, 67, 82, 0.09);
}

.section-head {
  margin-bottom: 18rpx;
}

.section-title {
  display: block;
  font-size: 30rpx;
  color: var(--text-main);
  font-weight: 600;
}

.section-subtitle {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #8f99a9;
}

.field + .field {
  margin-top: 18rpx;
}

.label {
  display: block;
  font-size: 24rpx;
  color: var(--text-secondary);
  margin-bottom: 10rpx;
}

.input,
.textarea {
  width: 100%;
  font-size: 28rpx;
  color: var(--text-main);
  background-color: #f8fafc;
  border: 1px solid var(--line-soft);
  border-radius: 16rpx;
  padding: 18rpx 20rpx;
  box-sizing: border-box;
}

.textarea {
  min-height: 140rpx;
}

.add-btn {
  margin-top: 24rpx;
  border: none;
  border-radius: 999rpx;
  color: #fff;
  background: linear-gradient(135deg, var(--brand-color), var(--brand-strong));
  box-shadow: 0 14rpx 24rpx rgba(255, 122, 24, 0.28);
}

.empty-state {
  padding: 22rpx 0 10rpx;
  display: flex;
  align-items: center;
  flex-direction: column;
}

.empty-emoji {
  font-size: 48rpx;
}

.empty-text {
  margin-top: 12rpx;
  color: #95a0b2;
  font-size: 24rpx;
}

.prize-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 22rpx 0;
  border-bottom: 1px solid var(--line-soft);
}

.prize-item:last-child {
  border-bottom: none;
}

.prize-main {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.prize-header {
  display: flex;
  align-items: center;
}

.prize-name {
  max-width: 430rpx;
  font-size: 30rpx;
  color: var(--text-main);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-chip {
  margin-left: 12rpx;
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
}

.status-chip.on {
  color: #0f8f5b;
  background-color: #eafaf3;
}

.status-chip.off {
  color: #8f97a6;
  background-color: #f1f4f8;
}

.prize-meta {
  margin-top: 10rpx;
  display: flex;
  align-items: center;
}

.cost-chip {
  background-color: #fff4e8;
  color: #d26300;
  font-size: 22rpx;
  border-radius: 999rpx;
  padding: 6rpx 16rpx;
}

.cost-label {
  margin-left: 12rpx;
  font-size: 22rpx;
  color: #8d97a8;
}

.prize-desc {
  margin-top: 10rpx;
  font-size: 22rpx;
  color: #8a94a3;
  line-height: 1.5;
}

.prize-actions {
  margin-left: 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.delete-link {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #dd524d;
}

@media screen and (min-width: 960px) {
  .prizes-page {
    padding: 24px;
  }

  .hero-title {
    font-size: 34px;
  }

  .hero-desc,
  .stat-label,
  .label,
  .section-subtitle,
  .cost-label,
  .prize-desc,
  .delete-link {
    font-size: 14px;
  }

  .section-title,
  .prize-name,
  .input,
  .textarea {
    font-size: 17px;
  }

  .stat-value {
    font-size: 28px;
  }
}
</style>
