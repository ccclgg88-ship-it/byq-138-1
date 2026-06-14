var store = require('../../utils/store.js')
var period = require('../../utils/period.js')
var util = require('../../utils/util.js')
var articlesData = require('../../data/articles.js')

var WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

var SYMPTOM_LIST = [
  { key: 'cramps', label: '痛经' },
  { key: 'headache', label: '头痛' },
  { key: 'backache', label: '腰酸' },
  { key: 'breast_tenderness', label: '乳房胀痛' },
  { key: 'fatigue', label: '疲劳' },
  { key: 'insomnia', label: '失眠' },
  { key: 'diarrhea', label: '腹泻' },
  { key: 'appetite_change', label: '食欲变化' }
]

var MOOD_LIST = [
  { key: 'happy', emoji: '😊', label: '开心' },
  { key: 'normal', emoji: '😐', label: '一般' },
  { key: 'sad', emoji: '😢', label: '难过' },
  { key: 'irritated', emoji: '😤', label: '烦躁' },
  { key: 'tired', emoji: '😴', label: '疲惫' }
]

var PHASE_LABELS = {
  menstrual: '经期',
  predicted_menstrual: '预测经期',
  follicular: '卵泡期',
  ovulation: '排卵期',
  luteal: '黄体期',
  safe: '安全期',
  unknown: ''
}

var SYMPTOM_KEYWORDS = {
  cramps: { label: '痛经', keywords: ['痛经', '缓解', '经期'] },
  headache: { label: '头痛', keywords: ['头痛', '经期', 'PMS'] },
  backache: { label: '腰酸', keywords: ['腰酸', '瑜伽', '经期'] },
  breast_tenderness: { label: '乳房胀痛', keywords: ['乳房', 'PMS', '经前'] },
  fatigue: { label: '疲劳', keywords: ['疲劳', '补铁', '饮食'] },
  insomnia: { label: '失眠', keywords: ['失眠', '睡眠', 'PMS'] },
  diarrhea: { label: '腹泻', keywords: ['经期', '饮食', '健康知识'] },
  appetite_change: { label: '食欲变化', keywords: ['PMS', '饮食', '情绪'] }
}

var PHASE_KEYWORDS = {
  menstrual: { label: '经期', keywords: ['经期', '痛经', '月经量'] },
  predicted_menstrual: { label: '经期', keywords: ['经期', '痛经'] },
  follicular: { label: '卵泡期', keywords: ['卵泡期', '运动', '补铁'] },
  ovulation: { label: '排卵期', keywords: ['排卵期', '排卵', '基础体温'] },
  luteal: { label: '黄体期', keywords: ['黄体期', 'PMS', '情绪'] }
}

