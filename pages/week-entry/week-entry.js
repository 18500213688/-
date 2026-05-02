const app = getApp();

Page({
  data: {
    exitDayAge: '',       // 出栏日龄（天）- 可以是7、14、21...（周数据）或38、42等（出栏数据）
    isWeekData: false,    // 是否为周数据（7的倍数）
    weekNo: '',           // 周数（仅用于显示，7的倍数时自动计算）
    weekStock: '',        // 存栏（只）
    avgWeight: '',        // 平均体重（g）- 必填
    cumulativeFeed: '',   // 累计上料量（kg）
    stockFeed: '',        // 库存料量（kg）- 必填
    actualFeed: '',       // 累计采食量（kg）
    cumulativeFeedCost: '', // 累计上料金额（元）
    feedPrice: '',        // 饲料单价（元/吨）
    cumulativeFCR: '',    // 累计料比
    meatCost: '',         // 饲料造肉成本（元/斤）
    feedFactory: '',      // 饲料厂家
    saving: false
  },

  onLoad: function () {
    this.setData({ exitDayAge: '7', isWeekData: true, weekNo: '1' });
  },

  // 出栏日龄输入变化 - 从日录入自动汇总
  onExitDayAgeInput: function (e) {
    const exitDayAge = e.detail.value;
    const dayAge = parseInt(exitDayAge) || 7;

    // 判断是否为周数据（7的倍数）
    const isWeekData = (dayAge % 7 === 0);
    const weekNo = isWeekData ? (dayAge / 7).toString() : '';

    this.setData({
      exitDayAge: exitDayAge,
      isWeekData: isWeekData,
      weekNo: weekNo
    });

    this.aggregateDailyData(dayAge);
  },

  // 从日录入数据自动汇总
  aggregateDailyData: function (weekendDayAge) {
    const that = this;
    const batch = app.globalData.currentBatch;
    if (!batch) return;

    wx.cloud.callFunction({
      name: 'getDailyData',
      data: {
        batchId: batch._id,
        dayAge: 0,
        getAll: true
      },
      success: res => {
        if (res.result && res.result.list) {
          const list = res.result.list;
          let totalFeed = 0;        // 累计上料量
          let totalCost = 0;        // 累计金额
          let totalFeedForPrice = 0; // 用于计算单价的累计上料
          let totalCostForPrice = 0; // 用于计算单价的累计金额
          let lastStock = 0;        // 最后一天存栏
          let feedFactory = '';     // 饲料厂家

          list.forEach(item => {
            const dayAge = parseInt(item.dayAge);
            // 累加到本周末的数据
            if (dayAge <= weekendDayAge) {
              // 累计上料量
              const amount = parseFloat(item.feedAmount) || 0;
              totalFeed += amount;

              // 累计金额
              const price = parseFloat(item.feedPrice) || 0;
              if (amount > 0 && price > 0) {
                const dayCost = amount * price / 1000;
                totalCost += dayCost;
                totalFeedForPrice += amount;
                totalCostForPrice += dayCost;
              }

              // 记录最后一天的存栏
              if (dayAge === weekendDayAge) {
                lastStock = parseInt(item.currentStock) || 0;
              }

              // 获取饲料厂家
              if (dayAge === weekendDayAge && item.feedFactory) {
                feedFactory = item.feedFactory;
              }
            }
          });

          // 计算饲料单价
          let feedPrice = '';
          if (totalFeedForPrice > 0) {
            feedPrice = ((totalCostForPrice / totalFeedForPrice) * 1000).toFixed(2);
          }

          // 自动填充数据（用户可后续修改）
          that.setData({
            weekStock: lastStock || '',
            cumulativeFeed: totalFeed.toFixed(2),
            feedPrice: feedPrice,
            feedFactory: feedFactory
          });

          // 如果有库存料量，计算其他指标
          if (that.data.stockFeed) {
            that.calcAll();
          }
        }
      }
    });
  },

  // 所有输入处理函数
  onStockInput: function (e) {
    this.setData({ weekStock: e.detail.value });
    this.calcAll();
  },
  onWeightInput: function (e) {
    this.setData({ avgWeight: e.detail.value });
    this.calcAll();
  },
  onCumulativeFeedInput: function (e) {
    this.setData({ cumulativeFeed: e.detail.value });
    this.calcAll();
  },
  onStockFeedInput: function (e) {
    this.setData({ stockFeed: e.detail.value });
    this.calcAll();
  },
  onActualFeedInput: function (e) {
    this.setData({ actualFeed: e.detail.value });
    this.calcFCRAndMeatCost();
  },
  onCumulativeFeedCostInput: function (e) {
    this.setData({ cumulativeFeedCost: e.detail.value });
  },
  onFeedPriceInput: function (e) {
    this.setData({ feedPrice: e.detail.value });
    this.calcFCRAndMeatCost();
  },
  onFCRInput: function (e) {
    this.setData({ cumulativeFCR: e.detail.value });
    // 如果修改了料比，重新计算造肉成本
    this.calcMeatCostFromFCR();
  },
  onMeatCostInput: function (e) {
    this.setData({ meatCost: e.detail.value });
  },
  onFeedFactoryInput: function (e) {
    this.setData({ feedFactory: e.detail.value });
  },

  // 计算所有指标
  calcAll: function () {
    this.calcActualFeed();
    this.calcFCRAndMeatCost();
  },

  // 计算实际采食量
  calcActualFeed: function () {
    const cumulativeFeed = parseFloat(this.data.cumulativeFeed) || 0;
    const stockFeed = parseFloat(this.data.stockFeed) || 0;
    const feedPrice = parseFloat(this.data.feedPrice) || 0;

    // 累计采食量 = 累计上料量 - 库存料量
    const actualFeed = Math.max(0, cumulativeFeed - stockFeed);

    // 累计上料金额 = 累计采食量 × 饲料单价 / 1000
    let cumulativeFeedCost = '';
    if (actualFeed > 0 && feedPrice > 0) {
      cumulativeFeedCost = (actualFeed * feedPrice / 1000).toFixed(2);
    }

    this.setData({
      actualFeed: actualFeed.toFixed(2),
      cumulativeFeedCost: cumulativeFeedCost
    });
  },

  // 计算料比和造肉成本
  calcFCRAndMeatCost: function () {
    const actualFeed = parseFloat(this.data.actualFeed) || 0;
    const stock = parseInt(this.data.weekStock) || 0;
    const weight = parseFloat(this.data.avgWeight) || 0;
    const feedPrice = parseFloat(this.data.feedPrice) || 0;

    // 累计料比 = 累计采食量(kg) / (平均体重(g) × 存栏 / 1000)
    // 把平均体重从克转换成公斤：weight(g) / 1000 = weight(kg)
    // 总重量 = 平均体重(kg) × 存栏
    if (actualFeed > 0 && stock > 0 && weight > 0) {
      const avgWeightKg = weight / 1000;  // 平均体重转换成kg
      const totalWeightKg = avgWeightKg * stock;  // 总重量(kg)
      const fcr = (actualFeed / totalWeightKg).toFixed(2);
      this.setData({ cumulativeFCR: fcr });

      // 造肉成本 = 料比 × 单价(元/吨) / 2
      if (feedPrice > 0) {
        const meatCost = (fcr * feedPrice / 2).toFixed(2);
        this.setData({ meatCost: meatCost });
      }
    }
  },

  // 从料比计算造肉成本（当手动修改料比时）
  calcMeatCostFromFCR: function () {
    const fcr = parseFloat(this.data.cumulativeFCR) || 0;
    const feedPrice = parseFloat(this.data.feedPrice) || 0;

    if (fcr > 0 && feedPrice > 0) {
      const meatCost = (fcr * feedPrice / 2).toFixed(2);
      this.setData({ meatCost: meatCost });
    }
  },

  // 保存周数据/出栏数据
  saveWeekData: function () {
    const batch = app.globalData.currentBatch;
    if (!batch) {
      wx.showToast({ title: '请先在设置页新建批次', icon: 'none' });
      return;
    }

    const exitDayAge = parseInt(this.data.exitDayAge) || 7;
    const isWeekData = this.data.isWeekData;
    const weekNo = isWeekData ? parseInt(this.data.weekNo) : 0;

    // 验证必填项
    if (!this.data.avgWeight) {
      wx.showToast({ title: '请填写平均体重', icon: 'none' });
      return;
    }
    if (!this.data.stockFeed) {
      wx.showToast({ title: '请填写库存料量', icon: 'none' });
      return;
    }

    this.setData({ saving: true });

    const db = wx.cloud.database();
    const weekData = {
      batchId: batch._id,
      exitDayAge: exitDayAge,           // 出栏日龄（天）
      isWeekData: isWeekData,           // 是否为周数据
      weekNo: weekNo,                   // 周数（周数据时有值）
      weekendDayAge: exitDayAge,        // 兼容旧字段
      weekendStock: parseInt(this.data.weekStock) || 0,
      avgWeight: parseFloat(this.data.avgWeight) || 0,
      cumulativeFeed: parseFloat(this.data.cumulativeFeed) || 0,
      stockFeed: parseFloat(this.data.stockFeed) || 0,
      actualFeed: parseFloat(this.data.actualFeed) || 0,
      cumulativeFeedCost: parseFloat(this.data.cumulativeFeedCost) || 0,
      feedPrice: this.data.feedPrice || '',
      cumulativeFCR: this.data.cumulativeFCR || '',
      meatCost: this.data.meatCost || '',
      feedFactory: this.data.feedFactory || '',
      updateTime: Date.now()
    };

    // 查询是否已有数据
    db.collection('weekly_data')
      .where({
        batchId: batch._id,
        exitDayAge: exitDayAge
      })
      .get({
        success: res => {
          if (res.data.length > 0) {
            // 更新
            db.collection('weekly_data').doc(res.data[0]._id).update({
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
            db.collection('weekly_data').add({
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
