<template>
  <view class="summary-page">
    <!-- 顶部操作区 -->
    <view class="header-section">
      <view class="week-selector">
        <button 
          class="week-btn" 
          size="mini"
          @click="selectWeek(-1)"
        >
          上周
        </button>
        <text class="week-label">{{ currentWeekLabel }}</text>
        <button 
          class="week-btn" 
          size="mini"
          @click="selectWeek(0)"
        >
          本周
        </button>
      </view>
      
      <button 
        class="generate-btn" 
        type="primary"
        :loading="loading"
        :disabled="loading || weekRecordCount === 0"
        @click="handleGenerateSummary"
      >
        {{ loading ? '生成中...' : '生成总结' }}
      </button>
      
      <view class="tip-text" v-if="weekRecordCount === 0">
        <text>📝 {{ selectedWeekOffset === 0 ? '本周' : '该周' }}暂无记录</text>
      </view>
      <view class="tip-text" v-else>
        <text>✨ {{ selectedWeekOffset === 0 ? '本周' : '该周' }}已记录 {{ weekRecordCount }} 天</text>
      </view>
    </view>
    
    <!-- 历史总结列表 -->
    <view class="history-section">
      <view class="section-title">
        <text>历史总结</text>
        <text class="count-text">({{ summaryList.length }})</text>
      </view>
      
      <view v-if="summaryList.length === 0" class="empty-state">
        <text class="empty-icon">📊</text>
        <text class="empty-text">还没有生成过总结</text>
        <text class="empty-hint">记录满一周后，生成你的第一份总结吧！</text>
      </view>
      
      <view v-else class="summary-list">
        <uni-card
          v-for="item in summaryList"
          :key="item.id"
          :title="item.weekLabel"
          :extra="formatTime(item.createTime)"
          :is-shadow="true"
          @click="showDetail(item)"
        >
          <view class="summary-preview">
            <text class="summary-text">{{ getSummaryPreview(item.summary) }}</text>
            <text class="view-more">查看详情 ›</text>
          </view>
          <view class="record-count">
            <text>📝 包含 {{ item.records.length }} 条记录</text>
          </view>
        </uni-card>
      </view>
    </view>
    
    <!-- 总结详情弹窗 -->
    <uni-popup ref="detailPopup" type="bottom" background-color="#fff">
      <view class="detail-popup">
        <view class="detail-header">
          <text class="detail-title">{{ currentDetail.weekLabel }}</text>
          <text class="close-btn" @click="closeDetail">✕</text>
        </view>
        
        <scroll-view class="detail-content" scroll-y>
          <!-- 总结内容 -->
          <view class="summary-content">
            <text class="content-text">{{ currentDetail.summary }}</text>
          </view>
          
          <!-- 相关记录 -->
          <view class="related-records">
            <view class="records-title">📋 该周记录</view>
            <view 
              v-for="record in currentDetail.records"
              :key="record.date"
              class="record-item"
            >
              <text class="record-date">{{ record.date }}</text>
              <text class="record-content">{{ record.content }}</text>
            </view>
          </view>
        </scroll-view>
        
        <!-- 底部操作 -->
        <view class="detail-footer">
          <button 
            class="share-btn" 
            size="default"
            @click="handleShare"
          >
            分享
          </button>
        </view>
      </view>
    </uni-popup>
    
    <!-- 加载提示 -->
    <uni-popup ref="loadingPopup" type="center" :mask-click="false">
      <view class="loading-content">
        <view class="loading-spinner"></view>
        <text>AI 正在生成总结...</text>
        <text class="loading-tip">这可能需要几秒钟</text>
      </view>
    </uni-popup>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRecordStore } from '@/stores/recordStore.js'
import { getWeekRange, formatDate } from '@/utils/deepseek.js'
import { getRecordsByRange } from '@/utils/storage.js'

const recordStore = useRecordStore()

// 组件引用
const detailPopup = ref(null)
const loadingPopup = ref(null)

// 状态
const selectedWeekOffset = ref(0) // 0=本周, -1=上周
const currentDetail = ref({
  weekLabel: '',
  summary: '',
  records: []
})

// 计算属性
const loading = computed(() => recordStore.loading)
const summaryList = computed(() => recordStore.summaries)

const currentWeekLabel = computed(() => {
  const referenceDate = new Date()
  referenceDate.setDate(referenceDate.getDate() + selectedWeekOffset.value * 7)
  const { weekLabel } = getWeekRange(referenceDate)
  return weekLabel
})

const weekRecordCount = computed(() => {
  const referenceDate = new Date()
  referenceDate.setDate(referenceDate.getDate() + selectedWeekOffset.value * 7)
  const { startDate, endDate } = getWeekRange(referenceDate)
  const records = getRecordsByRange(startDate, endDate)
  return records.length
})

// 初始化
onMounted(() => {
  recordStore.init()
})

// 选择周
function selectWeek(offset) {
  selectedWeekOffset.value = offset
}

