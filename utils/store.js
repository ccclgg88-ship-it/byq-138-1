/**
 * store.js - 全局状态管理
 * 发布/订阅模式，确保数据变更全局同步
 */

const storage = require('./storage')

class Store {
  constructor() {
    this._state = {}
    this._listeners = {}
    this._init()
  }

  _init() {
    this._state = {
      settings: storage.load('settings', {
        cycleLength: 28,
        periodLength: 5,
        notifyEnabled: false
      }),
      periods: storage.load('periods', []),
      dailyRecords: storage.load('dailyRecords', {}),
      currentPeriodId: storage.load('currentPeriodId', null)
    }
  }

  get(key) {
    return this._state[key]
  }

  set(key, value, persist = true) {
    this._state[key] = value
    if (persist) {
      storage.save(key, value)
    }
    this._notify(key, value)
  }

  /** 更新 settings 中的某个字段 */
  updateSettings(field, value) {
    const settings = Object.assign({}, this._state.settings)
    settings[field] = value
    this.set('settings', settings)
  }

  /** 添加一条经期记录 */
  addPeriod(period) {
    const periods = this._state.periods.slice()
    periods.push(period)
    periods.sort((a, b) => (a.startDate > b.startDate ? -1 : 1))
    this.set('periods', periods)
    return period
  }

  /** 更新经期记录 */
  updatePeriod(id, updates) {
    const periods = this._state.periods.map(p =>
      p.id === id ? Object.assign({}, p, updates) : p
    )
    this.set('periods', periods)
  }

  /** 删除经期记录 */
  removePeriod(id) {
    const periods = this._state.periods.filter(p => p.id !== id)
    this.set('periods', periods)
    if (this._state.currentPeriodId === id) {
      this.set('currentPeriodId', null)
    }
  }

  /** 保存每日记录 */
  saveDailyRecord(dateStr, record) {
    const records = Object.assign({}, this._state.dailyRecords)
    records[dateStr] = record
    this.set('dailyRecords', records)
  }

  /** 订阅状态变化 */
  subscribe(key, callback) {
    if (!this._listeners[key]) this._listeners[key] = []
    this._listeners[key].push(callback)
    return () => {
      this._listeners[key] = this._listeners[key].filter(cb => cb !== callback)
    }
  }

  /** 通知所有订阅者 */
  _notify(key, value) {
    const cbs = this._listeners[key]
    if (cbs && cbs.length) {
      cbs.forEach(cb => {
        try { cb(value) } catch (e) { console.error('[Store] notify error:', e) }
      })
    }
    // 同时触发通配符订阅
    const wildcardCbs = this._listeners['*']
    if (wildcardCbs && wildcardCbs.length) {
      wildcardCbs.forEach(cb => {
        try { cb(key, value) } catch (e) { console.error('[Store] notify error:', e) }
      })
    }
  }

  /** 重置所有数据 */
  reset() {
    storage.clearAll()
    this._state = {}
    this._init()
    this._notify('*', this._state)
  }
}

// 单例
const store = new Store()

module.exports = store
