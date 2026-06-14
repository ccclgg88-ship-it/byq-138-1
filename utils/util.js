/**
 * util.js - 通用工具函数
 */

function throttle(fn, delay) {
  let timer = null
  return function () {
    if (timer) return
    timer = setTimeout(() => {
      fn.apply(this, arguments)
      timer = null
    }, delay)
  }
}

function debounce(fn, delay) {
  let timer = null
  return function () {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, arguments)
    }, delay)
  }
}

/** 显示轻提示 */
function showToast(title, icon) {
  wx.showToast({ title, icon: icon || 'none', duration: 1500 })
}

/** 显示确认弹窗 */
function showConfirm(title, content) {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      content,
      confirmColor: '#FF6B8A',
      success: (res) => resolve(!!res.confirm)
    })
  })
}

module.exports = { throttle, debounce, showToast, showConfirm }
