/**
 * period.js - 经期计算核心引擎
 * 所有日期使用 'YYYY-MM-DD' 字符串格式
 */

// ===== 日期工具函数 =====

/** 格式化日期为 YYYY-MM-DD */
function formatDate(date) {
  var y = date.getFullYear()
  var m = date.getMonth() + 1
  var d = date.getDate()
  return y + '-' + (m < 10 ? '0' + m : m) + '-' + (d < 10 ? '0' + d : d)
}

/** 解析日期字符串，使用本地时间避免时区偏移 */
function parseDate(str) {
  if (!str || typeof str !== 'string') return new Date(NaN)
  var parts = str.split('-')
  if (parts.length !== 3) return new Date(NaN)
  var y = parseInt(parts[0], 10)
  var m = parseInt(parts[1], 10)
  var d = parseInt(parts[2], 10)
  if (isNaN(y) || isNaN(m) || isNaN(d)) return new Date(NaN)
  return new Date(y, m - 1, d)
}

/** 两个日期字符串之间的天数差（date1 - date2） */
function daysBetween(dateStr1, dateStr2) {
  var d1 = parseDate(dateStr1)
  var d2 = parseDate(dateStr2)
  var ms = d1.getTime() - d2.getTime()
  return Math.round(ms / 86400000)
}

/** 日期加减天数，返回 YYYY-MM-DD */
function addDays(dateStr, days) {
  var d = parseDate(dateStr)
  d.setDate(d.getDate() + days)
  return formatDate(d)
}

/** 获取某月的天数，month 从 1 开始 */
function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

/** 判断是否同一天 */
function isSameDay(dateStr1, dateStr2) {
  return dateStr1 === dateStr2
}

/** 今天的日期字符串 */
function today() {
  return formatDate(new Date())
}

/** 生成唯一ID */
function generateId() {
  var hex = 'abcdef0123456789'
  var id = ''
  for (var i = 0; i < 24; i++) {
    id += hex.charAt(Math.floor(Math.random() * hex.length))
  }
  return id + '_' + Date.now().toString(36)
}

// ===== 内部辅助函数 =====

/**
 * 对经期记录按 startDate 升序排序（返回新数组）
 * store 中是降序存储的，计算时需要升序
 */
function _sortPeriodsAsc(periods) {
  if (!periods || !periods.length) return []
  return periods.slice().sort(function (a, b) {
    return a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : 0
  })
}

/**
 * 找到距离 dateStr 最近的、已结束的经期记录（startDate <= dateStr）
 * periods 需要是升序的
 */
function _findLatestPeriodBefore(dateStr, sortedPeriods) {
  var result = null
  for (var i = 0; i < sortedPeriods.length; i++) {
    if (sortedPeriods[i].startDate <= dateStr) {
      result = sortedPeriods[i]
    } else {
      break
    }
  }
  return result
}

// ===== 经期阶段计算 =====

/**
 * 获取某一天的经期阶段
 * @param {string} dateStr - YYYY-MM-DD
 * @param {Array} periods - 经期记录数组 [{id, startDate, endDate}, ...]
 * @param {Object} settings - {cycleLength: 28, periodLength: 5}
 * @returns {Object} { phase, isRecorded, periodId }
 */
