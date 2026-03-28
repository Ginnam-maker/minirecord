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
        
        <scroll-view class="detail-content" :scroll-y="true" enable-flex>
          <!-- 总结内容 -->
          <view class="summary-content">
            <rich-text class="content-rich" :nodes="renderedSummaryHtml"></rich-text>
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

    <canvas id="shareCanvas" canvas-id="shareCanvas" type="2d" class="share-canvas"></canvas>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, getCurrentInstance } from 'vue'
import { useRecordStore } from '@/stores/recordStore.js'
import {
  getWeekRange,
  formatDate
} from '@/utils/deepseek.js'
import {
  generateShareCard,
  saveImageToAlbum,
  shareImageBySystem
} from '@/utils/shareCard.js'
import {
  getRecordsByRange
} from '@/utils/storage.js'

const recordStore = useRecordStore()

// 组件引用
const detailPopup = ref(null)
const loadingPopup = ref(null)
const pageInstance = getCurrentInstance()

// 状态
const selectedWeekOffset = ref(0) // 0=本周, -1=上周
const sharing = ref(false)
const cachedShareImage = ref('')
const currentDetail = ref({
  weekLabel: '',
  summary: '',
  records: []
})

// 计算属性
const loading = computed(() => recordStore.loading)
const summaryList = computed(() => recordStore.summaries)
const renderedSummaryHtml = computed(() => markdownToHtml(currentDetail.value.summary || ''))

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
  cachedShareImage.value = ''
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
  cachedShareImage.value = ''
  detailPopup.value.open()
}

// 关闭详情
function closeDetail() {
  cachedShareImage.value = ''
  detailPopup.value.close()
}

function normalizeShareError(err) {
  const message = err?.message || err?.errMsg || ''
  const canceled = /cancel|canceled|用户取消|取消/.test(message)
  const wrapped = new Error(message || '分享失败，请稍后再试')
  wrapped.isCanceled = canceled
  return wrapped
}

function getShareCanvasNode(retryCount = 0) {
  return new Promise((resolve, reject) => {
    // 添加延迟，确保Canvas已渲染
    setTimeout(() => {
      const query = pageInstance?.proxy
        ? uni.createSelectorQuery().in(pageInstance.proxy)
        : uni.createSelectorQuery()

      query
        .select('#shareCanvas')
        .fields({ node: true, size: true }, (res) => {
          if (!res || !res.node) {
            // 最多重试2次
            if (retryCount < 2) {
              resolve(getShareCanvasNode(retryCount + 1))
            } else {
              reject(new Error('分享画布初始化失败，请稍后重试'))
            }
            return
          }
          resolve(res.node)
        })
        .exec()
    }, retryCount === 0 ? 300 : 500) // 首次300ms，重试500ms
  })
}

async function ensureShareImage() {
  if (cachedShareImage.value) {
    return cachedShareImage.value
  }

  await nextTick()

  const canvas = await getShareCanvasNode()
  const path = await generateShareCard(
    {
      weekLabel: currentDetail.value.weekLabel,
      summary: currentDetail.value.summary,
      recordCount: Array.isArray(currentDetail.value.records) ? currentDetail.value.records.length : 0
    },
    canvas
  )

  if (!path) {
    throw new Error('图片生成失败，请稍后再试')
  }

  cachedShareImage.value = path
  return path
}

function chooseShareTarget() {
  return new Promise((resolve, reject) => {
    uni.showActionSheet({
      itemList: ['微信', 'QQ', '本地'],
      success: (res) => {
        if (res.tapIndex === 0) {
          resolve('wechat')
          return
        }
        if (res.tapIndex === 1) {
          resolve('qq')
          return
        }
        resolve('local')
      },
      fail: (err) => {
        if (/(cancel|canceled|用户取消|取消)/.test(err?.errMsg || '')) {
          resolve('cancel')
          return
        }
        reject(err)
      }
    })
  })
}

async function shareBySystemPanel(imagePath, targetName) {
  uni.showToast({
    title: `请在系统面板选择${targetName}`,
    icon: 'none'
  })

  await shareImageBySystem(imagePath, {
    title: `${currentDetail.value.weekLabel} 周总结`,
    content: '来自 miniRecord 的每周总结卡片'
  })
}

async function saveToLocalAlbum(imagePath) {
  await saveImageToAlbum(imagePath)
  uni.showToast({
    title: '已保存到相册',
    icon: 'success'
  })
}

