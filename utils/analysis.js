/**
 * analysis.js - 智能分析引擎
 * 基于统计学方法的经期数据分析，提供类似AI的分析体验
 */

var period = require('./period')

// ===== 内部辅助函数 =====

/** 按 startDate 升序排序（返回新数组） */
function _sortAsc(periods) {
  if (!periods || !periods.length) return []
  return periods.slice().sort(function (a, b) {
    return a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : 0
  })
}

/** 计算经期持续天数 */
function _getPeriodLength(p, defaultLen) {
  if (p.startDate && p.endDate) {
    return period.daysBetween(p.endDate, p.startDate) + 1
  }
  return defaultLen || 5
}

/** 计算相邻记录之间的周期长度数组 */
function _getCycleLengths(periods) {
  var sorted = _sortAsc(periods)
  var lengths = []
  for (var i = 1; i < sorted.length; i++) {
    var gap = period.daysBetween(sorted[i].startDate, sorted[i - 1].startDate)
    if (gap >= 15 && gap <= 60) {
      lengths.push(gap)
    }
  }
  return lengths
}

/** 计算数组平均值 */
function _mean(arr) {
  if (!arr.length) return 0
  var sum = 0
  for (var i = 0; i < arr.length; i++) sum += arr[i]
  return sum / arr.length
}

/** 计算标准差 sqrt(sum((x-mean)^2) / n) */
function _stdDev(arr) {
  if (arr.length < 2) return 0
  var avg = _mean(arr)
  var sumSq = 0
  for (var i = 0; i < arr.length; i++) {
    var diff = arr[i] - avg
    sumSq += diff * diff
  }
  return Math.sqrt(sumSq / arr.length)
}

// ===== 健康建议数据库 =====

var PHASE_ADVICE = {
  menstrual: [
    { icon: '🌡️', title: '注意保暖', text: '经期身体较敏感，注意腹部和腰部保暖，避免受凉引起痛经加重' },
    { icon: '🍎', title: '补充铁质', text: '多吃富含铁的食物如红枣、菠菜、动物肝脏，预防经期贫血' },
    { icon: '💧', title: '多喝温水', text: '保持充足水分摄入，温热的水有助于缓解腹部不适和促进血液循环' },
    { icon: '🧘', title: '适度休息', text: '避免剧烈运动和重体力劳动，可以做轻柔的瑜伽或散步放松身心' },
    { icon: '🍫', title: '适量补充能量', text: '经期能量消耗增加，可适量食用黑巧克力，有助于缓解情绪波动' },
    { icon: '🛁', title: '注意卫生', text: '勤换卫生用品，建议每2-3小时更换一次，淋浴代替盆浴' },
    { icon: '😴', title: '保证睡眠', text: '经期容易疲劳，尽量保证7-8小时充足睡眠，有助于身体恢复' }
  ],
  follicular: [
    { icon: '🏃', title: '增加运动', text: '卵泡期雌激素上升，精力充沛，是增加运动强度的好时机' },
    { icon: '🥗', title: '均衡饮食', text: '多摄入优质蛋白和新鲜蔬果，为卵泡发育提供充足营养' },
    { icon: '📚', title: '学习充电', text: '这个阶段思维敏捷、记忆力好，适合学习新技能或处理复杂工作' },
    { icon: '💪', title: '力量训练', text: '雌激素有助于肌肉恢复，适合进行力量训练和高强度间歇运动' },
    { icon: '🌿', title: '补充叶酸', text: '卵泡期适当补充叶酸和B族维生素，有助于卵泡健康发育' },
    { icon: '😊', title: '社交活动', text: '这个阶段情绪积极、精力旺盛，适合安排社交和重要活动' }
  ],
  ovulation: [
    { icon: '🌸', title: '关注排卵信号', text: '留意体温微升、白带变化等排卵信号，有助于了解自己的身体' },
    { icon: '💑', title: '备孕提示', text: '排卵期前后是受孕几率最高的时段，备孕或避孕都需特别注意' },
    { icon: '🥛', title: '补充钙质', text: '排卵期适当补充钙质和维生素D，有助于维持激素平衡' },
    { icon: '🧴', title: '皮肤护理', text: '排卵期雌激素达到峰值，皮肤状态最佳，适合做深层护理' },
    { icon: '🏊', title: '保持运动', text: '继续保持适度运动，但避免过度疲劳，游泳和慢跑都是不错的选择' },
    { icon: '🍵', title: '舒缓情绪', text: '部分人排卵期会有轻微不适，可以喝花茶放松心情' }
  ],
  luteal: [
    { icon: '🫖', title: '舒缓放松', text: '黄体期孕激素升高，可能出现情绪波动，适当饮用玫瑰花茶或薰衣草茶' },
    { icon: '🥑', title: '健康饮食', text: '减少盐分和咖啡因摄入，多吃富含镁的食物如坚果、牛油果，缓解经前不适' },
    { icon: '🧘', title: '温和运动', text: '选择瑜伽、普拉提等温和运动，避免高强度训练，有助于缓解经前综合征' },
    { icon: '😴', title: '充足睡眠', text: '黄体期容易感到疲倦和嗜睡，保证充足睡眠质量，避免熬夜' },
    { icon: '📝', title: '记录症状', text: '留意并记录经前症状如胸胀、腹胀、情绪变化，有助于了解自身规律' },
    { icon: '🍌', title: '补充维生素B6', text: '香蕉、全谷物富含维生素B6，有助于缓解经前期的情绪低落和水肿' }
  ]
}

