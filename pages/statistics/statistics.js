var store = require('../../utils/store.js')
var analysis = require('../../utils/analysis.js')
var period = require('../../utils/period.js')
var articlesData = require('../../data/articles.js')

var PHASE_ARTICLE_KEYWORDS = {
  menstrual: ['经期', '痛经', '月经量', '经期不规律'],
  follicular: ['卵泡期', '运动', '补铁', '饮食'],
  ovulation: ['排卵期', '排卵', '基础体温', '受孕'],
  luteal: ['黄体期', 'PMS', '情绪', '经前', '睡眠']
}

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
    avgLineBottom: 0,
    phaseArticles: [],
    phaseRecommendTitle: ''
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

    // 根据当前阶段推荐文章
    var currentStatus = period.getCurrentStatus(periods, settings)
    var currentPhase = currentStatus.currentPhase || 'follicular'
    var phaseInfo = this._getPhaseRecommendations(currentPhase)

    this.setData({
      hasData: true,
      cycleAnalysis: report.cycleAnalysis,
      predictions: report.predictions,
      healthTips: report.healthTips,
      insights: report.insights,
      anomalies: anomalies,
      trendData: trendBars,
      trendMaxHeight: maxHeight,
      avgLineBottom: avgLineBottom,
      phaseArticles: phaseInfo.articles,
      phaseRecommendTitle: phaseInfo.title
    })
  },

  _getPhaseRecommendations: function (phase) {
    var keywords = PHASE_ARTICLE_KEYWORDS[phase] || []
    var titleMap = {
      menstrual: '经期相关知识',
      follicular: '卵泡期调养指南',
      ovulation: '排卵期必备知识',
      luteal: '黄体期舒缓建议'
    }
    var title = titleMap[phase] || '健康知识推荐'

    var found = []
    for (var i = 0; i < keywords.length; i++) {
      var matched = articlesData.searchArticles(keywords[i])
      for (var j = 0; j < matched.length; j++) {
        if (!found.find(function (a) { return a.id === matched[j].id })) {
          found.push(matched[j])
        }
      }
    }

    if (found.length < 3) {
      var daily = articlesData.getDailyArticles()
      for (var k = 0; k < daily.length; k++) {
        if (!found.find(function (a) { return a.id === daily[k].id })) {
          found.push(daily[k])
        }
      }
    }

    return {
      title: title,
      articles: found.slice(0, 3)
    }
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
  },

  /** 跳转到文章详情 */
  onArticleTap: function (e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: '/pages/article/article?id=' + id
    })
  },

  /** 跳转到健康知识中心 */
  onGoHealth: function () {
    wx.navigateTo({
      url: '/pages/health/health'
    })
  }
})
