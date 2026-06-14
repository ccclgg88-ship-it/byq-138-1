var store = require('../../utils/store.js')
var storage = require('../../utils/storage.js')
var util = require('../../utils/util.js')

/** 生成 picker 的数字范围数组 */
function rangeArray(min, max) {
  var arr = []
  for (var i = min; i <= max; i++) arr.push(i)
  return arr
}

var CYCLE_RANGE = rangeArray(21, 45)
var PERIOD_RANGE = rangeArray(2, 10)

Page({
  data: {
    tokenDisplay: '',
    periodCount: 0,
    cycleLength: 28,
    periodLength: 5,
    cycleRange: CYCLE_RANGE,
    periodRange: PERIOD_RANGE,
    cycleIndex: 7,
    periodIndex: 3,
    version: 'v1.0.0'
  },

  onShow: function () {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 })
    }
    this._refreshData()
  },

  _refreshData: function () {
    var settings = store.get('settings') || { cycleLength: 28, periodLength: 5 }
    var periods = store.get('periods') || []
    var tokenDisplay = storage.getTokenDisplay()

    this.setData({
      tokenDisplay: tokenDisplay,
      periodCount: periods.length,
      cycleLength: settings.cycleLength,
      periodLength: settings.periodLength,
      cycleIndex: CYCLE_RANGE.indexOf(settings.cycleLength),
      periodIndex: PERIOD_RANGE.indexOf(settings.periodLength)
    })
  },

  /** 经期周期天数变更 */
  onCycleLengthChange: function (e) {
    var idx = parseInt(e.detail.value, 10)
    var value = CYCLE_RANGE[idx]
    store.updateSettings('cycleLength', value)
    this.setData({ cycleLength: value, cycleIndex: idx })
    util.showToast('已更新为 ' + value + ' 天')
  },

  /** 经期持续天数变更 */
  onPeriodLengthChange: function (e) {
    var idx = parseInt(e.detail.value, 10)
    var value = PERIOD_RANGE[idx]
    store.updateSettings('periodLength', value)
    this.setData({ periodLength: value, periodIndex: idx })
    util.showToast('已更新为 ' + value + ' 天')
  },

  /** 导出数据（暂未实现） */
  onExportData: function () {
    util.showToast('即将推出')
  },

  /** 关于 */
  onAbout: function () {
    wx.showModal({
      title: '关于花期记录',
      content: '花期记录 v1.0.0\n用心记录，关爱自己\n\n一款简洁的经期记录小程序，帮助你轻松追踪和管理生理周期。',
      showCancel: false,
      confirmColor: '#FF6B8A',
      confirmText: '知道了'
    })
  },

  /** 清除所有数据 */
  onClearData: function () {
    util.showConfirm(
      '清除所有数据',
      '此操作将删除所有经期记录和设置，且无法恢复。确定要继续吗？'
    ).then(function (confirmed) {
      if (!confirmed) return
      store.reset()
      util.showToast('数据已清除')
      // 延迟刷新，等 toast 显示
      setTimeout(function () {
        wx.reLaunch({ url: '/pages/index/index' })
      }, 1200)
    })
  }
})