function getPhaseForDate(dateStr, periods, settings) {
  var defaultResult = { phase: 'unknown', isRecorded: false, periodId: null }

  if (!periods || !periods.length) return defaultResult
  if (!dateStr) return defaultResult

  var cycleLen = (settings && settings.cycleLength) || 28
  var periodLen = (settings && settings.periodLength) || 5

  // 1. 检查是否在已记录的经期范围内
  for (var i = 0; i < periods.length; i++) {
    var p = periods[i]
    if (p.startDate && p.endDate && dateStr >= p.startDate && dateStr <= p.endDate) {
      return { phase: 'menstrual', isRecorded: true, periodId: p.id }
    }
    // 如果只有 startDate 没有 endDate，用 periodLength 推算结束日
    if (p.startDate && !p.endDate) {
      var inferredEnd = addDays(p.startDate, periodLen - 1)
      if (dateStr >= p.startDate && dateStr <= inferredEnd) {
        return { phase: 'menstrual', isRecorded: true, periodId: p.id }
      }
    }
  }

  // 2. 找到最近的已记录经期，基于它推算阶段
  var sorted = _sortPeriodsAsc(periods)
  var latest = _findLatestPeriodBefore(dateStr, sorted)

  // 如果没有找到（dateStr 在所有记录之前），尝试用最早的记录反推
  if (!latest) {
    // dateStr 在所有经期之前，无法推算
    return defaultResult
  }

  var refStart = latest.startDate
  var diff = daysBetween(dateStr, refStart)

  // 防止极端情况：diff 过大时不做推算（超过365天）
  if (diff > 365 || diff < 0) return defaultResult

  // 计算在周期中的位置（取模）
  var posInCycle = diff % cycleLen
  if (posInCycle < 0) posInCycle += cycleLen

  // 下次经期开始日距离参考经期开始日的天数
  // 找到 dateStr 所在的那个周期
  var cycleIndex = Math.floor(diff / cycleLen)
  var cycleStartDate = addDays(refStart, cycleIndex * cycleLen)

  // 该周期内的各阶段
  // 经期：第0天 ~ 第(periodLen-1)天
  // 排卵日：第(cycleLen-14)天
  // 易孕期：排卵日前5天 ~ 排卵日后1天
  // 卵泡期：经期结束后 ~ 易孕期前
  // 黄体期：易孕期后 ~ 下次经期前

  var dayInCycle = daysBetween(dateStr, cycleStartDate)

  // 预测经期
  if (dayInCycle >= 0 && dayInCycle < periodLen) {
    return { phase: 'predicted_menstrual', isRecorded: false, periodId: null }
  }

  var ovulationDay = cycleLen - 14
  var fertileStart = ovulationDay - 5
  var fertileEnd = ovulationDay + 1

  // 排卵日
  if (dayInCycle === ovulationDay) {
    return { phase: 'ovulation', isRecorded: false, periodId: null }
  }

  // 易孕期（含排卵日附近）
  if (dayInCycle >= fertileStart && dayInCycle <= fertileEnd) {
    return { phase: 'ovulation', isRecorded: false, periodId: null }
  }

  // 卵泡期：经期结束后到易孕期前
  if (dayInCycle >= periodLen && dayInCycle < fertileStart) {
    return { phase: 'follicular', isRecorded: false, periodId: null }
  }

  // 黄体期：易孕期后到下次经期前
  if (dayInCycle > fertileEnd && dayInCycle < cycleLen) {
    return { phase: 'luteal', isRecorded: false, periodId: null }
  }

  return { phase: 'safe', isRecorded: false, periodId: null }
}

/**
 * 获取某月的日历数据
 * @param {number} year
 * @param {number} month - 1-12
 * @param {Array} periods
 * @param {Object} settings
 * @returns {Array} 6行×7列二维数组
 */