// ===== 核心函数 =====

/**
 * 获取当前阶段的健康建议
 * @param {string} phase - 'menstrual'|'follicular'|'ovulation'|'luteal'
 * @returns {Array} [{icon, title, text}, ...] 5条以上建议
 */
function getPhaseAdvice(phase) {
  var advice = PHASE_ADVICE[phase]
  if (!advice) {
    // 未知阶段返回通用建议
    return [
      { icon: '💧', title: '多喝水', text: '每天保持1500-2000ml的饮水量，促进新陈代谢' },
      { icon: '🏃', title: '适度运动', text: '每周保持3-5次中等强度运动，每次30分钟以上' },
      { icon: '😴', title: '规律作息', text: '保持规律的作息时间，每天7-8小时充足睡眠' },
      { icon: '🥗', title: '均衡饮食', text: '注意营养均衡，多吃蔬果，减少油腻和刺激性食物' },
      { icon: '😊', title: '保持心情', text: '学会调节情绪，适当放松，保持积极乐观的心态' }
    ]
  }
  return advice.slice()
}

/**
 * 获取周期长度趋势数据（用于图表展示）
 * @param {Array} periods
 * @returns {Array} [{ cycle, length, periodLength, startDate }, ...] 最多12个
 */
function getCycleTrend(periods) {
  if (!periods || periods.length < 2) return []

  var sorted = _sortAsc(periods)
  var trend = []

  for (var i = 1; i < sorted.length; i++) {
    var cycleLength = period.daysBetween(sorted[i].startDate, sorted[i - 1].startDate)
    // 过滤异常值
    if (cycleLength < 15 || cycleLength > 60) continue

    var pLen = _getPeriodLength(sorted[i - 1], 5)
    trend.push({
      cycle: trend.length + 1,
      length: cycleLength,
      periodLength: pLen,
      startDate: sorted[i - 1].startDate
    })
  }

  // 最多返回最近12个周期
  if (trend.length > 12) {
    trend = trend.slice(trend.length - 12)
    // 重新编号
    for (var j = 0; j < trend.length; j++) {
      trend[j].cycle = j + 1
    }
  }

  return trend
}

/**
 * 异常检测
 * @param {Array} periods
 * @param {Object} settings
 * @returns {Array} [{level: 'warning'|'info', text}, ...]
 */
function detectAnomalies(periods, settings) {
  var alerts = []
  if (!periods || periods.length < 2) return alerts

  var sorted = _sortAsc(periods)
  var cycleLengths = _getCycleLengths(periods)
  var periodLen = (settings && settings.periodLength) || 5

  if (cycleLengths.length === 0) return alerts

  var avgCycle = _mean(cycleLengths)

  // 检测最近一个周期
  var lastCycle = cycleLengths[cycleLengths.length - 1]

  // 周期过长或过短
  if (lastCycle > 38) {
    alerts.push({
      level: 'warning',
      text: '最近一个周期为' + lastCycle + '天，超过38天，周期偏长，建议关注是否有压力过大或内分泌变化'
    })
  } else if (lastCycle < 21) {
    alerts.push({
      level: 'warning',
      text: '最近一个周期为' + lastCycle + '天，短于21天，周期偏短，建议咨询医生排除异常'
    })
  }

  // 经期持续时间异常
  var lastPeriod = sorted[sorted.length - 1]
  var lastPeriodLen = _getPeriodLength(lastPeriod, periodLen)

  if (lastPeriodLen > 8) {
    alerts.push({
      level: 'warning',
      text: '最近一次经期持续' + lastPeriodLen + '天，超过8天，经期偏长，建议就医检查'
    })
  } else if (lastPeriodLen < 2) {
    alerts.push({
      level: 'info',
      text: '最近一次经期仅' + lastPeriodLen + '天，经期偏短，可能与压力、体重变化有关'
    })
  }

  // 周期突然变化（与平均值偏差>5天）
  if (cycleLengths.length >= 3) {
    var deviation = Math.abs(lastCycle - avgCycle)
    if (deviation > 5) {
      alerts.push({
        level: 'warning',
        text: '最近周期(' + lastCycle + '天)与平均周期(' + Math.round(avgCycle) + '天)偏差' + Math.round(deviation) + '天，波动较大，建议持续观察'
      })
    }
  }

  // 连续3个周期持续缩短或延长
  if (cycleLengths.length >= 3) {
    var recent3 = cycleLengths.slice(cycleLengths.length - 3)
    var allShorter = recent3[0] > recent3[1] && recent3[1] > recent3[2]
    var allLonger = recent3[0] < recent3[1] && recent3[1] < recent3[2]

    if (allShorter) {
      alerts.push({
        level: 'info',
        text: '最近3个周期呈持续缩短趋势（' + recent3.join('→') + '天），建议关注身体变化'
      })
    }
    if (allLonger) {
      alerts.push({
        level: 'info',
        text: '最近3个周期呈持续延长趋势（' + recent3.join('→') + '天），可能与生活习惯变化有关'
      })
    }
  }

  return alerts
}

