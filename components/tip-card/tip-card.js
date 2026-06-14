Component({
  properties: {
    tip: {
      type: Object,
      value: { id: 0, text: '', icon: '💡' }
    }
  },

  methods: {
    onRefresh: function () {
      this.triggerEvent('refresh')
    }
  }
})
