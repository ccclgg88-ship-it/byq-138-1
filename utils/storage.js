/**
 * storage.js - 本地存储封装
 * 基于随机token的命名空间隔离
 */

const TOKEN_KEY = '__period_tracker_token__'

function generateToken() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `pt_${token}_${Date.now()}`
}

function getToken() {
  let token = wx.getStorageSync(TOKEN_KEY)
  if (!token) {
    token = generateToken()
    wx.setStorageSync(TOKEN_KEY, token)
  }
  return token
}

function _key(key) {
  return `${getToken()}_${key}`
}

function save(key, data) {
  try {
    wx.setStorageSync(_key(key), JSON.stringify(data))
    return true
  } catch (e) {
    console.error('[Storage] save failed:', key, e)
    return false
  }
}

function load(key, defaultValue = null) {
  try {
    const raw = wx.getStorageSync(_key(key))
    if (raw === '' || raw === undefined || raw === null) return defaultValue
    return JSON.parse(raw)
  } catch (e) {
    console.error('[Storage] load failed:', key, e)
    return defaultValue
  }
}

function remove(key) {
  try {
    wx.removeStorageSync(_key(key))
  } catch (e) {
    console.error('[Storage] remove failed:', key, e)
  }
}

function clearAll() {
  try {
    const token = getToken()
    const { keys } = wx.getStorageInfoSync()
    keys.forEach(k => {
      if (k.startsWith(token)) {
        wx.removeStorageSync(k)
      }
    })
    wx.removeStorageSync(TOKEN_KEY)
    return true
  } catch (e) {
    console.error('[Storage] clearAll failed:', e)
    return false
  }
}

function getTokenDisplay() {
  const token = getToken()
  return token.substring(0, 10) + '...'
}

module.exports = { save, load, remove, clearAll, getToken, getTokenDisplay }
