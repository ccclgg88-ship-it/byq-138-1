var store = require('../../utils/store.js')
var period = require('../../utils/period.js')
var tips = require('../../data/tips.js')

Page({
  data: {
    periods: [],
    settings: { cycleLength: 28, periodLength: 5 },
    currentStatus: {},
    selectedDate: '',
    currentTip: { id: 0, text: '', icon: '💡' },
    isInPeriod: false,
    currentPeriodId: null,
    phaseText: '今日推荐'
  },

  _unsubPeriods: null,
  _unsubSettings: null,

  onLoad: function () {
    this._refreshData()
  },

  onShow: function () {
    // 设置自定义 tabBar 选中态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 })
    }
    this._refreshData()
    this._subscribe()
  },

  onHide: function () {
    this._unsubscribe()
  },

  /** 从 store 刷新所有数据 */
  _refreshData: function () {
    var periods = store.get('periods') || []
    var settings = store.get('settings') || { cycleLength: 28, periodLength: 5 }
    var currentPeriodId = store.get('currentPeriodId')
    var currentStatus = period.getCurrentStatus(periods, settings)
    var phase = currentStatus.currentPhase || 'general'
    var currentTip = tips.getDailyTip(phase)

    var phaseTextMap = {
      menstrual: '经期推荐',
      follicular: '卵泡期推荐',
      ovulation: '排卵期推荐',
      luteal: '黄体期推荐'
    }
    var phaseText = phaseTextMap[currentStatus.currentPhase] || '今日推荐'

    this.setData({
      periods: periods,
      settings: settings,
      currentPeriodId: currentPeriodId,
      currentStatus: currentStatus,
      isInPeriod: !!currentPeriodId,
      selectedDate: period.today(),
      currentTip: currentTip,
      phaseText: phaseText
    })
  },

  /** 订阅 store 变化 */
  _subscribe: function () {
    this._unsubscribe()
    var self = this
    this._unsubPeriods = store.subscribe('periods', function () {
      self._refreshData()
    })
    this._unsubSettings = store.subscribe('settings', function () {
      self._refreshData()
    })
  },

  /** 取消订阅 */
  _unsubscribe: function () {
    if (this._unsubPeriods) {
      this._unsubPeriods()
      this._unsubPeriods = null
    }
    if (this._unsubSettings) {
      this._unsubSettings()
      this._unsubSettings = null
    }
  },

  /** 日历日期点击 → 跳转记录页 */
  onDateSelect: function (e) {
    var detail = e.detail || {}
    var dateStr = detail.dateStr || ''
    if (!dateStr) return
    wx.navigateTo({
      url: '/pages/record/record?date=' + dateStr
    })
  },

  /** 温馨提示换一条 */
  onTipRefresh: function () {
    var phase = (this.data.currentStatus && this.data.currentStatus.currentPhase) || 'general'
    this.setData({ currentTip: tips.getRandomTip(phase) })
  },

  /** 开始/结束经期 */
  togglePeriod: function () {
    var todayStr = period.today()

    if (this.data.isInPeriod && this.data.currentPeriodId) {
      // 结束经期
      store.updatePeriod(this.data.currentPeriodId, { endDate: todayStr })
      store.set('currentPeriodId', null)
      wx.showToast({ title: '经期已结束', icon: 'success' })
    } else {
      // 开始经期
      var newPeriod = {
        id: period.generateId(),
        startDate: todayStr,
        endDate: null
      }
      store.addPeriod(newPeriod)
      store.set('currentPeriodId', newPeriod.id)
      wx.showToast({ title: '经期已记录', icon: 'success' })
    }

    this._refreshData()
  },

  /** 跳转到健康知识中心 */
  onGoHealth: function () {
    wx.navigateTo({
      url: '/pages/health/health'
    })
  }
})
