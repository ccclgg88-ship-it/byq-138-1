/**
 * symptoms.js - 症状健康档案分析引擎
 * 症状趋势、阶段分布、体温关联、月度小结、健康洞察
 */

var period = require('./period')

var SYMPTOM_META = {
  cramps: { label: '痛经', icon: '🔴', category: 'physical' },
  headache: { label: '头痛', icon: '🤕', category: 'physical' },
  backache: { label: '腰酸', icon: '💆', category: 'physical' },
  breast_tenderness: { label: '乳房胀痛', icon: '💜', category: 'physical' },
  fatigue: { label: '疲劳', icon: '😴', category: 'physical' },
  insomnia: { label: '失眠', icon: '🌙', category: 'lifestyle' },
  diarrhea: { label: '腹泻', icon: '💊', category: 'physical' },
  appetite_change: { label: '食欲变化', icon: '🍽️', category: 'lifestyle' }
}

var MOOD_META = {
  happy: { label: '开心', icon: '😊', score: 5 },
  normal: { label: '一般', icon: '😐', score: 3 },
  sad: { label: '难过', icon: '😢', score: 1 },
  irritated: { label: '烦躁', icon: '😤', score: 2 },
  tired: { label: '疲惫', icon: '😴', score: 2 }
}

var PHASES = ['menstrual', 'follicular', 'ovulation', 'luteal']
var PHASE_LABELS = {
  menstrual: '经期',
  follicular: '卵泡期',
  ovulation: '排卵期',
  luteal: '黄体期'
}

var SYMPTOM_ADVICE = {
  cramps: {
    insight: '痛经是最常见的经期症状，主要与前列腺素分泌过多有关',
    tips: [
      '热敷小腹部，每次20-30分钟，温度40-45°C',
      '适量饮用姜茶或红糖水，有助于温经散寒',
      '做轻柔的瑜伽体式如猫牛式、婴儿式',
      '疼痛严重时可在医生指导下服用布洛芬'
    ]
  },
  headache: {
    insight: '经期头痛与激素水平波动、血清素下降有关',
    tips: [
      '保证充足睡眠，避免熬夜',
      '减少咖啡因摄入，多喝水',
      '尝试放松冥想或深呼吸练习',
      '保持规律作息，避免过度疲劳'
    ]
  },
  backache: {
    insight: '经期腰酸多因盆腔充血和子宫收缩引起',
    tips: [
      '避免长时间站立或久坐，定时活动',
      '用热毛巾或暖宝宝敷腰部',
      '选择软硬适中的床垫，保持正确睡姿',
      '适当做腰部拉伸运动'
    ]
  },
  breast_tenderness: {
    insight: '经前乳房胀痛是孕激素升高导致的正常生理现象',
    tips: [
      '穿着支撑性好的内衣，避免过紧',
      '减少咖啡因和盐分摄入',
      '轻柔按摩乳房，促进血液循环',
      '月经来潮后通常会自然缓解'
    ]
  },
  fatigue: {
    insight: '经期疲劳与铁流失、激素变化、能量消耗增加有关',
    tips: [
      '多吃富含铁质的食物如红枣、菠菜、动物肝脏',
      '保证7-8小时充足睡眠',
      '适度运动比完全静养更能缓解疲劳',
      '补充B族维生素，有助于能量代谢'
    ]
  },
  insomnia: {
    insight: '经前失眠与孕激素下降、体温调节变化、情绪波动有关',
    tips: [
      '睡前1小时放下手机，避免蓝光刺激',
      '保持卧室凉爽，经期体温偏高，稍凉环境易入睡',
      '睡前泡脚15-20分钟，促进血液循环',
      '尝试4-7-8呼吸法帮助入睡'
    ]
  },
  diarrhea: {
    insight: '经期腹泻与前列腺素增加、肠道蠕动加快有关',
    tips: [
      '饮食清淡，避免辛辣、油腻、生冷食物',
      '多喝温水，补充流失的水分',
      '适量食用易消化的食物如粥、面条',
      '症状严重或持续建议就医'
    ]
  },
  appetite_change: {
    insight: '经前食欲增加是血清素下降导致的正常现象',
    tips: [
      '选择低GI食物，增加饱腹感',
      '适量吃些黑巧克力，有助于提升情绪',
      '少食多餐，避免一次吃太多',
      '多吃富含镁的食物如坚果、牛油果'
    ]
  }
}

