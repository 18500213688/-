const app = getApp();
const util = require('../../utils/util.js');

Page({
  data: {
    today: {},
    batchInfo: null,
    currentStock: 0,
    survivalRate: 0,
    dayAge: 0,

    // 批次信息
    companyFarm: '',
    companyHouse: '',
    companyName: '',
    variety: '',
    type: '',
    entryDate: '',
    initialStock: 0,

    // 录入表单
    deadCount: '',
    culledCount: '',
    respRate: '',
    weightFront: '',
    weightMiddle: '',
    weightRear: '',
    weightAvg: '',
    dailyGain: '',
    feedFront: '',
    feedMiddle: '',
    feedRear: '',
    feedAvg: '',
    dailyFCR: '',
    feedAmount: '',
    feedPrice: '',
    feedCost: '',
    totalFeedAmount: '',
    totalFeedCost: '',
    nightTargetTemp: '',
    nightHumidity: '',
    nightOpenMouthRate: '',
    dayTargetTemp: '',
    dayHumidity: '',
    dayOpenMouthRate: ''
  },

  onLoad: function() {
    this.loadTodayData();
  },

  onShow: function() {
    this.loadTodayData();
  },

  // 加载今日数据
  loadTodayData: function() {
    const that = this;
    
    // 读取公司信息
    const companyInfo = wx.getStorageSync('companyInfo') || {};
    
    app.getCurrentBatch(function(batch) {
      if (!batch) {
        that.setData({
          companyFarm: companyInfo.farm || '',
          companyHouse: companyInfo.house || '',
          companyName: companyInfo.company || '',
          variety: '',
          type: '',
          entryDate: '',
          initialStock: 0
        });
        return;
      }

      that.setData({
        batchInfo: batch,
        companyFarm: companyInfo.farm || batch.companyFarm || '',
        companyHouse: companyInfo.house || batch.companyHouse || '',
        companyName: companyInfo.company || batch.companyName || '',
        variety: batch.variety || '',
        type: batch.type || '',
        entryDate: batch.entryDate || '',
        initialStock: batch.initialStock || ''
      });
      console.log('[数据页加载] batch.initialStock =', batch.initialStock, 'type =', typeof batch.initialStock);

      // 从数据库获取最新一条数据（按录入时间倒序）
      const db = wx.cloud.database();
      db.collection('daily_data')
        .where({ batchId: batch._id })
        .orderBy('dayAge', 'desc')
        .limit(1)
        .get({
          success: res => {
            if (res.data.length > 0) {
              that.processTodayData(res.data[0], batch);
            } else {
              // 无数据时初始化：根据入舍数量和存栏计算存活率
              const initStock = batch.initialStock || 0;
              const curStock = initStock;
              const rate = initStock > 0 ? ((curStock / initStock) * 100).toFixed(1) : 0;
              that.setData({
                dayAge: 0,
                currentStock: curStock,
                survivalRate: rate
              });
            }
          }
        });
    });
  },

  // 自动计算存栏 + 存活率（最简逻辑：存活率 = 存栏 / 入舍 × 100%）
  calcStock: function() {
    const that = this;
    const dayAge = parseInt(this.data.dayAge) || 0;
    const deadCount = parseInt(this.data.deadCount) || 0;
    const culledCount = parseInt(this.data.culledCount) || 0;
    const initialStock = parseInt(this.data.initialStock) || 0;

    const calcRate = (stock) => {
      if (initialStock > 0) {
        return ((stock / initialStock) * 100).toFixed(1);
      }
      return '100.0';
    };

    if (dayAge === 0) {
      const stock = Math.max(0, initialStock - deadCount - culledCount);
      this.setData({ currentStock: stock, survivalRate: calcRate(stock) });
    } else {
      const db = wx.cloud.database();
      db.collection('daily_data')
        .where({ batchId: this.data.batchInfo._id, dayAge: dayAge - 1 })
        .limit(1)
        .get({
          success: res => {
            let stock;
            if (res.data.length > 0) {
              stock = Math.max(0, (res.data[0].currentStock || 0) - deadCount - culledCount);
            } else {
              stock = Math.max(0, initialStock - deadCount - culledCount);
            }
            that.setData({ currentStock: stock, survivalRate: calcRate(stock) });
          }
        });
    }
  },

  // 处理今日数据
  processTodayData: function(data, batch) {
    const that = this;
    const dayAge = data.dayAge || 0;
    // 强制转数字，避免字符串导致计算错误
    const initialStock = parseInt(batch.initialStock) || 0;
    const currentStock = parseInt(data.currentStock) || 0;
    // 存活率 = 存栏 / 入舍数量 × 100%（最简逻辑）
    let survivalRate = '100.0';
    if (initialStock > 0) {
      survivalRate = ((currentStock / initialStock) * 100).toFixed(1);
    }
    console.log('[数据页] dayAge:', dayAge, 'currentStock:', currentStock, 'initialStock:', initialStock, 'survivalRate:', survivalRate);
    const weightAvg = data.weightAvg || 0;

    this.setData({
      dayAge: dayAge,
      today: data,
      currentStock: currentStock,
      survivalRate: survivalRate,
      // 回填表单
      deadCount: data.deadCount || '',
      culledCount: data.culledCount || '',
      respRate: data.respRate || '',
      weightFront: data.weightFront || '',
      weightMiddle: data.weightMiddle || '',
      weightRear: data.weightRear || '',
      weightAvg: weightAvg,
      dailyGain: data.dailyGain || 0,
      feedFront: data.feedFront || '',
      feedMiddle: data.feedMiddle || '',
      feedRear: data.feedRear || '',
      feedAvg: data.feedAvg || '',
      dailyFCR: data.dailyFCR || '',
      feedAmount: data.feedAmount || '',
      feedPrice: data.feedPrice || '',
      feedCost: data.feedCost || '',
      totalFeedAmount: '',
      totalFeedCost: '',
      nightTargetTemp: data.nightTargetTemp || '',
      nightHumidity: data.nightHumidity || '',
      nightOpenMouthRate: data.nightOpenMouthRate || '',
      dayTargetTemp: data.dayTargetTemp || '',
      dayHumidity: data.dayHumidity || '',
      dayOpenMouthRate: data.dayOpenMouthRate || ''
    });

    // 计算日增重
    if (dayAge > 0 && weightAvg > 0) {
      const db = wx.cloud.database();
      db.collection('daily_data')
        .where({ batchId: batch._id, dayAge: dayAge - 1 })
        .limit(1)
        .get({
          success: res => {
            if (res.data.length > 0) {
              const prevAvg = res.data[0].weightAvg || 0;
              const gain = weightAvg - prevAvg;
              that.setData({ dailyGain: gain });
            }
          }
        });
    }

    // 计算累计上料量和金额
    that.calcCumulativeFeed();
  },

  // 输入绑定
  onDayAgeInput: function(e) {
    this.setData({ dayAge: e.detail.value });
    this.calcStock();
  },
  onDeadInput: function(e) {
    this.setData({ deadCount: e.detail.value });
    this.calcStock();
  },
  onCulledInput: function(e) {
    this.setData({ culledCount: e.detail.value });
    this.calcStock();
  },
  onCurrentStockInput: function(e) {
    const stock = parseInt(e.detail.value) || 0;
    // 从 batchInfo 取入舍数，这是权威数据源
    const batch = this.data.batchInfo;
    const initialStock = (batch && parseInt(batch.initialStock)) || 0;
    const rate = initialStock > 0 ? ((stock / initialStock) * 100).toFixed(1) : '100.0';
    console.log('[手动改存栏] stock:', stock, 'initialStock:', initialStock, 'rate:', rate);
    this.setData({ currentStock: stock, survivalRate: rate });
  },
  onRespRateInput: function(e) { this.setData({ respRate: e.detail.value }); },
  onWeightInput: function(e) {
    const that = this;
    const val = parseFloat(e.detail.value) || 0;
    const field = e.currentTarget.dataset.field;
    const newData = { [field]: val };
    const f = field === 'weightFront' ? val : (parseFloat(this.data.weightFront) || 0);
    const m = field === 'weightMiddle' ? val : (parseFloat(this.data.weightMiddle) || 0);
    const r = field === 'weightRear' ? val : (parseFloat(this.data.weightRear) || 0);
    const vals = [f, m, r].filter(v => v > 0);
    const avg = vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
    newData.weightAvg = avg;
    newData.dailyGain = 0;

    // 计算日增重：当前平均体重 - 上一日龄平均体重
    const dayAge = parseInt(this.data.dayAge) || 0;
    if (dayAge > 0 && avg > 0 && this.data.batchInfo) {
      const db = wx.cloud.database();
      db.collection('daily_data')
        .where({ batchId: this.data.batchInfo._id, dayAge: dayAge - 1 })
        .limit(1)
        .get({
          success: res => {
            if (res.data.length > 0) {
              const prevAvg = res.data[0].weightAvg || 0;
              const gain = avg - prevAvg;
              that.setData({ [field]: val, weightAvg: avg, dailyGain: gain });
            } else {
              that.setData({ [field]: val, weightAvg: avg });
            }
          }
        });
    } else {
      this.setData(newData);
    }
  },
  onFeedAmountInput: function(e) {
    const amount = parseFloat(e.detail.value) || 0;
    const price = parseFloat(this.data.feedPrice) || 0;
    const cost = price > 0 ? (price / 1000 * amount).toFixed(2) : 0;
    this.setData({ feedAmount: e.detail.value, feedCost: cost });
    this.calcCumulativeFeed();
  },
  onFeedPriceInput: function(e) {
    const price = parseFloat(e.detail.value) || 0;
    const amount = parseFloat(this.data.feedAmount) || 0;
    const cost = price > 0 ? (price / 1000 * amount).toFixed(2) : 0;
    this.setData({ feedPrice: e.detail.value, feedCost: cost });
    this.calcCumulativeFeed();
  },
  // 计算累计上料量和金额
  calcCumulativeFeed: function() {
    const that = this;
    const batch = this.data.batchInfo;
    if (!batch) return;

    const dayAge = parseInt(this.data.dayAge) || 0;
    const currentAmount = parseFloat(this.data.feedAmount) || 0;
    const currentCost = parseFloat(this.data.feedCost) || 0;

    // 查询当前日龄之前的所有记录
    const db = wx.cloud.database();
    db.collection('daily_data')
      .where({ batchId: batch._id, dayAge: db.command.lt(dayAge) })
      .get({
        success: res => {
          let totalAmount = currentAmount;
          let totalCost = currentCost;
          res.data.forEach(item => {
            totalAmount += parseFloat(item.feedAmount) || 0;
            totalCost += parseFloat(item.feedCost) || 0;
          });
          that.setData({
            totalFeedAmount: Math.round(totalAmount * 10) / 10,
            totalFeedCost: Math.round(totalCost * 100) / 100
          });
        }
      });
  },
  onFeedInput: function(e) {
    const val = parseFloat(e.detail.value) || 0;
    const field = e.currentTarget.dataset.field;
    const f = field === 'feedFront' ? val : (parseFloat(this.data.feedFront) || 0);
    const m = field === 'feedMiddle' ? val : (parseFloat(this.data.feedMiddle) || 0);
    const r = field === 'feedRear' ? val : (parseFloat(this.data.feedRear) || 0);
    const vals = [f, m, r].filter(v => v > 0);
    const avg = vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
    // 计算日料比 = 日耗料 / 日增重
    const dailyGain = parseFloat(this.data.dailyGain) || 0;
    const fcr = avg > 0 && dailyGain > 0 ? (avg / dailyGain).toFixed(2) : 0;
    this.setData({ [field]: val, feedAvg: avg, dailyFCR: fcr });
  },
  onNightTargetTempInput: function(e) { this.setData({ nightTargetTemp: e.detail.value }); },
  onNightHumidityInput: function(e) { this.setData({ nightHumidity: e.detail.value }); },
  onNightOpenMouthRateInput: function(e) { this.setData({ nightOpenMouthRate: e.detail.value }); },
  onDayTargetTempInput: function(e) { this.setData({ dayTargetTemp: e.detail.value }); },
  onDayHumidityInput: function(e) { this.setData({ dayHumidity: e.detail.value }); },
  onDayOpenMouthRateInput: function(e) { this.setData({ dayOpenMouthRate: e.detail.value }); },

  // 保存数据
  saveData: function() {
    const batch = this.data.batchInfo;
    if (!batch) {
      wx.showToast({ title: '请先在设置页新建批次', icon: 'none' });
      return;
    }

    const dayAge = parseInt(this.data.dayAge) || 0;
    const deadCount = parseInt(this.data.deadCount) || 0;
    const culledCount = parseInt(this.data.culledCount) || 0;
    const respRate = parseFloat(this.data.respRate) || 0;
    const weightFront = parseFloat(this.data.weightFront) || 0;
    const weightMiddle = parseFloat(this.data.weightMiddle) || 0;
    const weightRear = parseFloat(this.data.weightRear) || 0;
    const nightTargetTemp = parseFloat(this.data.nightTargetTemp) || 0;
    const nightHumidity = parseFloat(this.data.nightHumidity) || 0;
    const nightOpenMouthRate = parseFloat(this.data.nightOpenMouthRate) || 0;
    const dayTargetTemp = parseFloat(this.data.dayTargetTemp) || 0;
    const dayHumidity = parseFloat(this.data.dayHumidity) || 0;
    const dayOpenMouthRate = parseFloat(this.data.dayOpenMouthRate) || 0;

    // 计算均重
    const weights = [weightFront, weightMiddle, weightRear].filter(w => w > 0);
    const weightAvg = weights.length > 0 ? Math.round(weights.reduce((a, b) => a + b, 0) / weights.length) : 0;
    const dailyGain = parseInt(this.data.dailyGain) || 0;
    const feedFront = parseFloat(this.data.feedFront) || 0;
    const feedMiddle = parseFloat(this.data.feedMiddle) || 0;
    const feedRear = parseFloat(this.data.feedRear) || 0;
    const feedVals = [feedFront, feedMiddle, feedRear].filter(w => w > 0);
    const feedAvg = feedVals.length > 0 ? Math.round(feedVals.reduce((a, b) => a + b, 0) / feedVals.length) : 0;
    const dailyFCR = parseFloat(this.data.dailyFCR) || 0;

    this.setData({ saving: true });

    wx.cloud.callFunction({
      name: 'saveDailyData',
      data: {
        batchId: batch._id,
        dayAge: dayAge,
        deadCount: deadCount,
        culledCount: culledCount,
        respRate: respRate,
        weightFront: weightFront,
        weightMiddle: weightMiddle,
        weightRear: weightRear,
        weightAvg: weightAvg,
        dailyGain: dailyGain,
        feedFront: feedFront,
        feedMiddle: feedMiddle,
        feedRear: feedRear,
        feedAvg: feedAvg,
        dailyFCR: dailyFCR,
        feedAmount: parseFloat(this.data.feedAmount) || 0,
        feedPrice: parseFloat(this.data.feedPrice) || 0,
        feedCost: parseFloat(this.data.feedCost) || 0,
        nightTargetTemp: nightTargetTemp,
        nightHumidity: nightHumidity,
        nightOpenMouthRate: nightOpenMouthRate,
        dayTargetTemp: dayTargetTemp,
        dayHumidity: dayHumidity,
        dayOpenMouthRate: dayOpenMouthRate
      },
      success: res => {
        this.setData({ saving: false });
        if (res.result && res.result.success) {
          wx.showToast({ title: '保存成功', icon: 'success' });
          // 刷新数据
          setTimeout(() => this.loadTodayData(), 1000);
        } else {
          wx.showToast({ title: res.result.error || '保存失败', icon: 'none' });
        }
      },
      fail: err => {
        this.setData({ saving: false });
        wx.showToast({ title: '网络错误', icon: 'none' });
      }
    });
  }
});
