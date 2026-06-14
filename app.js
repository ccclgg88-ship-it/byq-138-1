const store = require('./utils/store')

App({
  onLaunch() {
    // 初始化时确保 store 已加载
    store.get('settings')
  },

  store: store
})