// ===== 内部辅助函数 =====

function _getPhaseForDate(dateStr, periods, settings) {
  var info = period.getPhaseForDate(dateStr, periods, settings)
  var phase = info.phase
  if (phase === 'predicted_menstrual') return 'menstrual'
  if (phase === 'safe') return 'luteal'
  if (phase === 'unknown') return 'follicular'
  return phase
}

function _getDateRange(days) {
  var today = period.today()
  var result = []
  for (var i = days - 1; i >= 0; i--) {
    result.push(period.addDays(today, -i))
  }
  return result
}

function _getMonthRange(year, month) {
  var daysInMonth = period.getDaysInMonth(year, month)
  var result = []
  for (var d = 1; d <= daysInMonth; d++) {
    var dateStr = year + '-' + (month < 10 ? '0' + month : month) + '-' + (d < 10 ? '0' + d : d)
    result.push(dateStr)
  }
  return result
}

// ===== 核心分析函数 =====

/**
 * 获取本周症状速览
 */
function getWeeklyOverview(dailyRecords, periods, settings) {
  var dates = _getDateRange(7)
  var symptomCounts = {}
  var moodCounts = {}
  var recordCount = 0
  var hasTempCount = 0
  var tempSum = 0

  Object.keys(SYMPTOM_META).forEach(function (key) {
    symptomCounts[key] = 0
  })
  Object.keys(MOOD_META).forEach(function (key) {
    moodCounts[key] = 0
  })

  for (var i = 0; i < dates.length; i++) {
    var rec = dailyRecords[dates[i]]
    if (!rec) continue
    recordCount++

    if (rec.symptoms && rec.symptoms.length) {
      for (var j = 0; j < rec.symptoms.length; j++) {
        if (symptomCounts[rec.symptoms[j]] !== undefined) {
          symptomCounts[rec.symptoms[j]]++
        }
      }
    }

    if (rec.mood && moodCounts[rec.mood] !== undefined) {
      moodCounts[rec.mood]++
    }

    if (rec.temperature) {
      hasTempCount++
      tempSum += rec.temperature
    }
  }

  var topSymptoms = Object.keys(symptomCounts)
    .filter(function (k) { return symptomCounts[k] > 0 })
    .map(function (k) {
      return {
        key: k,
        label: SYMPTOM_META[k].label,
        icon: SYMPTOM_META[k].icon,
        count: symptomCounts[k]
      }
    })
    .sort(function (a, b) { return b.count - a.count })
    .slice(0, 3)

  var dominantMood = null
  var maxMood = 0
  Object.keys(moodCounts).forEach(function (k) {
    if (moodCounts[k] > maxMood) {
      maxMood = moodCounts[k]
      dominantMood = k
    }
  })

  var avgTemp = hasTempCount > 0 ? Math.round((tempSum / hasTempCount) * 10) / 10 : null

  return {
    recordCount: recordCount,
    topSymptoms: topSymptoms,
    dominantMood: dominantMood,
    dominantMoodLabel: dominantMood ? MOOD_META[dominantMood].label : '',
    dominantMoodIcon: dominantMood ? MOOD_META[dominantMood].icon : '',
    avgTemperature: avgTemp,
    totalDays: 7
  }
}

/**
 * 获取症状趋势数据（最近N天）
 */