function getMonthCalendarData(year, month, periods, settings) {
  var todayStr = today()
  var daysInMonth = getDaysInMonth(year, month)

  // 本月1号是星期几（0=周日）
  var firstDayWeekday = new Date(year, month - 1, 1).getDay()

  var rows = []
  var cells = []

  // 填充上月末尾的日期
  if (firstDayWeekday > 0) {
    var prevMonth = month === 1 ? 12 : month - 1
    var prevYear = month === 1 ? year - 1 : year
    var prevDays = getDaysInMonth(prevYear, prevMonth)
    for (var i = firstDayWeekday - 1; i >= 0; i--) {
      var d = prevDays - i
      var ds = formatDate(new Date(prevYear, prevMonth - 1, d))
      var phaseInfo = getPhaseForDate(ds, periods, settings)
      cells.push({
        dateStr: ds,
        day: d,
        isCurrentMonth: false,
        isToday: ds === todayStr,
        phase: phaseInfo.phase,
        isRecorded: phaseInfo.isRecorded,
        periodId: phaseInfo.periodId
      })
    }
  }

  // 填充本月日期
  for (var day = 1; day <= daysInMonth; day++) {
    var ds2 = formatDate(new Date(year, month - 1, day))
    var phaseInfo2 = getPhaseForDate(ds2, periods, settings)
    cells.push({
      dateStr: ds2,
      day: day,
      isCurrentMonth: true,
      isToday: ds2 === todayStr,
      phase: phaseInfo2.phase,
      isRecorded: phaseInfo2.isRecorded,
      periodId: phaseInfo2.periodId
    })
  }

  // 填充下月开头的日期，凑满6行×7列=42格
  var totalCells = 42
  var remaining = totalCells - cells.length
  var nextMonth = month === 12 ? 1 : month + 1
  var nextYear = month === 12 ? year + 1 : year
  for (var nd = 1; nd <= remaining; nd++) {
    var ds3 = formatDate(new Date(nextYear, nextMonth - 1, nd))
    var phaseInfo3 = getPhaseForDate(ds3, periods, settings)
    cells.push({
      dateStr: ds3,
      day: nd,
      isCurrentMonth: false,
      isToday: ds3 === todayStr,
      phase: phaseInfo3.phase,
      isRecorded: phaseInfo3.isRecorded,
      periodId: phaseInfo3.periodId
    })
  }

  // 切分为6行
  for (var r = 0; r < 6; r++) {
    rows.push(cells.slice(r * 7, r * 7 + 7))
  }

  return rows
}

/**
 * 预测未来N个周期的经期
 * @param {Array} periods - 已记录的经期
 * @param {Object} settings
 * @param {number} count - 预测几个周期，默认3，最多3
 * @returns {Array} [{startDate, endDate, isPredict: true}, ...]
 */
function predictFuturePeriods(periods, settings, count) {
  var n = Math.min(count || 3, 3)
  if (!periods || !periods.length) return []

  var cycleLen = (settings && settings.cycleLength) || 28
  var periodLen = (settings && settings.periodLength) || 5

  // 找到最近一次经期（startDate 最大的）
  var sorted = _sortPeriodsAsc(periods)
  var latest = sorted[sorted.length - 1]
  if (!latest || !latest.startDate) return []

  var predictions = []
  var baseStart = latest.startDate

  for (var i = 1; i <= n; i++) {
    var nextStart = addDays(baseStart, cycleLen * i)
    var nextEnd = addDays(nextStart, periodLen - 1)
    predictions.push({
      startDate: nextStart,
      endDate: nextEnd,
      isPredict: true
    })
  }

  return predictions
}

/**
 * 计算平均周期长度（基于历史数据）
 * @param {Array} periods - 至少需要2条记录才能计算
 * @returns {number|null} 平均周期天数，数据不足返回null
 */
function calculateAverageCycle(periods) {
  if (!periods || periods.length < 2) return null

  var sorted = _sortPeriodsAsc(periods)
  var gaps = []

  for (var i = 1; i < sorted.length; i++) {
    var gap = daysBetween(sorted[i].startDate, sorted[i - 1].startDate)
    // 过滤异常值：周期在15~60天之间才算有效
    if (gap >= 15 && gap <= 60) {
      gaps.push(gap)
    }
  }

  if (gaps.length === 0) return null

  var sum = 0
  for (var j = 0; j < gaps.length; j++) {
    sum += gaps[j]
  }

  return Math.round(sum / gaps.length)
}

/**
 * 获取当前经期状态摘要
 * @param {Array} periods
 * @param {Object} settings
 * @returns {Object} 状态摘要
 */
