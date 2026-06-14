var store = require('../../utils/store.js')
var symptomsUtil = require('../../utils/symptoms.js')
var period = require('../../utils/period.js')

Page({
  data: {
    activeTab: 'symptom',
    weeklyOverview: null,
    trendData: [],
    trendMaxHeight: 120,
    phaseDistribution: {},
    phaseList: [],
    moodAnalysis: null,
    tempAnalysis: null,
    monthlySummary: null,
    currentMonthLabel: '',
    symptomMeta: {},
    showInsight: false,
    currentInsight: null
  },

  _unsubRecords: null,

  onLoad: function () {
    this._loadData()
    this._subscribe()
  },

  onUnload: function () {
    if (this._unsubRecords) {
      this._unsubRecords()
      this._unsubRecords = null
    }
  },

  onShow: function () {
    this._loadData()
  },

  _subscribe: function () {
    var self = this
    this._unsubRecords = store.subscribe('dailyRecords', function () {
      self._loadData()
    })
  },

  _loadData: function () {
    var dailyRecords = store.get('dailyRecords') || {}
    var periods = store.get('periods') || []
    var settings = store.get('settings') || { cycleLength: 28, periodLength: 5 }

    var now = new Date()
    var year = now.getFullYear()
    var month = now.getMonth() + 1

    var weekly = symptomsUtil.getWeeklyOverview(dailyRecords, periods, settings)
    var trend = symptomsUtil.getSymptomTrend(dailyRecords, periods, settings, 28)
    var phaseDist = symptomsUtil.getPhaseSymptomDistribution(dailyRecords, periods, settings)
    var mood = symptomsUtil.getMoodAnalysis(dailyRecords, periods, settings)
    var temp = symptomsUtil.getTemperatureAnalysis(dailyRecords, periods, settings)
    var monthly = symptomsUtil.getMonthlySummary(dailyRecords, periods, settings, year, month)

    var phaseList = []
    Object.keys(phaseDist).forEach(function (phase) {
      if (phaseDist[phase] && phaseDist[phase].recordCount > 0) {
        phaseList.push(phaseDist[phase])
      }
    })

    // 趋势图高度
    var maxSymptom = 0
    for (var i = 0; i < trend.length; i++) {
      if (trend[i].symptomCount > maxSymptom) {
        maxSymptom = trend[i].symptomCount
      }
    }

    var tempDataPoints = temp.dataPoints || []
    var tempMin = 36.0
    var tempMax = 37.0
    if (tempDataPoints.length > 0) {
      for (var j = 0; j < tempDataPoints.length; j++) {
        var t = tempDataPoints[j].temperature
        if (t < tempMin) tempMin = t
        if (t > tempMax) tempMax = t
      }
      tempMin = Math.floor(tempMin * 10) / 10 - 0.1
      tempMax = Math.ceil(tempMax * 10) / 10 + 0.1
    }

    this.setData({
      weeklyOverview: weekly,
      trendData: trend,
      trendMaxSymptom: maxSymptom,
      phaseDistribution: phaseDist,
      phaseList: phaseList,
      moodAnalysis: mood,
      tempAnalysis: temp,
      tempMin: tempMin,
      tempMax: tempMax,
      monthlySummary: monthly,
      currentMonthLabel: year + '年' + month + '月',
      symptomMeta: symptomsUtil.SYMPTOM_META
    })
  },

  onTabChange: function (e) {
    var tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab })
  },

  onSymptomTap: function (e) {
    var key = e.currentTarget.dataset.key
    var advice = symptomsUtil.SYMPTOM_ADVICE[key]
    if (!advice) return

    var meta = symptomsUtil.SYMPTOM_META[key]
    this.setData({
      showInsight: true,
      currentInsight: {
        key: key,
        label: meta ? meta.label : key,
        icon: meta ? meta.icon : '💊',
        insight: advice.insight,
        tips: advice.tips
      }
    })
  },

  onCloseInsight: function () {
    this.setData({ showInsight: false, currentInsight: null })
  },

  onGoHealth: function () {
    wx.navigateTo({
      url: '/pages/health/health'
    })
  },

  onArticleJump: function (e) {
    var keyword = e.currentTarget.dataset.keyword
    if (keyword) {
      wx.navigateTo({
        url: '/pages/health/health?keyword=' + encodeURIComponent(keyword)
      })
    }
  }
})