// 生成总结
async function handleGenerateSummary() {
  if (weekRecordCount.value === 0) {
    uni.showToast({
      title: '该周暂无记录',
      icon: 'none'
    })
    return
  }
  
  // 显示加载弹窗
  loadingPopup.value.open()
  
  try {
    const result = await recordStore.createWeeklySummary(selectedWeekOffset.value)
    
    loadingPopup.value.close()
    
    uni.showToast({
      title: '生成成功',
      icon: 'success'
    })
    
    // 显示详情
    setTimeout(() => {
      showDetailByData(result)
    }, 500)
    
  } catch (error) {
    loadingPopup.value.close()
    
    let errorMsg = '生成失败'
    if (error.message) {
      errorMsg = error.message
    }
    
    uni.showModal({
      title: '生成失败',
      content: errorMsg,
      showCancel: false
    })
  }
}

// 显示详情
function showDetail(item) {
  currentDetail.value = item
  detailPopup.value.open()
}

// 根据数据显示详情
function showDetailByData(data) {
  const { weekLabel, summary } = data
  const referenceDate = new Date()
  referenceDate.setDate(referenceDate.getDate() + selectedWeekOffset.value * 7)
  const { startDate, endDate } = getWeekRange(referenceDate)
  const records = getRecordsByRange(startDate, endDate)
  
  currentDetail.value = {
    weekLabel,
    summary,
    records
  }
  detailPopup.value.open()
}

// 关闭详情
function closeDetail() {
  detailPopup.value.close()
}

// 分享
function handleShare() {
  const text = `【${currentDetail.value.weekLabel} 周总结】\n\n${currentDetail.value.summary}`
  
  // #ifdef H5
  // H5 环境使用剪贴板
  uni.setClipboardData({
    data: text,
    success: () => {
      uni.showToast({
        title: '已复制到剪贴板',
        icon: 'success'
      })
    }
  })
  // #endif
  
  // #ifdef MP-WEIXIN
  // 微信小程序分享
  uni.showShareMenu({
    withShareTicket: true
  })
  // #endif
  
  // #ifndef H5 || MP-WEIXIN
  // 其他平台
  uni.showModal({
    title: '分享',
    content: '分享功能正在开发中',
    showCancel: false
  })
  // #endif
}

// 获取总结预览文本
function getSummaryPreview(summary) {
  if (!summary) return ''
  const text = summary.replace(/\n/g, ' ')
  return text.length > 100 ? text.substring(0, 100) + '...' : text
}

// 格式化时间
function formatTime(timestamp) {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`
  
  return formatDate(date, 'MM-DD')
}
</script>

<style scoped>
.summary-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 20px;
}

.header-section {
  background-color: #FFFFFF;
  padding: 20px;
  margin-bottom: 10px;
}

.week-selector {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 15px;
}

.week-btn {
  background-color: #f0f0f0;
  color: #333;
  border: none;
  margin: 0 10px;
}

.week-label {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  min-width: 120px;
  text-align: center;
}

.generate-btn {
  width: 100%;
  background: linear-gradient(90deg, #007AFF 0%, #0066CC 100%);
  border-radius: 8px;
  font-size: 16px;
  margin-bottom: 10px;
}

.tip-text {
  text-align: center;
  font-size: 13px;
  color: #999;
}

.history-section {
  padding: 20px;
}

.section-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
}

.count-text {
  font-size: 14px;
  font-weight: normal;
  color: #999;
  margin-left: 5px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80px 20px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 15px;
}

.empty-text {
  font-size: 16px;
  color: #666;
  margin-bottom: 8px;
}

.empty-hint {
  font-size: 13px;
  color: #999;
}

.summary-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.summary-preview {
  margin-bottom: 10px;
}

.summary-text {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  display: block;
  margin-bottom: 8px;
}

.view-more {
  font-size: 13px;
  color: #007AFF;
}

.record-count {
  font-size: 12px;
  color: #999;
  padding-top: 10px;
  border-top: 1px solid #f0f0f0;
}

/* 详情弹窗 */
.detail-popup {
  height: 80vh;
  display: flex;
  flex-direction: column;
  background-color: #FFFFFF;
  border-radius: 20px 20px 0 0;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #f0f0f0;
}

.detail-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.close-btn {
  font-size: 24px;
  color: #999;
  padding: 0 10px;
}

.detail-content {
  flex: 1;
  padding: 20px;
}

.summary-content {
  margin-bottom: 30px;
}

.content-text {
  font-size: 15px;
  color: #333;
  line-height: 1.8;
  white-space: pre-wrap;
}

.related-records {
  margin-top: 20px;
}

.records-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f0f0f0;
}

.record-item {
  display: flex;
  flex-direction: column;
  padding: 12px 0;
  border-bottom: 1px solid #f8f8f8;
}

.record-date {
  font-size: 12px;
  color: #007AFF;
  margin-bottom: 5px;
}

.record-content {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
}

.detail-footer {
  padding: 15px 20px;
  border-top: 1px solid #f0f0f0;
  background-color: #FFFFFF;
}

.share-btn {
  width: 100%;
  background-color: #f0f0f0;
  color: #333;
  border-radius: 8px;
}

/* 加载弹窗 */
.loading-content {
  background-color: rgba(0, 0, 0, 0.8);
  color: #FFFFFF;
  padding: 30px 40px;
  border-radius: 10px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: #FFFFFF;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-tip {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}
</style>