function getSymptomTrend(dailyRecords, periods, settings, days) {
  var numDays = days || 28
  var dates = _getDateRange(numDays)
  var result = []

  for (var i = 0; i < dates.length; i++) {
    var dateStr = dates[i]
    var rec = dailyRecords[dateStr]
    var phase = _getPhaseForDate(dateStr, periods, settings)

    var symptomCount = 0
    var moodScore = null
    var temperature = null
    var flow = null

    if (rec) {
      symptomCount = (rec.symptoms && rec.symptoms.length) || 0
      if (rec.mood && MOOD_META[rec.mood]) {
        moodScore = MOOD_META[rec.mood].score
      }
      temperature = rec.temperature || null
      flow = rec.flow || null
    }

    result.push({
      dateStr: dateStr,
      date: dateStr.slice(5),
      phase: phase,
      phaseLabel: PHASE_LABELS[phase] || '',
      symptomCount: symptomCount,
      moodScore: moodScore,
      temperature: temperature,
      flow: flow
    })
  }

  return result
}

/**
 * 各周期阶段的症状分布统计
 */
function getPhaseSymptomDistribution(dailyRecords, periods, settings) {
  var dist = {}
  var phaseCounts = {}

  PHASES.forEach(function (phase) {
    dist[phase] = {}
    phaseCounts[phase] = 0
    Object.keys(SYMPTOM_META).forEach(function (key) {
      dist[phase][key] = 0
    })
  })

  var allDates = Object.keys(dailyRecords)
  for (var i = 0; i < allDates.length; i++) {
    var dateStr = allDates[i]
    var rec = dailyRecords[dateStr]
    if (!rec || !rec.symptoms || !rec.symptoms.length) continue

    var phase = _getPhaseForDate(dateStr, periods, settings)
    if (!dist[phase]) continue

    phaseCounts[phase]++
    for (var j = 0; j < rec.symptoms.length; j++) {
      var s = rec.symptoms[j]
      if (dist[phase][s] !== undefined) {
        dist[phase][s]++
      }
    }
  }

  var result = {}
  PHASES.forEach(function (phase) {
    var symptomList = Object.keys(dist[phase])
      .filter(function (k) { return dist[phase][k] > 0 })
      .map(function (k) {
        var meta = SYMPTOM_META[k]
        var rate = phaseCounts[phase] > 0
          ? Math.round((dist[phase][k] / phaseCounts[phase]) * 100)
          : 0
        return {
          key: k,
          label: meta.label,
          icon: meta.icon,
          count: dist[phase][k],
          rate: rate
        }
      })
      .sort(function (a, b) { return b.count - a.count })

    result[phase] = {
      label: PHASE_LABELS[phase] || phase,
      recordCount: phaseCounts[phase],
      symptoms: symptomList,
      topSymptom: symptomList[0] || null
    }
  })

  return result
}

/**
 * 体温曲线与经期关联分析
 */
function getTemperatureAnalysis(dailyRecords, periods, settings) {
  var dates = _getDateRange(60)
  var tempData = []
  var tempSum = 0
  var tempCount = 0

  for (var i = 0; i < dates.length; i++) {
    var dateStr = dates[i]
    var rec = dailyRecords[dateStr]
    if (!rec || !rec.temperature) continue

    var phase = _getPhaseForDate(dateStr, periods, settings)
    tempData.push({
      dateStr: dateStr,
      date: dateStr.slice(5),
      temperature: rec.temperature,
      phase: phase,
      phaseLabel: PHASE_LABELS[phase] || ''
    })
    tempSum += rec.temperature
    tempCount++
  }

  var phaseTemps = {}
  PHASES.forEach(function (p) { phaseTemps[p] = { sum: 0, count: 0 } })
  for (var j = 0; j < tempData.length; j++) {
    var p = tempData[j].phase
    if (phaseTemps[p]) {
      phaseTemps[p].sum += tempData[j].temperature
      phaseTemps[p].count++
    }
  }

  var phaseAvgTemps = {}
  PHASES.forEach(function (p) {
    if (phaseTemps[p].count > 0) {
      phaseAvgTemps[p] = {
        label: PHASE_LABELS[p] || p,
        avgTemp: Math.round((phaseTemps[p].sum / phaseTemps[p].count) * 10) / 10,
        count: phaseTemps[p].count
      }
    }
  })

  var avgTemp = tempCount > 0 ? Math.round((tempSum / tempCount) * 10) / 10 : null
  var minTemp = null
  var maxTemp = null
  if (tempData.length) {
    minTemp = maxTemp = tempData[0].temperature
    for (var k = 1; k < tempData.length; k++) {
      if (tempData[k].temperature < minTemp) minTemp = tempData[k].temperature
      if (tempData[k].temperature > maxTemp) maxTemp = tempData[k].temperature
    }
  }

  return {
    hasData: tempCount > 0,
    recordCount: tempCount,
    avgTemperature: avgTemp,
    minTemperature: minTemp,
    maxTemperature: maxTemp,
    dataPoints: tempData.slice(-30),
    phaseAverages: phaseAvgTemps,
    insights: _generateTempInsights(phaseAvgTemps)
  }
}