// 分享
async function handleShare() {
  if (sharing.value) {
    return
  }

  const text = `【${currentDetail.value.weekLabel} 周总结】\n\n${currentDetail.value.summary}`

  // #ifdef APP-PLUS
  sharing.value = true
  uni.showLoading({
    title: '准备分享图片...'
  })

  try {
    const imagePath = await ensureShareImage()
    uni.hideLoading()

    const target = await chooseShareTarget()
    if (target === 'cancel') {
      return
    }

    if (target === 'local') {
      await saveToLocalAlbum(imagePath)
      return
    }

    await shareBySystemPanel(imagePath, target === 'wechat' ? '微信' : 'QQ')
  } catch (err) {
    const shareError = normalizeShareError(err)
    if (shareError.isCanceled) {
      uni.showToast({
        title: '已取消分享',
        icon: 'none'
      })
      return
    }

    uni.showModal({
      title: '分享失败',
      content: shareError.message || '分享失败，请稍后再试',
      showCancel: false
    })
  } finally {
    uni.hideLoading()
    sharing.value = false
  }

  return
  // #endif
  
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

  return
  // #endif
  
  // #ifdef MP-WEIXIN
  // 微信小程序分享
  uni.showShareMenu({
    withShareTicket: true
  })

  return
  // #endif
  
  // #ifndef APP-PLUS
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

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function parseInlineMarkdown(text) {
  let html = escapeHtml(text)
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" style="color:#007AFF;text-decoration:none;">$1</a>')
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>')
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>')
  html = html.replace(/`([^`]+)`/g, '<code style="font-family:monospace;background:#f5f5f5;padding:2px 4px;border-radius:4px;">$1</code>')
  return html
}

function markdownToHtml(markdownText) {
  const source = String(markdownText || '').replace(/\r\n/g, '\n')
  if (!source.trim()) {
    return '<p style="margin:0;color:#999;">暂无总结内容</p>'
  }

  const codeBlocks = []
  let text = source.replace(/```([\w-]*)\n([\s\S]*?)```/g, (_, __, code) => {
    const token = `@@CODE_BLOCK_${codeBlocks.length}@@`
    codeBlocks.push(`<pre style="background:#f8f8f8;padding:12px;border-radius:8px;overflow:auto;line-height:1.5;margin:10px 0;"><code style="font-family:monospace;">${escapeHtml(code)}</code></pre>`)
    return token
  })

  const lines = text.split('\n')
  const htmlParts = []
  let listType = ''

  const closeList = () => {
    if (listType) {
      htmlParts.push(listType === 'ol' ? '</ol>' : '</ul>')
      listType = ''
    }
  }

  for (const line of lines) {
    const trimmed = line.trim()

    if (!trimmed) {
      closeList()
      continue
    }

    if (/^@@CODE_BLOCK_\d+@@$/.test(trimmed)) {
      closeList()
      htmlParts.push(trimmed)
      continue
    }

    if (/^#{1,6}\s+/.test(trimmed)) {
      closeList()
      const level = trimmed.match(/^#+/)[0].length
      const content = parseInlineMarkdown(trimmed.replace(/^#{1,6}\s+/, ''))
      const sizeMap = ['20px', '18px', '16px', '15px', '14px', '13px']
      const size = sizeMap[level - 1] || '13px'
      htmlParts.push(`<h${level} style="font-size:${size};font-weight:700;line-height:1.5;margin:14px 0 8px;color:#222;">${content}</h${level}>`)
      continue
    }

    if (/^>\s?/.test(trimmed)) {
      closeList()
      const content = parseInlineMarkdown(trimmed.replace(/^>\s?/, ''))
      htmlParts.push(`<blockquote style="margin:10px 0;padding:8px 12px;border-left:3px solid #007AFF;background:#f7fbff;color:#444;line-height:1.7;">${content}</blockquote>`)
      continue
    }

    if (/^(-{3,}|\*{3,})$/.test(trimmed)) {
      closeList()
      htmlParts.push('<hr style="border:none;border-top:1px solid #eaeaea;margin:12px 0;"/>')
      continue
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      if (listType !== 'ol') {
        closeList()
        htmlParts.push('<ol style="margin:8px 0 8px 20px;color:#333;line-height:1.8;">')
        listType = 'ol'
      }
      const content = parseInlineMarkdown(trimmed.replace(/^\d+\.\s+/, ''))
      htmlParts.push(`<li style="margin:4px 0;">${content}</li>`)
      continue
    }

    if (/^[-*]\s+/.test(trimmed)) {
      if (listType !== 'ul') {
        closeList()
        htmlParts.push('<ul style="margin:8px 0 8px 20px;color:#333;line-height:1.8;">')
        listType = 'ul'
      }
      const content = parseInlineMarkdown(trimmed.replace(/^[-*]\s+/, ''))
      htmlParts.push(`<li style="margin:4px 0;">${content}</li>`)
      continue
    }

    closeList()
    htmlParts.push(`<p style="margin:8px 0;color:#333;line-height:1.85;">${parseInlineMarkdown(trimmed)}</p>`)
  }

  closeList()

  let html = htmlParts.join('')
  html = html.replace(/@@CODE_BLOCK_(\d+)@@/g, (_, index) => codeBlocks[Number(index)] || '')
  return html
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

.license-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #f7faff;
  border: 1px solid #e6f0ff;
  border-radius: 10px;
  padding: 10px 12px;
  margin-bottom: 14px;
}

.license-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.license-title {
  font-size: 14px;
  font-weight: 600;
  color: #1f2d3d;
}

.license-subtitle {
  font-size: 12px;
  color: #6b7a8f;
}

.license-quota {
  font-size: 12px;
  color: #2f6bcf;
}

.activate-btn {
  background-color: #007AFF;
  color: #FFFFFF;
  border: none;
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
  overflow: hidden;
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
  height: 0;
  padding: 20px;
  box-sizing: border-box;
}

.summary-content {
  margin-bottom: 30px;
}

.content-rich {
  font-size: 15px;
  color: #333;
  line-height: 1.8;
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

.activate-popup {
  width: 82vw;
  background-color: #FFFFFF;
  border-radius: 12px;
  padding: 16px;
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

.share-canvas {
  position: fixed;
  left: -9999px;
  top: -9999px;
  width: 750px;
  height: 1200px;
  opacity: 0;
  pointer-events: none;
}
</style>
