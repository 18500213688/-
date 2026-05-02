const app = getApp();

Page({
  data: {
    batch: {},
    dailyList: [],
    weekRows: []
  },

  onLoad: function(options) {
    if (options.id) {
      this.loadBatchData(options.id);
    }
  },

  goBack: function() {
    wx.navigateBack();
  },

  loadBatchData: function(batchId) {
    const that = this;
    const db = wx.cloud.database();

    // 加载批次信息
    db.collection('batch').doc(batchId).get({
      success: res => {
        const batch = res.data || {};
        // 格式化日期
        if (batch.entryDate) {
          const d = new Date(batch.entryDate);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          batch.entryDateStr = year + '-' + month + '-' + day;
        }
        that.setData({ batch: batch });

        // 加载日数据
        that.loadDailyData(batchId, batch);
        // 加载周数据
        that.loadWeekData(batchId, batch);
      }
    });
  },

  loadDailyData: function(batchId, batch) {
    const that = this;
    const db = wx.cloud.database();
    db.collection('daily_data')
      .where({ batchId: batchId })
      .orderBy('dayAge', 'asc')
      .get({
        success: res => {
          that.setData({ dailyList: res.data || [] });
        }
      });
  },

  loadWeekData: function(batchId, batch) {
    const that = this;
    const db = wx.cloud.database();
    db.collection('weekly_data')
      .where({ batchId: batchId })
      .orderBy('weekendDayAge', 'asc')
      .get({
        success: res => {
          const saved = {};
          (res.data || []).forEach(d => {
            saved[d.weekendDayAge] = d;
          });

          // 7周 + 出栏
          const rows = [
            { dayAge: 7,  label: '第1周', isExit: false },
            { dayAge: 14, label: '第2周', isExit: false },
            { dayAge: 21, label: '第3周', isExit: false },
            { dayAge: 28, label: '第4周', isExit: false },
            { dayAge: 35, label: '第5周', isExit: false },
            { dayAge: 42, label: '第6周', isExit: false },
            { dayAge: 49, label: '第7周', isExit: false }
          ].map(item => {
            const d = saved[item.dayAge];
            if (d) {
              return {
                ...item,
                avgWeight: d.avgWeight || '',
                weekendStock: d.weekendStock || '',
                survivalRate: d.survivalRate || '',
                cumulativeFCR: d.cumulativeFCR || '',
                cumulativeFeed: d.cumulativeFeed || '',
                cumulativeCost: d.cumulativeCost || '',
                feedPrice: d.feedPrice || '',
                meatCost: d.meatCost || '',
                feedFactory: d.feedFactory || ''
              };
            }
            return { ...item, avgWeight: '', weekendStock: '', survivalRate: '', cumulativeFCR: '', cumulativeFeed: '', cumulativeCost: '', feedPrice: '', meatCost: '', feedFactory: '' };
          });

          // 出栏行
          const exitAge = batch.exitAge || '';
          const exitData = saved[exitAge] || {};
          rows.push({
            dayAge: exitAge,
            label: '出栏',
            isExit: true,
            avgWeight: exitData.avgWeight || '',
            weekendStock: exitData.weekendStock || '',
            survivalRate: exitData.survivalRate || '',
            cumulativeFCR: exitData.cumulativeFCR || '',
            cumulativeFeed: exitData.cumulativeFeed || '',
            cumulativeCost: exitData.cumulativeCost || '',
            feedPrice: exitData.feedPrice || '',
            meatCost: exitData.meatCost || '',
            feedFactory: exitData.feedFactory || ''
          });

          that.setData({ weekRows: rows });
        }
      });
  }
});
