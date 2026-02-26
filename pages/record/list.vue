<template>
  <view class="record-page">
    <!-- 日历组件 -->
    <view class="calendar-section">
      <uni-calendar
        :insert="true"
        :lunar="false"
        :selected="selectedDates"
        @change="onDateChange"
        @monthSwitch="onMonthSwitch"
      />
    </view>
    
    <!-- 当前日期显示 -->
    <view class="date-header">
      <text class="date-text">{{ currentDateText }}</text>
      <text class="week-info">本周已记录 {{ weekRecordCount }} 天</text>
    </view>
    
    <!-- 记录输入区 -->
    <view class="record-section">
      <view class="record-title">
        <text>今天做了什么？</text>
        <text class="char-count">{{ inputText.length }}/200</text>
      </view>
      
      <uni-easyinput
        v-model="inputText"
        type="textarea"
        placeholder="记录一句话，分享今天的收获..."
        :inputBorder="false"
        :maxlength="200"
        :styles="textareaStyles"
        @blur="onInputBlur"
      />
      
      <view class="action-buttons">
        <button 
          class="save-btn" 
          type="primary" 
          size="default"
          :disabled="!inputText.trim()"
          @click="handleSave"
        >
          保存记录
        </button>
      </view>
    </view>
    
    <!-- 历史记录列表 -->
    <view class="history-section">
      <view class="section-title">
        <text>历史记录</text>
      </view>
      
      <view v-if="historyList.length === 0" class="empty-state">
        <text class="empty-icon">📝</text>
        <text class="empty-text">暂无记录，开始记录你的第一天吧！</text>
      </view>
      
      <uni-swipe-action v-else>
        <uni-swipe-action-item
          v-for="item in historyList"
          :key="item.date"
          :right-options="swipeOptions"
          @click="onSwipeClick($event, item)"
        >
          <view class="record-item">
            <view class="record-date">
              <text class="date-day">{{ formatDay(item.date) }}</text>
              <text class="date-month">{{ formatMonth(item.date) }}</text>
            </view>
            <view class="record-content">
              <text>{{ item.content }}</text>
            </view>
          </view>
        </uni-swipe-action-item>
      </uni-swipe-action>
    </view>
    
    <!-- 加载提示 -->
    <uni-popup ref="loadingPopup" type="center" :mask-click="false">
      <view class="loading-content">
        <text>保存中...</text>
      </view>
    </uni-popup>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRecordStore } from '@/stores/recordStore.js'
import { formatDate } from '@/utils/deepseek.js'

const recordStore = useRecordStore()

// 组件引用
const loadingPopup = ref(null)

// 状态
const currentDate = ref(formatDate(new Date()))
const inputText = ref('')
const selectedDates = ref([])

// 计算属性
const currentDateText = computed(() => {
  const date = new Date(currentDate.value)
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const month = date.getMonth() + 1
  const day = date.getDate()
  const weekDay = weekDays[date.getDay()]
  return `${month}月${day}日 ${weekDay}`
})

const weekRecordCount = computed(() => recordStore.weekRecordCount)

const historyList = computed(() => {
  const records = recordStore.records
  return Object.values(records)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 30) // 只显示最近30条
})

// 文本框样式
const textareaStyles = {
  backgroundColor: '#FFFFFF',
  borderRadius: '10px',
  padding: '15px',
  minHeight: '120px'
}

// 滑动操作选项
const swipeOptions = ref([
  {
    text: '删除',
    style: {
      backgroundColor: '#dd524d'
    }
  }
])

// 初始化
onMounted(() => {
  recordStore.init()
  loadCurrentRecord()
  updateSelectedDates()
  
  // 检查是否需要自动生成周总结
  if (recordStore.checkAutoSummary()) {
    showAutoSummaryTip()
  }
})

// 监听当前日期变化
watch(() => currentDate.value, () => {
  loadCurrentRecord()
})

// 加载当前日期的记录
function loadCurrentRecord() {
  const record = recordStore.getRecordByDate(currentDate.value)
  inputText.value = record || ''
}