/**
 * 综合分析报告
 * @param {Array} periods - 经期记录
 * @param {Object} settings - 设置
 * @returns {Object} 完整分析报告
 */
function generateReport(periods, settings) {
  var cycleLen = (settings && settings.cycleLength) || 28
  var periodLen = (settings && settings.periodLength) || 5

  // 数据不足时的默认报告
  if (!periods || periods.length < 2) {
    var defaultPhase = 'follicular'
    if (periods && periods.length === 1) {
      var status = period.getCurrentStatus(periods, settings)
      defaultPhase = status.currentPhase || 'follicular'
    }

    return {
      cycleAnalysis: {
        avgCycle: cycleLen,
        avgPeriod: periodLen,
        minCycle: cycleLen,
        maxCycle: cycleLen,
        stdDev: 0,
        regularity: 'regular',
        regularityText: '数据不足，使用默认值',
        totalRecords: periods ? periods.length : 0
      },
      predictions: _buildPredictions(periods, settings, cycleLen, 'low'),
      healthTips: getPhaseAdvice(defaultPhase).slice(0, 5),
      insights: ['记录数据不足，建议持续记录至少2个完整周期以获得准确分析']
    }
  }

  // ===== 周期分析 =====
  var sorted = _sortAsc(periods)
  var cycleLengths = _getCycleLengths(periods)
  var periodLengths = []

  for (var i = 0; i < sorted.length; i++) {
    periodLengths.push(_getPeriodLength(sorted[i], periodLen))
  }

  var avgCycle = cycleLengths.length > 0 ? _mean(cycleLengths) : cycleLen
  var avgPeriodLen = periodLengths.length > 0 ? _mean(periodLengths) : periodLen
  var minCycle = cycleLen
  var maxCycle = cycleLen
  var stdDev = 0

  if (cycleLengths.length > 0) {
    minCycle = cycleLengths[0]
    maxCycle = cycleLengths[0]
    for (var j = 1; j < cycleLengths.length; j++) {
      if (cycleLengths[j] < minCycle) minCycle = cycleLengths[j]
      if (cycleLengths[j] > maxCycle) maxCycle = cycleLengths[j]
    }
    stdDev = _stdDev(cycleLengths)
  }

  // 规律性判断
  var regularity = 'regular'
  var regularityText = '周期规律'
  if (stdDev > 4) {
    regularity = 'irregular'
    regularityText = '周期不规律，波动较大'
  } else if (stdDev > 2) {
    regularity = 'slightly_irregular'
    regularityText = '周期轻微波动'
  }

  // ===== 预测置信度 =====
  var confidence = 'low'
  if (cycleLengths.length >= 6 && regularity === 'regular') {
    confidence = 'high'
  } else if (cycleLengths.length >= 3 && regularity !== 'irregular') {
    confidence = 'medium'
  }

  // ===== 当前阶段 =====
  var currentStatus = period.getCurrentStatus(periods, settings)
  var currentPhase = currentStatus.currentPhase || 'follicular'

  // ===== 数据洞察 =====
  var insights = _generateInsights(cycleLengths, periodLengths, stdDev, regularity, sorted)

  // ===== 异常检测 =====
  var anomalies = detectAnomalies(periods, settings)
  // 将 warning 级别的异常也加入洞察
  for (var k = 0; k < anomalies.length; k++) {
    if (anomalies[k].level === 'warning') {
      insights.push(anomalies[k].text)
    }
  }

  // 洞察去重并限制数量
  var uniqueInsights = []
  var seen = {}
  for (var m = 0; m < insights.length; m++) {
    if (!seen[insights[m]]) {
      seen[insights[m]] = true
      uniqueInsights.push(insights[m])
    }
  }
  insights = uniqueInsights.slice(0, 3)

  return {
    cycleAnalysis: {
      avgCycle: Math.round(avgCycle),
      avgPeriod: Math.round(avgPeriodLen * 10) / 10,
      minCycle: minCycle,
      maxCycle: maxCycle,
      stdDev: Math.round(stdDev * 10) / 10,
      regularity: regularity,
      regularityText: regularityText,
      totalRecords: periods.length
    },
    predictions: _buildPredictions(periods, settings, Math.round(avgCycle), confidence),
    healthTips: getPhaseAdvice(currentPhase).slice(0, 5),
    insights: insights
  }
}

