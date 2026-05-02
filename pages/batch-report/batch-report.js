const app = getApp();

Page({
  data: {
    batch: {},
    currentTab: 'daily',  // 当前Tab：daily、env、weekly
    dailyList: [],
    envList: [],
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

  // 切换Tab
  switchTab: function(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ currentTab: tab });
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
        that.loadDailyData(batchId);
        // 加载环控数据
        that.loadEnvData(batchId);
        // 加载周数据
        that.loadWeekData(batchId);
      }
    });
  },

  // 加载日数据
  loadDailyData: function(batchId) {
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

  // 加载环控数据
  loadEnvData: function(batchId) {
    const that = this;
    const db = wx.cloud.database();
    db.collection('daily_data')
      .where({ batchId: batchId })
      .orderBy('dayAge', 'asc')
      .get({
        success: res => {
          const list = (res.data || []).map(item => {
            // 格式化日期
            let dateStr = '-';
            if (item.createTime) {
              const d = new Date(item.createTime);
              const month = String(d.getMonth() + 1).padStart(2, '0');
              const day = String(d.getDate()).padStart(2, '0');
              dateStr = month + '-' + day;
            }
            return {
              dateStr: dateStr,
              dayAge: item.dayAge,
              // 夜间环控数据
              nightTargetTemp: item.nightTargetTemp,
              nightMinTemp: item.nightMinTemp,
              nightHumidity: item.nightHumidity,
              nightFanCount: item.nightFanCount,
              nightCycleTime: item.nightCycleTime,
              nightOpenTime: item.nightOpenTime,
              nightNegativePressure: item.nightNegativePressure,
              // 白天环控数据
              dayTargetTemp: item.dayTargetTemp,
              dayMaxTemp: item.dayMaxTemp,
              dayHumidity: item.dayHumidity,
              dayFanCount: item.dayFanCount,
              dayCycleTime: item.dayCycleTime,
              dayOpenTime: item.dayOpenTime,
              dayNegativePressure: item.dayNegativePressure
            };
          });
          that.setData({ envList: list });
        }
      });
  },

  // 加载周数据（动态显示有数据的周和出栏数据）
  loadWeekData: function(batchId) {
    const that = this;
    const db = wx.cloud.database();
    db.collection('weekly_data')
      .where({ batchId: batchId })
      .orderBy('exitDayAge', 'asc')
      .get({
        success: res => {
          const list = res.data || [];
          const rows = [];

          list.forEach(d => {
            const isWeekData = d.isWeekData || (d.exitDayAge % 7 === 0);
            const weekNo = d.weekNo || Math.floor(d.exitDayAge / 7);

            rows.push({
              dayAge: d.exitDayAge,
              label: isWeekData ? `第${weekNo}周` : (d.exitDayAge + '天出栏'),
              isExit: !isWeekData,
              avgWeight: d.avgWeight || '',
              weekendStock: d.weekendStock || '',
              survivalRate: d.survivalRate || '',
              cumulativeFCR: d.cumulativeFCR || '',
              cumulativeFeed: d.cumulativeFeed || '',
              cumulativeCost: d.cumulativeFeedCost || d.cumulativeCost || '',
              feedPrice: d.feedPrice || '',
              meatCost: d.meatCost || '',
              feedFactory: d.feedFactory || ''
            });
          });

          that.setData({ weekRows: rows });
        }
      });
  }
});
