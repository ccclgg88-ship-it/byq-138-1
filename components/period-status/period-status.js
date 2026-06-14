Component({
  properties: {
    status: {
      type: Object,
      value: {
        status: 'not_in_period',
        currentDay: 0,
        daysUntilNext: 0,
        nextPredictDate: '',
        currentPhase: 'follicular',
        phaseText: '暂无经期记录',
        cycleDay: 0,
        totalCycleDays: 28
      }
    }
  },

  data: {
    progressDeg: 0,
    phaseColor: '#4ECDC4',
    phaseLabel: '卵泡期',
    isInPeriod: false,
    displayDay: '0',
    formattedDate: ''
  },

  observers: {
    'status': function (val) {
      if (!val) return
      this._updateDisplay(val)
    }
  },

  attached: function () {
    this._updateDisplay(this.properties.status)
  },

  methods: {
    _updateDisplay: function (s) {
      if (!s) return

      var phaseColorMap = {
        menstrual: '#FF6B8A',
        follicular: '#4ECDC4',
        ovulation: '#9B6BFF',
        luteal: '#FFB347'
      }

      var phaseLabelMap = {
        menstrual: '经期',
        follicular: '卵泡期',
        ovulation: '排卵期',
        luteal: '黄体期'
      }

      var phase = s.currentPhase || 'follicular'
      var isInPeriod = s.status === 'in_period'
      var cycleDay = s.cycleDay || 0
      var total = s.totalCycleDays || 28

      // 环形进度：当前周期天数 / 总周期天数
      var progress = total > 0 ? (cycleDay / total) : 0
      if (progress > 1) progress = 1
      var progressDeg = Math.round(progress * 360)

      // 格式化预测日期
      var formattedDate = ''
      if (s.nextPredictDate) {
        var parts = s.nextPredictDate.split('-')
        if (parts.length === 3) {
          formattedDate = parseInt(parts[1], 10) + '月' + parseInt(parts[2], 10) + '日'
        }
      }

      this.setData({
        progressDeg: progressDeg,
        phaseColor: phaseColorMap[phase] || '#4ECDC4',
        phaseLabel: phaseLabelMap[phase] || '卵泡期',
        isInPeriod: isInPeriod,
        displayDay: isInPeriod ? String(s.currentDay || 0) : String(cycleDay),
        formattedDate: formattedDate
      })
    }
  }
})
