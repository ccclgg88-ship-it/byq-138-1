var periodUtil = require('../../utils/period.js')

Component({
  properties: {
    periods: {
      type: Array,
      value: []
    },
    settings: {
      type: Object,
      value: { cycleLength: 28, periodLength: 5 }
    },
    selectedDate: {
      type: String,
      value: ''
    }
  },

  data: {
    currentYear: 0,
    currentMonth: 0,
    calendarData: [],
    weekDays: ['日', '一', '二', '三', '四', '五', '六'],
    displayMonth: '',
    showTodayBtn: false
  },

  observers: {
    'periods, settings': function () {
      this._buildCalendar()
    }
  },

  attached: function () {
    var now = new Date()
    this.setData({
      currentYear: now.getFullYear(),
      currentMonth: now.getMonth() + 1
    }, function () {
      this._buildCalendar()
      this._updateDisplayMonth()
    }.bind(this))
  },

  methods: {
    /** 构建当月日历数据 */
    _buildCalendar: function () {
      var year = this.data.currentYear
      var month = this.data.currentMonth
      if (!year || !month) return

      var data = periodUtil.getMonthCalendarData(
        year, month,
        this.properties.periods,
        this.properties.settings
      )
      this.setData({ calendarData: data })
    },

    /** 更新顶部月份显示文本和"回到今天"按钮可见性 */
    _updateDisplayMonth: function () {
      var now = new Date()
      var isCurrentMonth = (
        this.data.currentYear === now.getFullYear() &&
        this.data.currentMonth === now.getMonth() + 1
      )
      this.setData({
        displayMonth: this.data.currentYear + '年' + this.data.currentMonth + '月',
        showTodayBtn: !isCurrentMonth
      })
    },

    /** 上一个月 */
    prevMonth: function () {
      var year = this.data.currentYear
      var month = this.data.currentMonth - 1
      if (month < 1) {
        month = 12
        year--
      }
      this.setData({ currentYear: year, currentMonth: month }, function () {
        this._buildCalendar()
        this._updateDisplayMonth()
        this.triggerEvent('monthChange', { year: year, month: month })
      }.bind(this))
    },

    /** 下一个月 */
    nextMonth: function () {
      var year = this.data.currentYear
      var month = this.data.currentMonth + 1
      if (month > 12) {
        month = 1
        year++
      }
      this.setData({ currentYear: year, currentMonth: month }, function () {
        this._buildCalendar()
        this._updateDisplayMonth()
        this.triggerEvent('monthChange', { year: year, month: month })
      }.bind(this))
    },

    /** 回到今天 */
    goToday: function () {
      var now = new Date()
      var year = now.getFullYear()
      var month = now.getMonth() + 1
      this.setData({
        currentYear: year,
        currentMonth: month,
        selectedDate: periodUtil.today()
      }, function () {
        this._buildCalendar()
        this._updateDisplayMonth()
        this.triggerEvent('monthChange', { year: year, month: month })
      }.bind(this))
    },

    /** 点击日期 */
    onDateTap: function (e) {
      var cell = e.currentTarget.dataset.cell
      if (!cell || !cell.dateStr) return

      this.setData({ selectedDate: cell.dateStr })
      this.triggerEvent('dateSelect', {
        dateStr: cell.dateStr,
        phase: cell.phase,
        isRecorded: cell.isRecorded,
        periodId: cell.periodId
      })
    }
  }
})