// 更新日历选中状态
function updateSelectedDates() {
  const records = recordStore.records
  selectedDates.value = Object.keys(records).map(date => ({
    date: date,
    info: '已记录'
  }))
}

// 日期选择
function onDateChange(e) {
  currentDate.value = formatDate(new Date(e.fulldate))
}

// 月份切换
function onMonthSwitch(e) {
  // 可以在这里处理月份切换逻辑
}

// 输入框失去焦点
function onInputBlur() {
  // 可以在这里添加自动保存逻辑
}

// 保存记录
function handleSave() {
  if (!inputText.value.trim()) {
    uni.showToast({
      title: '请输入记录内容',
      icon: 'none'
    })
    return
  }
  
  const success = recordStore.saveRecord(currentDate.value, inputText.value.trim())
  
  if (success) {
    uni.showToast({
      title: '保存成功',
      icon: 'success'
    })
    updateSelectedDates()
  } else {
    uni.showToast({
      title: '保存失败，请重试',
      icon: 'none'
    })
  }
}

// 滑动操作点击
function onSwipeClick(e, item) {
  if (e.index === 0) { // 删除
    uni.showModal({
      title: '确认删除',
      content: `确定要删除 ${item.date} 的记录吗？`,
      success: (res) => {
        if (res.confirm) {
          const success = recordStore.deleteRecord(item.date)
          if (success) {
            uni.showToast({
              title: '删除成功',
              icon: 'success'
            })
            updateSelectedDates()
            // 如果删除的是当前日期，清空输入框
            if (item.date === currentDate.value) {
              inputText.value = ''
            }
          }
        }
      }
    })
  }
}

// 格式化日期显示
function formatDay(dateStr) {
  const date = new Date(dateStr)
  return date.getDate()
}

function formatMonth(dateStr) {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}月`
}

// 显示自动总结提示
function showAutoSummaryTip() {
  uni.showModal({
    title: '周总结提醒',
    content: '新的一周开始了！要生成上周的总结复盘吗？',
    confirmText: '去生成',
    cancelText: '稍后',
    success: (res) => {
      if (res.confirm) {
        uni.switchTab({
          url: '/pages/summary/index'
        })
      }
    }
  })
}
</script>

<style scoped>
.record-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 20px;
}

.calendar-section {
  background-color: #FFFFFF;
  margin-bottom: 10px;
}

.date-header {
  background-color: #FFFFFF;
  padding: 15px 20px;
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.date-text {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.week-info {
  font-size: 13px;
  color: #999;
}

.record-section {
  background-color: #FFFFFF;
  padding: 20px;
  margin-bottom: 10px;
}

.record-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.record-title text:first-child {
  font-size: 16px;
  font-weight: bold;
  color: #333;
}

.char-count {
  font-size: 12px;
  color: #999;
}

.action-buttons {
  margin-top: 15px;
}

.save-btn {
  background: linear-gradient(90deg, #007AFF 0%, #0066CC 100%);
  border-radius: 8px;
}

.history-section {
  background-color: #FFFFFF;
  padding: 20px;
  min-height: 200px;
}

.section-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f0f0f0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 15px;
}

.empty-text {
  font-size: 14px;
  color: #999;
}

.record-item {
  display: flex;
  padding: 15px 20px;
  background-color: #FFFFFF;
  border-bottom: 1px solid #f0f0f0;
}

.record-date {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-right: 15px;
  min-width: 50px;
}

.date-day {
  font-size: 24px;
  font-weight: bold;
  color: #007AFF;
  line-height: 1;
}

.date-month {
  font-size: 12px;
  color: #999;
  margin-top: 5px;
}

.record-content {
  flex: 1;
  display: flex;
  align-items: center;
}

.record-content text {
  font-size: 15px;
  color: #333;
  line-height: 1.6;
}

.loading-content {
  background-color: rgba(0, 0, 0, 0.7);
  color: #FFFFFF;
  padding: 20px 40px;
  border-radius: 10px;
  text-align: center;
}
</style>
