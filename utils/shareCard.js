/**
 * 分享卡片生成工具
 * 使用兼容的 Canvas API 绘制精美的分享卡片
 */

import { logger } from '@/utils/logger.js'

/**
 * 处理总结内容，提取纯文本
 */
function extractPlainText(summary) {
  if (!summary) return '暂无总结内容'

  // 移除 Markdown 标记
  let text = summary
    .replace(/#{1,6}\s+/g, '') // 标题
    .replace(/\*\*(.+?)\*\*/g, '$1') // 粗体
    .replace(/\*(.+?)\*/g, '$1') // 斜体
    .replace(/`(.+?)`/g, '$1') // 代码
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // 链接
    .replace(/^[-*]\s+/gm, '• ') // 列表
    .replace(/^\d+\.\s+/gm, '• ') // 有序列表
    .replace(/^>\s+/gm, '') // 引用
    .replace(/\n{3,}/g, '\n\n') // 多余换行
    .trim()

  return text
}

/**
 * 生成分享卡片 - 使用传入的Canvas节点
 */
export async function generateShareCard(data, canvas) {
  logger.debug('开始生成分享卡片:', data)

  return new Promise((resolve, reject) => {
    // 设置超时
    const timeout = setTimeout(() => {
      reject(new Error('生成超时，请重试'))
    }, 15000)

    try {
      if (!canvas || typeof canvas.getContext !== 'function') {
        clearTimeout(timeout)
        reject(new Error('无效的Canvas节点'))
        return
      }

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        clearTimeout(timeout)
        reject(new Error('Canvas上下文获取失败'))
        return
      }

      // 获取设备像素比
      const sysInfo = uni.getSystemInfoSync()
      const dpr = sysInfo.pixelRatio || 2
      logger.debug('设备像素比:', dpr)

      // 设置画布尺寸
      const canvasWidth = 750
      const canvasHeight = 1200

      canvas.width = canvasWidth
      canvas.height = canvasHeight

      logger.debug('Canvas尺寸设置完成:', canvasWidth, canvasHeight)

      // 绘制渐变背景
      const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight)
      gradient.addColorStop(0, '#667eea')
      gradient.addColorStop(1, '#764ba2')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvasWidth, canvasHeight)

      // 绘制白色内容卡片
      const cardX = 40
      const cardY = 80
      const cardWidth = canvasWidth - 80
      const cardHeight = canvasHeight - 240

      ctx.fillStyle = '#FFFFFF'
      ctx.shadowColor = 'rgba(0, 0, 0, 0.1)'
      ctx.shadowBlur = 20
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 10

      // 绘制圆角矩形
      const radius = 32
      ctx.beginPath()
      ctx.moveTo(cardX + radius, cardY)
      ctx.lineTo(cardX + cardWidth - radius, cardY)
      ctx.arcTo(cardX + cardWidth, cardY, cardX + cardWidth, cardY + radius, radius)
      ctx.lineTo(cardX + cardWidth, cardY + cardHeight - radius)
      ctx.arcTo(cardX + cardWidth, cardY + cardHeight, cardX + cardWidth - radius, cardY + cardHeight, radius)
      ctx.lineTo(cardX + radius, cardY + cardHeight)
      ctx.arcTo(cardX, cardY + cardHeight, cardX, cardY + cardHeight - radius, radius)
      ctx.lineTo(cardX, cardY + radius)
      ctx.arcTo(cardX, cardY, cardX + radius, cardY, radius)
      ctx.closePath()
      ctx.fill()

      // 重置阴影
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0

      // 绘制标题
      const titleY = cardY + 80
      ctx.fillStyle = '#333333'
      ctx.font = 'bold 48px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('📅 每周总结', canvasWidth / 2, titleY)

      // 绘制周标签
      ctx.font = '36px sans-serif'
      ctx.fillStyle = '#666666'
      ctx.fillText(data.weekLabel || '', canvasWidth / 2, titleY + 64)

      // 绘制分隔线
      ctx.strokeStyle = '#E5E5E5'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(cardX + 60, titleY + 100)
      ctx.lineTo(cardX + cardWidth - 60, titleY + 100)
      ctx.stroke()

      // 绘制总结内容
      const contentY = titleY + 150
      const contentX = cardX + 60
      const contentMaxWidth = cardWidth - 120

      ctx.fillStyle = '#333333'
      ctx.font = '30px sans-serif'
      ctx.textAlign = 'left'

      const summaryText = extractPlainText(data.summary)
      const lines = summaryText.split('\n')
      let currentY = contentY
      const lineHeight = 48
      const maxLines = 12

      let lineCount = 0
      for (let i = 0; i < lines.length && lineCount < maxLines; i++) {
        const line = lines[i].trim()
        if (!line) continue

        // 自动换行
        const chars = line.split('')
        let currentLine = ''

        for (let j = 0; j < chars.length && lineCount < maxLines; j++) {
          const testLine = currentLine + chars[j]
          const metrics = ctx.measureText(testLine)

          if (metrics.width > contentMaxWidth && currentLine.length > 0) {
            ctx.fillText(currentLine, contentX, currentY)
            currentY += lineHeight
            lineCount++
            currentLine = chars[j]
          } else {
            currentLine = testLine
          }
        }

        if (currentLine && lineCount < maxLines) {
          ctx.fillText(currentLine, contentX, currentY)
          currentY += lineHeight
          lineCount++
        }
      }

      // 内容过长显示省略号
      if (lineCount >= maxLines) {
        ctx.fillText('...', contentX, currentY)
      }

      // 绘制底部信息
      const footerY = cardY + cardHeight - 100
      ctx.fillStyle = '#999999'
      ctx.font = '28px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(`📝 本周记录 ${data.recordCount || 0} 天`, contentX, footerY)

      // 绘制应用标识
      const bottomY = canvasHeight - 100
      ctx.fillStyle = '#FFFFFF'
      ctx.font = '28px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('来自 miniRecord', canvasWidth / 2, bottomY)

      logger.debug('绘制完成，准备导出图片')

      // 导出图片
      setTimeout(() => {
        uni.canvasToTempFilePath({
          canvas: canvas,
          width: canvasWidth,
          height: canvasHeight,
          destWidth: canvasWidth,
          destHeight: canvasHeight,
          fileType: 'png',
          quality: 1,
          success: (exportRes) => {
            logger.debug('图片导出成功:', exportRes.tempFilePath)
            clearTimeout(timeout)
            resolve(exportRes.tempFilePath)
          },
          fail: (err) => {
            logger.error('图片导出失败:', err)
            clearTimeout(timeout)
            reject(new Error('图片导出失败: ' + (err.errMsg || '未知错误')))
          }
        })
      }, 1000)

    } catch (error) {
      logger.error('绘制过程出错:', error)
      clearTimeout(timeout)
      reject(error)
    }
  })
}

