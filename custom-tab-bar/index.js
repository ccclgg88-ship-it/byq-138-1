/**
 * 自定义 TabBar 组件
 */
Component({
  data: {
    selected: 0,
    list: [
      { pagePath: '/pages/index/index', text: '首页', icon: 'home' },
      { pagePath: '/pages/statistics/statistics', text: '分析', icon: 'chart' },
      { pagePath: '/pages/mine/mine', text: '我的', icon: 'mine' }
    ]
  },

  methods: {
    switchTab(e) {
      const idx = e.currentTarget.dataset.index
      const item = this.data.list[idx]
      wx.switchTab({ url: item.pagePath })
    }
  }
})