function _generateTempInsights(phaseAvgTemps) {
  var insights = []
  var follicular = phaseAvgTemps.follicular
  var luteal = phaseAvgTemps.luteal

  if (follicular && luteal && luteal.avgTemp > follicular.avgTemp) {
    var diff = Math.round((luteal.avgTemp - follicular.avgTemp) * 10) / 10
    if (diff >= 0.3) {
      insights.push('黄体期平均体温比卵泡期高' + diff + '°C，符合正常的双相体温变化，说明排卵正常')
    } else {
      insights.push('黄体期与卵泡期体温差为' + diff + '°C，略小于典型值0.3-0.5°C，建议继续观察')
    }
  }

  if (Object.keys(phaseAvgTemps).length === 0) {
    insights.push('体温数据不足，建议每天早晨测量基础体温并记录')
  }

  return insights
}

/**
 * 情绪分析
 */
function getMoodAnalysis(dailyRecords, periods, settings) {
  var dates = _getDateRange(30)
  var moodCounts = {}
  var phaseMoods = {}
  var totalMoodRecords = 0

  Object.keys(MOOD_META).forEach(function (k) { moodCounts[k] = 0 })
  PHASES.forEach(function (p) { phaseMoods[p] = { sum: 0, count: 0 } })

  for (var i = 0; i < dates.length; i++) {
    var rec = dailyRecords[dates[i]]
    if (!rec || !rec.mood) continue
    if (moodCounts[rec.mood] === undefined) continue

    moodCounts[rec.mood]++
    totalMoodRecords++

    var phase = _getPhaseForDate(dates[i], periods, settings)
    if (phaseMoods[phase] && MOOD_META[rec.mood]) {
      phaseMoods[phase].sum += MOOD_META[rec.mood].score
      phaseMoods[phase].count++
    }
  }

  var moodDistribution = Object.keys(moodCounts)
    .map(function (k) {
      return {
        key: k,
        label: MOOD_META[k].label,
        icon: MOOD_META[k].icon,
        count: moodCounts[k],
        score: MOOD_META[k].score,
        rate: totalMoodRecords > 0
          ? Math.round((moodCounts[k] / totalMoodRecords) * 100)
          : 0
      }
    })
    .sort(function (a, b) { return b.count - a.count })

  var phaseMoodScores = {}
  PHASES.forEach(function (p) {
    if (phaseMoods[p].count > 0) {
      phaseMoodScores[p] = {
        label: PHASE_LABELS[p] || p,
        avgScore: Math.round((phaseMoods[p].sum / phaseMoods[p].count) * 10) / 10,
        count: phaseMoods[p].count
      }
    }
  })

  var avgScore = totalMoodRecords > 0
    ? Math.round(
        (moodDistribution.reduce(function (sum, m) {
          return sum + m.score * m.count
        }, 0) / totalMoodRecords) * 10
      ) / 10
    : null

  return {
    totalRecords: totalMoodRecords,
    avgMoodScore: avgScore,
    distribution: moodDistribution,
    phaseScores: phaseMoodScores,
    insights: _generateMoodInsights(phaseMoodScores, moodDistribution)
  }
}