function getCurrentStatus(periods, settings) {
  var todayStr = today()
  var cycleLen = (settings && settings.cycleLength) || 28
  var periodLen = (settings && settings.periodLength) || 5

  // 默认返回值（无记录时）
  var defaultStatus = {
    status: 'not_in_period',
    currentDay: 0,
    daysUntilNext: 0,
    nextPredictDate: '',
    currentPhase: 'follicular',
    phaseText: '暂无经期记录',
    cycleDay: 0,
    totalCycleDays: cycleLen
  }

  if (!periods || !periods.length) return defaultStatus

  // 检查今天是否在某条经期记录中
  var activePeriod = null
  for (var i = 0; i < periods.length; i++) {
    var p = periods[i]
    var endDate = p.endDate || addDays(p.startDate, periodLen - 1)
    if (todayStr >= p.startDate && todayStr <= endDate) {
      activePeriod = p
      break
    }
  }

  if (activePeriod) {
    var currentDay = daysBetween(todayStr, activePeriod.startDate) + 1
    var nextStart = addDays(activePeriod.startDate, cycleLen)
    return {
      status: 'in_period',
      currentDay: currentDay,
      daysUntilNext: daysBetween(nextStart, todayStr),
      nextPredictDate: nextStart,
      currentPhase: 'menstrual',
      phaseText: '经期第' + currentDay + '天',
      cycleDay: currentDay,
      totalCycleDays: cycleLen
    }
  }

  // 不在经期中，找最近的已记录经期来推算
  var sorted = _sortPeriodsAsc(periods)
  var latest = sorted[sorted.length - 1]

  if (!latest) return defaultStatus

  var diff = daysBetween(todayStr, latest.startDate)
  if (diff < 0) {
    // 今天在所有记录之前（不太可能但防御性处理）
    return defaultStatus
  }

  // 当前处于第几个周期
  var cycleIndex = Math.floor(diff / cycleLen)
  var cycleStartDate = addDays(latest.startDate, cycleIndex * cycleLen)
  var cycleDay = daysBetween(todayStr, cycleStartDate) + 1
  var nextPredictDate = addDays(latest.startDate, (cycleIndex + 1) * cycleLen)
  var daysUntilNext = daysBetween(nextPredictDate, todayStr)

  // 如果 daysUntilNext 为负数，说明已经过了预测日，推到下一个周期
  if (daysUntilNext < 0) {
    nextPredictDate = addDays(nextPredictDate, cycleLen)
    daysUntilNext = daysBetween(nextPredictDate, todayStr)
    cycleDay = daysBetween(todayStr, addDays(cycleStartDate, cycleLen)) + 1
  }

  // 确定当前阶段
  var phaseInfo = getPhaseForDate(todayStr, periods, settings)
  var phaseMap = {
    menstrual: 'menstrual',
    predicted_menstrual: 'menstrual',
    follicular: 'follicular',
    ovulation: 'ovulation',
    luteal: 'luteal',
    safe: 'luteal',
    unknown: 'follicular'
  }
  var currentPhase = phaseMap[phaseInfo.phase] || 'follicular'

  var phaseText = '距下次经期还有' + daysUntilNext + '天'
  if (daysUntilNext === 0) {
    phaseText = '预计今天来经期'
  }

  return {
    status: 'not_in_period',
    currentDay: 0,
    daysUntilNext: daysUntilNext,
    nextPredictDate: nextPredictDate,
    currentPhase: currentPhase,
    phaseText: phaseText,
    cycleDay: cycleDay,
    totalCycleDays: cycleLen
  }
}

// ===== 模块导出 =====

module.exports = {
  // 日期工具
  formatDate: formatDate,
  parseDate: parseDate,
  daysBetween: daysBetween,
  addDays: addDays,
  getDaysInMonth: getDaysInMonth,
  isSameDay: isSameDay,
  today: today,
  generateId: generateId,
  // 经期计算
  getPhaseForDate: getPhaseForDate,
  getMonthCalendarData: getMonthCalendarData,
  predictFuturePeriods: predictFuturePeriods,
  calculateAverageCycle: calculateAverageCycle,
  getCurrentStatus: getCurrentStatus
}