/** 构建预测数据 */
function _buildPredictions(periods, settings, avgCycle, confidence) {
  if (!periods || !periods.length) {
    return {
      nextPeriod: '',
      nextOvulation: '',
      fertileWindow: { start: '', end: '' },
      confidence: 'low'
    }
  }

  var sorted = _sortAsc(periods)
  var latest = sorted[sorted.length - 1]
  var nextPeriodStart = period.addDays(latest.startDate, avgCycle)

  // 如果预测日期已过，往后推一个周期
  var todayStr = period.today()
  while (period.daysBetween(nextPeriodStart, todayStr) < 0) {
    nextPeriodStart = period.addDays(nextPeriodStart, avgCycle)
  }

  var ovulationDay = avgCycle - 14
  var nextOvulation = period.addDays(nextPeriodStart, ovulationDay - avgCycle)
  // 如果排卵日已过，用下一个周期的
  if (period.daysBetween(nextOvulation, todayStr) < 0) {
    nextOvulation = period.addDays(nextPeriodStart, ovulationDay)
  }

  var fertileStart = period.addDays(nextOvulation, -5)
  var fertileEnd = period.addDays(nextOvulation, 1)

  return {
    nextPeriod: nextPeriodStart,
    nextOvulation: nextOvulation,
    fertileWindow: { start: fertileStart, end: fertileEnd },
    confidence: confidence
  }
}

/** 生成数据洞察 */
function _generateInsights(cycleLengths, periodLengths, stdDev, regularity, sorted) {
  var insights = []

  if (cycleLengths.length === 0) return insights

  // 规律性洞察
  if (regularity === 'regular') {
    insights.push('您的周期非常规律，标准差仅' + (Math.round(stdDev * 10) / 10) + '天，身体状态良好')
  } else if (regularity === 'slightly_irregular') {
    insights.push('您的周期存在轻微波动（标准差' + (Math.round(stdDev * 10) / 10) + '天），属于正常范围，无需过度担心')
  } else {
    insights.push('您的周期波动较大（标准差' + (Math.round(stdDev * 10) / 10) + '天），建议保持规律作息并关注身体变化')
  }

  // 趋势洞察（最近3个周期）
  if (cycleLengths.length >= 3) {
    var recent3 = cycleLengths.slice(cycleLengths.length - 3)
    if (recent3[0] > recent3[1] && recent3[1] > recent3[2]) {
      insights.push('最近3个周期有缩短趋势（' + recent3.join('→') + '天），建议关注是否与压力或生活变化有关')
    } else if (recent3[0] < recent3[1] && recent3[1] < recent3[2]) {
      insights.push('最近3个周期有延长趋势（' + recent3.join('→') + '天），建议保持观察')
    }
  }

  // 经期长度洞察
  if (periodLengths.length >= 3) {
    var avgPLen = _mean(periodLengths)
    if (avgPLen <= 3) {
      insights.push('您的平均经期较短（约' + Math.round(avgPLen) + '天），注意观察经量是否正常')
    } else if (avgPLen >= 7) {
      insights.push('您的平均经期较长（约' + Math.round(avgPLen) + '天），如伴有不适建议咨询医生')
    }
  }

  // 数据量洞察
  if (sorted.length >= 6) {
    var firstDate = sorted[0].startDate
    var lastDate = sorted[sorted.length - 1].startDate
    var totalDays = period.daysBetween(lastDate, firstDate)
    var months = Math.round(totalDays / 30)
    if (months > 0) {
      insights.push('已记录' + sorted.length + '次经期，跨度约' + months + '个月，数据越多分析越准确')
    }
  } else if (sorted.length < 4) {
    insights.push('当前记录较少（' + sorted.length + '条），建议持续记录以提升分析准确度')
  }

  return insights
}

// ===== 模块导出 =====

module.exports = {
  generateReport: generateReport,
  getCycleTrend: getCycleTrend,
  getPhaseAdvice: getPhaseAdvice,
  detectAnomalies: detectAnomalies
}