function _generateMoodInsights(phaseMoodScores, moodDistribution) {
  var insights = []

  var menstrual = phaseMoodScores.menstrual
  var follicular = phaseMoodScores.follicular
  var luteal = phaseMoodScores.luteal

  if (luteal && follicular && luteal.avgScore < follicular.avgScore) {
    insights.push('黄体期情绪评分低于卵泡期，这是激素变化的正常反应，建议多做放松活动')
  }

  if (menstrual && menstrual.avgScore < 2.5) {
    insights.push('经期情绪普遍偏低，建议多休息、听音乐，给自己更多关爱')
  }

  var negativeCount = moodDistribution.filter(function (m) {
    return m.score <= 2
  }).reduce(function (sum, m) { return sum + m.count }, 0)
  var total = moodDistribution.reduce(function (sum, m) { return sum + m.count }, 0)

  if (total > 10 && negativeCount / total > 0.4) {
    insights.push('近期负面情绪出现频率较高，建议关注心理健康，必要时寻求专业帮助')
  }

  if (total === 0) {
    insights.push('暂无心情记录，记录心情能帮助你了解情绪与周期的关系')
  }

  return insights
}

/**
 * 月度健康小结
 */
function getMonthlySummary(dailyRecords, periods, settings, year, month) {
  var dates = month ? _getMonthRange(year, month) : _getDateRange(30)
  var symptomTotalCounts = {}
  var moodTotalCounts = {}
  var recordCount = 0
  var tempRecords = []
  var periodCount = 0

  Object.keys(SYMPTOM_META).forEach(function (k) { symptomTotalCounts[k] = 0 })
  Object.keys(MOOD_META).forEach(function (k) { moodTotalCounts[k] = 0 })

  for (var i = 0; i < dates.length; i++) {
    var rec = dailyRecords[dates[i]]
    if (!rec) continue
    recordCount++

    if (rec.symptoms) {
      for (var j = 0; j < rec.symptoms.length; j++) {
        var s = rec.symptoms[j]
        if (symptomTotalCounts[s] !== undefined) {
          symptomTotalCounts[s]++
        }
      }
    }

    if (rec.mood && moodTotalCounts[rec.mood] !== undefined) {
      moodTotalCounts[rec.mood]++
    }

    if (rec.temperature) {
      tempRecords.push({ date: dates[i], temp: rec.temperature })
    }
  }

  // 统计本月经期数量
  for (var p = 0; p < periods.length; p++) {
    var start = periods[p].startDate
    if (start && start.slice(0, 7) === (year + '-' + (month < 10 ? '0' + month : month))) {
      periodCount++
    }
  }

  var topSymptoms = Object.keys(symptomTotalCounts)
    .filter(function (k) { return symptomTotalCounts[k] > 0 })
    .map(function (k) {
      return {
        key: k,
        label: SYMPTOM_META[k].label,
        icon: SYMPTOM_META[k].icon,
        count: symptomTotalCounts[k]
      }
    })
    .sort(function (a, b) { return b.count - a.count })

  var mostCommonMood = null
  var maxMoodCount = 0
  Object.keys(moodTotalCounts).forEach(function (k) {
    if (moodTotalCounts[k] > maxMoodCount) {
      maxMoodCount = moodTotalCounts[k]
      mostCommonMood = k
    }
  })

  var avgTemp = null
  if (tempRecords.length > 0) {
    var sum = tempRecords.reduce(function (s, t) { return s + t.temp }, 0)
    avgTemp = Math.round((sum / tempRecords.length) * 10) / 10
  }

  return {
    year: year,
    month: month,
    recordCount: recordCount,
    periodCount: periodCount,
    topSymptoms: topSymptoms,
    mostCommonMood: mostCommonMood,
    mostCommonMoodLabel: mostCommonMood ? MOOD_META[mostCommonMood].label : '',
    mostCommonMoodIcon: mostCommonMood ? MOOD_META[mostCommonMood].icon : '',
    moodCount: maxMoodCount,
    avgTemperature: avgTemp,
    tempRecordCount: tempRecords.length,
    summaryText: _generateMonthlySummary(topSymptoms, mostCommonMood, recordCount, periodCount)
  }
}

