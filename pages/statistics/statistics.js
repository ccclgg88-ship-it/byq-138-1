var store = require('../../utils/store.js')
var analysis = require('../../utils/analysis.js')
var period = require('../../utils/period.js')

Page({
  data: {
    hasData: false,
    cycleAnalysis: null,
    predictions: null,
    healthTips: [],
    insights: [],
    anomalies: [],
    trendData: [],
    trendMaxHeight: 200,
    avgLineBottom: 0
  },

  _unsubPeriods: null,
  _unsubSettings: null,

  onShow: function () {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
    }
    this._refreshData()
    this._subscribe()
  },

  onHide: function () {
    this._unsubscribe()
  },

  _refreshData: function () {
    var periods = store.get('periods') || []
    var settings = store.get('settings') || { cycleLength: 28, periodLength: 5 }

    if (!periods.length) {
      this.setData({ hasData: false })
      return
    }

    var report = analysis.generateReport(periods, settings)
    var trend = analysis.getCycleTrend(periods)
    var anomalies = analysis.detectAnomalies(periods, settings)

    // 计算柱状图高度比例
    var maxHeight = 200
    var trendBars = this._buildTrendBars(trend, maxHeight)
    var avgLineBottom = 0
    if (trendBars.length && report.cycleAnalysis) {
      var maxVal = this._getMaxLength(trend)
      if (maxVal > 0) {
        avgLineBottom = Math.round((report.cycleAnalysis.avgCycle / maxVal) * maxHeight)
      }
    }

    this.setData({
      hasData: true,
      cycleAnalysis: report.cycleAnalysis,
      predictions: report.predictions,
      healthTips: report.healthTips,
      insights: report.insights,
      anomalies: anomalies,
      trendData: trendBars,
      trendMaxHeight: maxHeight,
      avgLineBottom: avgLineBottom
    })
  },

  _getMaxLength: function (trend) {
    var max = 0
    for (var i = 0; i < trend.length; i++) {
      if (trend[i].length > max) max = trend[i].length
    }
    return max
  },

  _buildTrendBars: function (trend, maxHeight) {
    if (!trend.length) return []
    var maxVal = this._getMaxLength(trend)
    if (maxVal === 0) return []
    var bars = []
    for (var i = 0; i < trend.length; i++) {
      var item = trend[i]
      var height = Math.round((item.length / maxVal) * maxHeight)
      if (height < 20) height = 20
      bars.push({
        cycle: item.cycle,
        length: item.length,
        height: height,
        startDate: item.startDate ? item.startDate.slice(5) : ''
      })
    }
    return bars
  },

  _formatDate: function (dateStr) {
    if (!dateStr) return '--'
    return dateStr.slice(5).replace('-', '/')
  },

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

  _unsubscribe: function () {
    if (this._unsubPeriods) {
      this._unsubPeriods()
      this._unsubPeriods = null
    }
    if (this._unsubSettings) {
      this._unsubSettings()
      this._unsubSettings = null
    }
  }
})
