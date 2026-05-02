const app = getApp();

Page({
  data: {
    weekNo: '',
    weekStart: '',
    weekDead: '',
    weekFeed: '',
    weekWeight: '',
    weekStock: '',
    weekFCR: '',
    remark: '',
    saving: false
  },

  onLoad: function() {
    this.initWeekInfo();
  },

  // 初始化周信息
  initWeekInfo: function() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    
    // 计算当前是第几周（简单估算）
    const weekNo = Math.ceil(day / 7);
    const weekStart = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    this.setData({
      weekNo: String(weekNo),
      weekStart: weekStart
    });

    // 加载已有周数据
    this.loadWeekData();
  },

  // 加载本周数据
  loadWeekData: function() {
    const batch = app.globalData.currentBatch;
    if (!batch) return;

    const db = wx.cloud.database();
    db.collection('week_data')
      .where({
        batchId: batch._id,
        weekNo: parseInt(this.data.weekNo) || 1
      })
      .get({
        success: res => {
          if (res.data.length > 0) {
            const data = res.data[0];
            this.setData({
              weekDead: data.weekDead || '',
              weekFeed: data.weekFeed || '',
              weekWeight: data.weekWeight || '',
              weekStock: data.weekStock || '',
              weekFCR: data.weekFCR || '',
              remark: data.remark || ''
            });
          }
        }
      });
  },

  // 输入绑定
  onWeekNoInput: function(e) { this.setData({ weekNo: e.detail.value }); },
  onWeekStartInput: function(e) { this.setData({ weekStart: e.detail.value }); },
  onDeadInput: function(e) { this.setData({ weekDead: e.detail.value }); },
  onFeedInput: function(e) { this.setData({ weekFeed: e.detail.value }); },
  onWeightInput: function(e) { this.setData({ weekWeight: e.detail.value }); },
  onStockInput: function(e) { this.setData({ weekStock: e.detail.value }); },
  onFCRInput: function(e) { this.setData({ weekFCR: e.detail.value }); },
  onRemarkInput: function(e) { this.setData({ remark: e.detail.value }); },

  onWeekStartChange: function(e) {
    this.setData({ weekStart: e.detail.value });
  },

  // 自动计算料比
  calcFCR: function() {
    const feed = parseFloat(this.data.weekFeed) || 0;
    const stock = parseInt(this.data.weekStock) || 0;
    const weight = parseFloat(this.data.weekWeight) || 0;

    if (feed > 0 && stock > 0 && weight > 0) {
      const totalWeight = stock * weight / 1000; // kg
      const fcr = (feed / totalWeight).toFixed(2);
      this.setData({ weekFCR: fcr });
    }
  },

  // 保存周数据
  saveWeekData: function() {
    const batch = app.globalData.currentBatch;
    if (!batch) {
      wx.showToast({ title: '请先在设置页新建批次', icon: 'none' });
      return;
    }

    const weekNo = parseInt(this.data.weekNo) || 1;
    const weekStart = this.data.weekStart;

    if (!weekStart) {
      wx.showToast({ title: '请选择周起始日期', icon: 'none' });
      return;
    }

    this.setData({ saving: true });

    const db = wx.cloud.database();
    const weekData = {
      batchId: batch._id,
      weekNo: weekNo,
      weekStart: weekStart,
      weekDead: parseInt(this.data.weekDead) || 0,
      weekFeed: parseFloat(this.data.weekFeed) || 0,
      weekWeight: parseFloat(this.data.weekWeight) || 0,
      weekStock: parseInt(this.data.weekStock) || 0,
      weekFCR: parseFloat(this.data.weekFCR) || 0,
      remark: this.data.remark || '',
      updateTime: Date.now()
    };

    // 查询本周是否已有数据
    db.collection('week_data')
      .where({
        batchId: batch._id,
        weekNo: weekNo
      })
      .get({
        success: res => {
          if (res.data.length > 0) {
            // 更新
            db.collection('week_data').doc(res.data[0]._id).update({
              data: weekData,
              success: () => {
                this.setData({ saving: false });
                wx.showToast({ title: '保存成功', icon: 'success' });
              },
              fail: () => {
                this.setData({ saving: false });
                wx.showToast({ title: '保存失败', icon: 'none' });
              }
            });
          } else {
            // 新增
            weekData.createTime = Date.now();
            db.collection('week_data').add({
              data: weekData,
              success: () => {
                this.setData({ saving: false });
                wx.showToast({ title: '保存成功', icon: 'success' });
              },
              fail: () => {
                this.setData({ saving: false });
                wx.showToast({ title: '保存失败', icon: 'none' });
              }
            });
          }
        },
        fail: () => {
          this.setData({ saving: false });
          wx.showToast({ title: '查询失败', icon: 'none' });
        }
      });
  }
});
