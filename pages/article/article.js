const store = require('../../utils/store.js')
const articlesData = require('../../data/articles.js')

Page({
  data: {
    article: null,
    isFavorite: false,
    categoryName: '',
    relatedArticles: [],
    paragraphs: []
  },

  _unsubFavorites: null,

  onLoad(options) {
    const id = parseInt(options.id, 10)
    this._loadArticle(id)
    this._subscribe()
  },

  onUnload() {
    if (this._unsubFavorites) {
      this._unsubFavorites()
      this._unsubFavorites = null
    }
  },

  _loadArticle(id) {
    const article = articlesData.getArticleById(id)
    if (!article) {
      wx.showToast({ title: '文章不存在', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1000)
      return
    }

    store.addReadingHistory(id)

    const category = articlesData.categories.find(c => c.id === article.categoryId)
    const categoryName = category ? category.name : ''

    const paragraphs = this._formatContent(article.content)
    const relatedArticles = this._getRelatedArticles(article)
    const isFavorite = store.isFavorite(id)

    this.setData({
      article: article,
      categoryName: categoryName,
      paragraphs: paragraphs,
      relatedArticles: relatedArticles,
      isFavorite: isFavorite
    })
  },

  _formatContent(content) {
    if (!content) return []
    return content.split('\n').filter(p => p && p.trim()).map(p => p.trim())
  },

  _getRelatedArticles(currentArticle) {
    const allArticles = articlesData.articles || []
    const tags = currentArticle.tags || []
    let scored = []

    allArticles.forEach(a => {
      if (a.id === currentArticle.id) return
      let score = 0
      if (a.categoryId === currentArticle.categoryId) score += 2
      const aTags = a.tags || []
      tags.forEach(t => {
        if (aTags.includes(t)) score += 1
      })
      if (score > 0) {
        scored.push({ article: a, score: score })
      }
    })

    scored.sort((a, b) => b.score - a.score)
    return scored.slice(0, 3).map(s => s.article)
  },

  _subscribe() {
    if (this._unsubFavorites) this._unsubFavorites()
    const self = this
    this._unsubFavorites = store.subscribe('favoriteArticles', function() {
      if (self.data.article) {
        self.setData({ isFavorite: store.isFavorite(self.data.article.id) })
      }
    })
  },

  onToggleFavorite() {
    if (!this.data.article) return
    const added = store.toggleFavorite(this.data.article.id)
    this.setData({ isFavorite: added })
    wx.showToast({
      title: added ? '已收藏' : '已取消收藏',
      icon: 'none',
      duration: 1500
    })
  },

  onRelatedTap(e) {
    const id = e.currentTarget.dataset.id
    this._loadArticle(id)
    wx.pageScrollTo({ scrollTop: 0, duration: 300 })
  },

  onShareAppMessage() {
    const a = this.data.article
    return {
      title: a ? a.title : '健康知识',
      path: '/pages/article/article?id=' + (a ? a.id : 1)
    }
  }
})
