<template>
  <view class="settings-container">
    <view class="section">
      <text class="title">功能设置</text>
      <view class="settings-list">
        <view class="item nav-item" @click="goBasicConfig">
          <text class="label">基本设置与Prompt</text>
          <text class="nav-arrow">></text>
        </view>
        <view class="item nav-item" @click="goRewardRules">
          <text class="label">奖励规则</text>
          <text class="nav-arrow">></text>
        </view>
        <view class="item nav-item" @click="goPrizeSettings">
          <text class="label">奖品设置</text>
          <text class="nav-arrow">></text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  methods: {
    goBasicConfig() {
      uni.navigateTo({
        url: '/pages/settings/basic-config'
      })
    },
    goRewardRules() {
      uni.navigateTo({
        url: '/pages/settings/reward-rules'
      })
    },
    goPrizeSettings() {
      uni.navigateTo({
        url: '/pages/reward/prizes'
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

.nav-item {
  cursor: pointer;
}

.nav-arrow {
  color: #999;
  font-size: 14px;
}
.item:last-child {
  border-bottom: none;
}
</style>