function _generateMonthlySummary(topSymptoms, mostCommonMood, recordCount, periodCount) {
  if (recordCount < 5) {
    return '本月记录较少，建议坚持每日记录，积累更多数据后可以获得更准确的健康洞察'
  }

  var parts = []

  if (periodCount > 0) {
    parts.push('本月经历了' + periodCount + '次经期')
  }

  if (topSymptoms.length > 0) {
    var top3 = topSymptoms.slice(0, 3).map(function (s) { return s.label }).join('、')
    parts.push('最常见的症状是' + top3)
  }

  if (mostCommonMood) {
    parts.push('整体心情偏' + MOOD_META[mostCommonMood].label)
  }

  if (parts.length === 0) {
    return '本月记录数据充足，继续保持！'
  }

  return parts.join('；') + '。'
}

/**
 * 基于本次记录的健康洞察（保存记录后给出）
 */
function getRecordInsights(record, phase, dateStr) {
  if (!record) return null

  var insights = []
  var tips = []

  // 症状相关洞察
  if (record.symptoms && record.symptoms.length > 0) {
    var s = record.symptoms[0]
    if (SYMPTOM_ADVICE[s]) {
      insights.push(SYMPTOM_ADVICE[s].insight)
      tips = SYMPTOM_ADVICE[s].tips.slice(0, 3)
    }

    if (record.symptoms.length >= 3) {
      insights.push('今天有' + record.symptoms.length + '种症状，建议多休息，注意观察身体变化')
    }
  }

  // 心情相关洞察
  if (record.mood && MOOD_META[record.mood]) {
    var score = MOOD_META[record.mood].score
    if (score <= 2) {
      insights.push('心情不太好的时候，记得这可能是激素在起作用，给自己一点耐心和温柔')
    } else if (score >= 4) {
      insights.push('今天心情不错！可以利用这个好状态做些重要的事情')
    }
  }

  // 体温相关
  if (record.temperature) {
    if (record.temperature < 36.0) {
      insights.push('体温偏低，注意保暖，可能处于体温较低的阶段')
    } else if (record.temperature > 37.0) {
      insights.push('体温偏高，如果处于黄体期是正常现象，否则注意观察是否有不适')
    }
  }

  // 经血量
  if (record.flow === 'heavy') {
    insights.push('经量偏多，注意补充铁质和蛋白质，避免剧烈运动')
  }

  return {
    insights: insights.slice(0, 2),
    tips: tips,
    phase: phase,
    phaseLabel: PHASE_LABELS[phase] || ''
  }
}

/**
 * 获取所有症状元数据
 */
function getSymptomMeta() {
  return SYMPTOM_META
}

function getMoodMeta() {
  return MOOD_META
}

function getPhaseLabels() {
  return PHASE_LABELS
}

module.exports = {
  SYMPTOM_META: SYMPTOM_META,
  MOOD_META: MOOD_META,
  PHASE_LABELS: PHASE_LABELS,
  SYMPTOM_ADVICE: SYMPTOM_ADVICE,
  getWeeklyOverview: getWeeklyOverview,
  getSymptomTrend: getSymptomTrend,
  getPhaseSymptomDistribution: getPhaseSymptomDistribution,
  getTemperatureAnalysis: getTemperatureAnalysis,
  getMoodAnalysis: getMoodAnalysis,
  getMonthlySummary: getMonthlySummary,
  getRecordInsights: getRecordInsights,
  getSymptomMeta: getSymptomMeta,
  getMoodMeta: getMoodMeta,
  getPhaseLabels: getPhaseLabels
}
