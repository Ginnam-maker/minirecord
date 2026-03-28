/**
 * 统一日志工具
 * - debug/info: 仅在开发环境输出
 * - warn/error: 所有环境输出
 */

const hasProcessEnv = typeof process !== 'undefined' && process && process.env
const isDev =
  (typeof __DEV__ !== 'undefined' && __DEV__) ||
  (hasProcessEnv && process.env.NODE_ENV !== 'production')

function emit(method, args) {
  if (typeof console === 'undefined') return
  const fn = console[method]
  if (typeof fn === 'function') {
    fn(...args)
  }
}

export const logger = {
  debug(...args) {
    if (!isDev) return
    emit('log', args)
  },

  info(...args) {
    if (!isDev) return
    emit('info', args)
  },

  warn(...args) {
    emit('warn', args)
  },

  error(...args) {
    emit('error', args)
  }
}

export default logger