Page({
  data: {
    dateStr: '',
    displayDate: '',
    phaseLabel: '',
    phaseClass: '',
    // 经期状态
    isInPeriod: false,
    periodDayNum: 0,
    periodId: null,
    isPredicted: false,
    // 每日记录
    flow: '',
    symptoms: [],
    mood: '',
    temperature: '',
    notes: '',
    // 选项列表
    symptomList: SYMPTOM_LIST,
    moodList: MOOD_LIST,
    // 推荐文章
    symptomArticles: [],
    phaseArticles: [],
    recommendTitle: '健康知识推荐',
    // 当前阶段（用于推荐文章）
    currentPhase: 'unknown'
  },

  onLoad: function (options) {
    var dateStr = (options && options.date) || period.today()
    this.setData({ dateStr: dateStr })
    this._buildDateDisplay(dateStr)
    this._loadPhaseInfo(dateStr)
    this._loadDailyRecord(dateStr)
    this._updateSymptomList()
  },

  /** 构建日期显示文本 */
  _buildDateDisplay: function (dateStr) {
    var d = period.parseDate(dateStr)
    if (isNaN(d.getTime())) return
    var display = d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + WEEKDAYS[d.getDay()]
    this.setData({ displayDate: display })
  },

  /** 加载阶段信息与经期状态 */
  _loadPhaseInfo: function (dateStr) {
    var periods = store.get('periods') || []
    var settings = store.get('settings') || { cycleLength: 28, periodLength: 5 }
    var info = period.getPhaseForDate(dateStr, periods, settings)

    var phaseLabel = PHASE_LABELS[info.phase] || ''
    var phaseClass = 'phase-' + (info.phase || 'unknown')
    var isInPeriod = info.phase === 'menstrual' && info.isRecorded
    var isPredicted = info.phase === 'predicted_menstrual'
    var periodDayNum = 0

    if (isInPeriod && info.periodId) {
      var matched = periods.filter(function (p) { return p.id === info.periodId })[0]
      if (matched) {
        periodDayNum = period.daysBetween(dateStr, matched.startDate) + 1
      }
    }

    this.setData({
      phaseLabel: phaseLabel,
      phaseClass: phaseClass,
      isInPeriod: isInPeriod,
      isPredicted: isPredicted,
      periodDayNum: periodDayNum,
      periodId: info.periodId || null,
      currentPhase: info.phase || 'unknown'
    })
    this._refreshRecommendations()
  },

  /** 加载已有的每日记录 */
  _loadDailyRecord: function (dateStr) {
    var records = store.get('dailyRecords') || {}
    var rec = records[dateStr]
    if (rec) {
      this.setData({
        flow: rec.flow || '',
        symptoms: rec.symptoms || [],
        mood: rec.mood || '',
        temperature: rec.temperature != null ? String(rec.temperature) : '',
        notes: rec.notes || ''
      })
    }
    this._updateSymptomList()
  },

  /** 更新症状列表的选中状态 */
  _updateSymptomList: function () {
    var symptoms = this.data.symptoms
    var list = SYMPTOM_LIST.map(function (item) {
      return {
        key: item.key,
        label: item.label,
        selected: symptoms.indexOf(item.key) >= 0
      }
    })
    this.setData({ symptomList: list })
  },

  /** 选择经血量 */
  onFlowSelect: function (e) {
    var val = e.currentTarget.dataset.flow
    this.setData({ flow: this.data.flow === val ? '' : val })
  },

  /** 切换症状 */
  onSymptomToggle: function (e) {
    var key = e.currentTarget.dataset.key
    var symptoms = this.data.symptoms.slice()
    var idx = symptoms.indexOf(key)
    if (idx >= 0) {
      symptoms.splice(idx, 1)
    } else {
      symptoms.push(key)
    }
    this.setData({ symptoms: symptoms })
    this._updateSymptomList()
    this._refreshRecommendations()
  },

  /** 选择心情 */
  onMoodSelect: function (e) {
    var val = e.currentTarget.dataset.mood
    this.setData({ mood: this.data.mood === val ? '' : val })
  },

  /** 体温输入 */
  onTemperatureInput: function (e) {
    this.setData({ temperature: e.detail.value })
  },

  /** 备注输入 */
  onNotesInput: function (e) {
    this.setData({ notes: e.detail.value })
  },

  /** 标记为经期开始 */
  onMarkPeriodStart: function () {
    var dateStr = this.data.dateStr
    var newPeriod = {
      id: period.generateId(),
      startDate: dateStr,
      endDate: null
    }
    store.addPeriod(newPeriod)
    util.showToast('已标记经期开始', 'success')
    this._loadPhaseInfo(dateStr)
  },

  /** 确认预测经期为实际经期 */
  onConfirmPredicted: function () {
    var dateStr = this.data.dateStr
    var newPeriod = {
      id: period.generateId(),
      startDate: dateStr,
      endDate: null
    }
    store.addPeriod(newPeriod)
    util.showToast('已确认经期', 'success')
    this._loadPhaseInfo(dateStr)
  },

  /** 修改经期结束日期 */
  onSetEndDate: function () {
    var self = this
    var dateStr = this.data.dateStr
    var pid = this.data.periodId
    if (!pid) return

    // 将当前日期设为该条经期的结束日
    store.updatePeriod(pid, { endDate: dateStr })
    util.showToast('已设为经期结束日', 'success')
    self._loadPhaseInfo(dateStr)
  },

  /** 删除经期记录 */
  onDeletePeriod: function () {
    var self = this
    var pid = this.data.periodId
    if (!pid) return

    util.showConfirm('删除确认', '确定要删除这条经期记录吗？').then(function (confirmed) {
      if (!confirmed) return
      store.removePeriod(pid)
      util.showToast('已删除')
      self._loadPhaseInfo(self.data.dateStr)
    })
  },

  /** 保存每日记录 */
  onSave: function () {
    var temp = this.data.temperature ? parseFloat(this.data.temperature) : null
    if (this.data.temperature && (isNaN(temp) || temp < 35 || temp > 42)) {
      util.showToast('体温范围应在35~42°C')
      return
    }

    var record = {
      flow: this.data.flow,
      symptoms: this.data.symptoms,
      mood: this.data.mood,
      temperature: temp,
      notes: this.data.notes
    }

    store.saveDailyRecord(this.data.dateStr, record)
    util.showToast('保存成功', 'success')

    setTimeout(function () {
      wx.navigateBack()
    }, 1200)
  },

  /** 刷新推荐文章 */
  _refreshRecommendations: function () {
    var self = this
    var symptoms = this.data.symptoms || []
    var phase = this.data.currentPhase
    var phaseLabel = (PHASE_LABELS[phase] || '')

    var symptomArticles = []
    var usedIds = {}

    // 根据症状找文章
    for (var i = 0; i < symptoms.length; i++) {
      var sk = symptoms[i]
      var config = SYMPTOM_KEYWORDS[sk]
      if (!config) continue
      for (var j = 0; j < config.keywords.length; j++) {
        var matched = articlesData.searchArticles(config.keywords[j])
        for (var k = 0; k < matched.length; k++) {
          var art = matched[k]
          if (!usedIds[art.id]) {
            usedIds[art.id] = true
            var copy = Object.assign({}, art)
            copy.matchSymptom = config.label
            symptomArticles.push(copy)
          }
          if (symptomArticles.length >= 3) break
        }
        if (symptomArticles.length >= 3) break
      }
      if (symptomArticles.length >= 3) break
    }

    // 根据阶段找文章
    var phaseArticles = []
    var phaseConfig = PHASE_KEYWORDS[phase]
    if (phaseConfig && symptomArticles.length < 3) {
      for (var pj = 0; pj < phaseConfig.keywords.length; pj++) {
        var pm = articlesData.searchArticles(phaseConfig.keywords[pj])
        for (var pk = 0; pk < pm.length; pk++) {
          var part = pm[pk]
          if (!usedIds[part.id]) {
            usedIds[part.id] = true
            var pcopy = Object.assign({}, part)
            pcopy.matchPhase = phaseConfig.label
            phaseArticles.push(pcopy)
          }
          if (phaseArticles.length >= 2) break
        }
        if (phaseArticles.length >= 2) break
      }
    }

    // 确定标题
    var title = '健康知识推荐'
    if (symptomArticles.length > 0 && phaseLabel) {
      title = '针对症状与' + phaseLabel + '的建议'
    } else if (symptomArticles.length > 0) {
      title = '针对症状的建议'
    } else if (phaseArticles.length > 0 && phaseLabel) {
      title = phaseLabel + '健康建议'
    }

    this.setData({
      symptomArticles: symptomArticles,
      phaseArticles: phaseArticles,
      recommendTitle: title
    })
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
