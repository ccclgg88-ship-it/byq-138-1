const store = require('../../utils/store.js')
const articlesData = require('../../data/articles.js')
const period = require('../../utils/period.js')

const PHASE_TAG_MAP = {
  menstrual: ['经期', '痛经', '月经量'],
  follicular: ['卵泡期', '运动', '饮食'],
  ovulation: ['排卵期', '排卵', '受孕'],
  luteal: ['黄体期', 'PMS', '情绪', '经前']
}

const PHASE_RECOMMEND_CATEGORY = {
  menstrual: 'health',
  follicular: 'exercise',
  ovulation: 'knowledge',
  luteal: 'emotion'
}

Page({
  data: {
    categories: [],
    activeTab: 'recommend',
    activeCategoryId: '',
    keyword: '',
    showSearch: false,
    dailyArticles: [],
    phaseArticles: [],
    phaseText: '',
    currentPhase: '',
    categoryArticles: [],
    searchResults: [],
    favoriteList: [],
    historyList: [],
    favoriteIds: [],
    historyIds: []
  },

  onLoad() {
    this.setData({
      categories: articlesData.categories
    })
    this._loadRecommend()
  },

  onShow() {
    this._loadFavoritesAndHistory()
    if (this.data.activeTab === 'favorite') {
      this._refreshFavoriteList()
    } else if (this.data.activeTab === 'history') {
      this._refreshHistoryList()
    }
  },

  _loadRecommend() {
    const periods = store.get('periods') || []
    const settings = store.get('settings') || { cycleLength: 28, periodLength: 5 }
    const status = period.getCurrentStatus(periods, settings)
    const currentPhase = status.currentPhase || 'follicular'
    let phaseText = '一般建议'
    if (currentPhase === 'menstrual') phaseText = '经期'
    else if (currentPhase === 'follicular') phaseText = '卵泡期'
    else if (currentPhase === 'ovulation') phaseText = '排卵期'
    else if (currentPhase === 'luteal') phaseText = '黄体期'

    const dailyArticles = articlesData.getDailyArticles()
    const phaseArticles = this._getPhaseArticles(currentPhase)

    this.setData({
      dailyArticles: dailyArticles,
      phaseArticles: phaseArticles,
      phaseText: phaseText,
      currentPhase: currentPhase
    })
  },

  _getPhaseArticles(phase) {
    const tags = PHASE_TAG_MAP[phase] || []
    const preferredCat = PHASE_RECOMMEND_CATEGORY[phase] || 'health'
    let results = []

    if (tags.length) {
      for (let i = 0; i < tags.length; i++) {
        const matched = articlesData.searchArticles(tags[i])
        matched.forEach(a => {
          if (!results.find(r => r.id === a.id)) {
            results.push(a)
          }
        })
      }
    }

    if (results.length < 3) {
      const catArticles = articlesData.getArticlesByCategory(preferredCat)
      catArticles.forEach(a => {
        if (!results.find(r => r.id === a.id)) {
          results.push(a)
        }
      })
    }

    return results.slice(0, 4)
  },

  _loadFavoritesAndHistory() {
    const favoriteIds = store.get('favoriteArticles') || []
    const historyIds = store.get('readingHistory') || []
    this.setData({
      favoriteIds: favoriteIds,
      historyIds: historyIds
    })
  },

  _refreshFavoriteList() {
    const ids = store.get('favoriteArticles') || []
    const list = ids.map(id => articlesData.getArticleById(id)).filter(Boolean)
    this.setData({ favoriteList: list })
  },

  _refreshHistoryList() {
    const ids = store.get('readingHistory') || []
    const list = ids.map(id => articlesData.getArticleById(id)).filter(Boolean)
    this.setData({ historyList: list })
  },

  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab, showSearch: false })
    if (tab === 'favorite') {
      this._refreshFavoriteList()
    } else if (tab === 'history') {
      this._refreshHistoryList()
    } else if (tab === 'recommend') {
      this._loadRecommend()
    }
  },

  onCategoryClick(e) {
    const categoryId = e.currentTarget.dataset.id
    const articles = articlesData.getArticlesByCategory(categoryId)
    this.setData({
      activeCategoryId: categoryId,
      activeTab: 'category',
      categoryArticles: articles
    })
  },

  onToggleSearch() {
    this.setData({
      showSearch: !this.data.showSearch,
      keyword: '',
      searchResults: []
    })
  },

  onSearchInput(e) {
    const keyword = e.detail.value
    this.setData({ keyword: keyword })
    if (keyword.trim()) {
      const results = articlesData.searchArticles(keyword)
      this.setData({ searchResults: results })
    } else {
      this.setData({ searchResults: [] })
    }
  },

  onClearHistory() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有阅读历史吗？',
      confirmColor: '#FF6B8A',
      success: (res) => {
        if (res.confirm) {
          store.clearReadingHistory()
          this._loadFavoritesAndHistory()
          this._refreshHistoryList()
          wx.showToast({ title: '已清空', icon: 'success' })
        }
      }
    })
  },

  onArticleTap(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: '/pages/article/article?id=' + id
    })
  },

  onBack() {
    wx.navigateBack()
  }
})
