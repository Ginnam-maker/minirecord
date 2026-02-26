import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { 
  getRecords, 
  saveRecord as saveRecordToStorage, 
  deleteRecord as deleteRecordFromStorage,
  getRecordsByRange,
  saveSummary,
  getSummaryList,
  updateLastCheckTime,
  isCheckedToday
} from '@/utils/storage.js'
import { 
  generateWeeklySummary, 
  getWeekRange, 
  formatDate,
  shouldAutoTrigger 
} from '@/utils/deepseek.js'

export const useRecordStore = defineStore('record', () => {
  // 状态
  const records = ref({})
  const summaries = ref([])
  const loading = ref(false)
  const currentDate = ref(formatDate(new Date()))
  
  // 计算属性 - 获取当前日期的记录
  const currentRecord = computed(() => {
    return records.value[currentDate.value]?.content || ''
  })
  
  // 计算属性 - 获取本周记录数量
  const weekRecordCount = computed(() => {
    const { startDate, endDate } = getWeekRange()
    const weekRecords = getRecordsByRange(startDate, endDate)
    return weekRecords.length
  })
  
  // 初始化 - 加载本地数据
  function init() {
    loadRecords()
    loadSummaries()
    checkAutoSummary()
  }
  
  // 加载记录
  function loadRecords() {
    records.value = getRecords()
  }
  
  // 加载总结列表
  function loadSummaries() {
    summaries.value = getSummaryList()
  }
  
  // 保存记录
  function saveRecord(date, content) {
    const success = saveRecordToStorage(date, content)
    if (success) {
      loadRecords()
      return true
    }
    return false
  }
  
  // 删除记录
  function deleteRecord(date) {
    const success = deleteRecordFromStorage(date)
    if (success) {
      loadRecords()
      return true
    }
    return false
  }
  
  // 获取指定日期的记录
  function getRecordByDate(date) {
    return records.value[date]?.content || ''
  }
  
  // 生成周总结
  async function createWeeklySummary(weekOffset = 0) {
    loading.value = true
    
    try {
      // 计算周范围（weekOffset: 0=本周, -1=上周）
      const referenceDate = new Date()
      referenceDate.setDate(referenceDate.getDate() + weekOffset * 7)
      
      const { startDate, endDate, weekLabel } = getWeekRange(referenceDate)
      
      // 获取该周的记录
      const weekRecords = getRecordsByRange(startDate, endDate)
      
      if (weekRecords.length === 0) {
        throw new Error('该周暂无记录，无法生成总结')
      }
      
      // 调用 API 生成总结
      const summaryText = await generateWeeklySummary(weekRecords)
      
      // 保存总结
      const summaryId = saveSummary(weekLabel, summaryText, weekRecords)
      
      if (summaryId) {
        loadSummaries()
        updateLastCheckTime()
        return {
          success: true,
          weekLabel,
          summary: summaryText
        }
      } else {
        throw new Error('保存总结失败')
      }
    } catch (error) {
      console.error('生成周总结失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }
  
  // 检查是否需要自动生成总结
  function checkAutoSummary() {
    if (isCheckedToday()) {
      return false
    }
    
    if (shouldAutoTrigger()) {
      // 标记已检查，避免重复触发
      updateLastCheckTime()
      return true
    }
    
    return false
  }
  
  // 设置当前日期
  function setCurrentDate(date) {
    currentDate.value = date
  }
  
  return {
    // 状态
    records,
    summaries,
    loading,
    currentDate,
    currentRecord,
    weekRecordCount,
    
    // 方法
    init,
    loadRecords,
    loadSummaries,
    saveRecord,
    deleteRecord,
    getRecordByDate,
    createWeeklySummary,
    checkAutoSummary,
    setCurrentDate
  }
})