/**
 * 保存图片到相册
 */
export async function saveImageToAlbum(tempFilePath) {
  logger.debug('准备保存图片:', tempFilePath)

  return new Promise((resolve, reject) => {
    // 先请求授权
    uni.getSetting({
      success: (res) => {
        logger.debug('授权状态:', res.authSetting)

        if (!res.authSetting['scope.writePhotosAlbum']) {
          logger.debug('需要请求授权')
          // 请求授权
          uni.authorize({
            scope: 'scope.writePhotosAlbum',
            success: () => {
              logger.debug('授权成功')
              saveImage(tempFilePath, resolve, reject)
            },
            fail: () => {
              logger.debug('授权被拒绝')
              // 引导用户开启权限
              uni.showModal({
                title: '提示',
                content: '需要您授权保存图片到相册',
                confirmText: '去设置',
                success: (modalRes) => {
                  if (modalRes.confirm) {
                    uni.openSetting()
                  }
                  reject(new Error('用户拒绝授权'))
                }
              })
            }
          })
        } else {
          logger.debug('已有授权，直接保存')
          saveImage(tempFilePath, resolve, reject)
        }
      },
      fail: (err) => {
        logger.error('获取授权状态失败:', err)
        reject(err)
      }
    })
  })
}

function buildShareError(err) {
  const message = err?.message || err?.errMsg || '系统分享失败'
  const shareError = new Error(message)
  shareError.isCanceled = /cancel|canceled|用户取消|取消/.test(message)
  return shareError
}

/**
 * 使用系统面板分享图片
 */
export async function shareImageBySystem(tempFilePath, options = {}) {
  if (!tempFilePath) {
    throw new Error('图片路径无效')
  }

  return new Promise((resolve, reject) => {
    // #ifdef APP-PLUS
    if (!plus.share || typeof plus.share.sendWithSystem !== 'function') {
      reject(new Error('当前设备不支持系统分享'))
      return
    }

    plus.share.sendWithSystem(
      {
        type: 'image',
        pictures: [tempFilePath],
        title: options.title || '分享图片',
        content: options.content || ''
      },
      () => {
        resolve()
      },
      (err) => {
        reject(buildShareError(err))
      }
    )
    // #endif

    // #ifndef APP-PLUS
    reject(new Error('当前平台不支持系统分享'))
    // #endif
  })
}

function saveImage(tempFilePath, resolve, reject) {
  uni.saveImageToPhotosAlbum({
    filePath: tempFilePath,
    success: () => {
      logger.debug('图片保存成功')
      resolve()
    },
    fail: (err) => {
      logger.error('图片保存失败:', err)
      reject(err)
    }
  })
}
