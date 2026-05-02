const app = getApp();
const util = require('../../utils/util.js');

Page({
  data: {
    // 批次信息条
    hasBatch: false,
    companyHouse: '',
    batchVariety: '',
    batchType: '',
    batchQty: '',
    batchDate: '',

    // 日龄
    dayAge: 0,
    dayHint: '💡 输入日龄后，有历史数据会自动回填，无数据则清空待填',

    // 存栏和存活率
    currentStock: 0,      // 当前存栏
    survivalRate: '100',  // 存活率（%）

    // 基础数据
    deadCount: '',
    culledCount: 0,
    deadCullTotal: 0,
    respiratoryRate: '',

    // 上料数据
    feedAmount: '',        // 当日上料量（kg）
    feedPrice: '',         // 饲料单价（元/吨）
    feedCost: '',          // 上料金额（元）
    cumulativeFeed: '',    // 累计上料量（kg）
    cumulativeFeedCost: '',// 累计上料金额（元）
    feedFactory: '',

    // 体重数据
    weightFront: '',
    weightMiddle: '',
    weightRear: '',
    weightAvg: '',

    // 日增重数据
    gainFront: '',
    gainMiddle: '',
    gainRear: '',
    gainAvg: '',

    // 日耗料数据
    feedFront: '',
    feedMiddle: '',
    feedRear: '',
    feedAvg: '',

    // 夜间环境数据
    nightTargetTemp: '',
    nightMinTemp: '',
    nightHumidity: '',
    nightFanCount: '',
    nightCycleTime: '',
    nightOpenTime: '',
    nightWindowSize: '',
    nightNegativePressure: '',
    nightOpenMouthRate: '',

    // 白天环境数据
    dayTargetTemp: '',
    dayMaxTemp: '',
    dayHumidity: '',
    dayFanCount: '',
    dayCycleTime: '',
    dayOpenTime: '',
    dayWindowSize: '',
    dayNegativePressure: '',
    dayOpenMouthRate: '',

    // 周末填写
    isWeekend: false,
    weekendAvgWeight: '',
    weekendStockFeed: ''
  },

  onLoad: function() {
    this.loadBatchInfo();
    this.loadCycleTimeMemory();
    this.calculateCurrentDayAge();
  },

  onShow: function() {
    this.loadBatchInfo();
  },

  // 加载批次信息 → 优先读 localStorage（保存后立即可用），没有再查云数据库
  loadBatchInfo: function() {
    const that = this;
    const companyInfo = wx.getStorageSync('companyInfo') || {};
    const companyHouse = companyInfo.companyHouse || '';
    // 先从 localStorage 读取
    const localBatch = wx.getStorageSync('currentBatch');
    if (localBatch) {
      that.setData({
        hasBatch: true,
        companyHouse: companyHouse,
        batchVariety: localBatch.variety || '',
        batchType: localBatch.type || '',
        batchQty: localBatch.initialStock ? Number(localBatch.initialStock).toLocaleString() : '',
        batchDate: localBatch.entryDate || ''
      });
      that.calculateStockAndSurvival();
    } else {
      // localStorage 没有，从云数据库查
      app.getCurrentBatch(function(batch) {
        if (batch) {
          wx.setStorageSync('currentBatch', batch);
          that.setData({
            hasBatch: true,
            companyHouse: companyHouse,
            batchVariety: batch.variety || '',
            batchType: batch.type || '',
            batchQty: batch.initialStock ? Number(batch.initialStock).toLocaleString() : '',
            batchDate: batch.entryDate || ''
          });
          that.calculateStockAndSurvival();
        } else {
          that.setData({ hasBatch: false, companyHouse: '' });
        }
      });
    }
  },

  // 计算当前日龄
  calculateCurrentDayAge: function() {
    const batch = app.globalData.currentBatch;
    if (batch && batch.entryDate) {
      const dayAge = util.calculateDayAge(batch.entryDate);
      this.setData({ dayAge });
      this.calculateStockAndSurvival();
    }
  },

  // 计算存栏和存活率
  calculateStockAndSurvival: function() {
    const that = this;
    const batch = app.globalData.currentBatch;
    if (!batch || !batch.initialStock) return;

    const initialStock = parseInt(batch.initialStock) || 0;
    if (initialStock <= 0) return;

    // 从云函数获取累计死淘
    wx.cloud.callFunction({
      name: 'getDailyData',
      data: { batchId: batch._id, dayAge: 0, getAll: true },
      success: res => {
        let totalDead = 0;
        if (res.result && res.result.list) {
          // 累加所有死淘
          res.result.list.forEach(item => {
            totalDead += parseInt(item.deadCount) || 0;
          });
        }
        const currentStock = initialStock - totalDead;
        const survivalRate = ((currentStock / initialStock) * 100).toFixed(1);
        that.setData({
          currentStock: currentStock,
          survivalRate: survivalRate
        });
      },
      fail: () => {
        // 如果查询失败，默认显示入舍数量
        that.setData({
          currentStock: initialStock,
          survivalRate: '100.0'
        });
      }
    });
  },

  // 加载记忆的循环时间
  loadCycleTimeMemory: function() {
    this.setData({
      nightCycleTime: util.getStoredCycleTime('nightCycle'),
      nightOpenTime: util.getStoredCycleTime('nightOpen'),
      dayCycleTime: util.getStoredCycleTime('dayCycle'),
      dayOpenTime: util.getStoredCycleTime('dayOpen')
    });
  },

  // 日龄输入变化 → 回填历史 or 清空
  onDayChange: function() {
    const that = this;
    const day = this.data.dayAge;
    if (!day) {
      this.setData({
        dayHint: '💡 输入日龄后，有历史数据会自动回填，无数据则清空待填'
      });
      this.clearFormKeepDay();
      return;
    }

    // 尝试从云函数读取该日龄的历史数据
    const batchId = app.globalData.currentBatch ? app.globalData.currentBatch._id : '';
    if (!batchId) return;

    wx.cloud.callFunction({
      name: 'getDailyData',
      data: { batchId: batchId, dayAge: parseInt(day) },
      success: res => {
        if (res.result && res.result.data) {
          const d = res.result.data;
          that.setData({
            deadCount: d.deadCount || '',
            culledCount: d.culledCount || 0,
            deadCullTotal: d.cumulativeDead || 0,
            respiratoryRate: d.respiratoryRate || '',
            currentStock: d.currentStock || 0,
            survivalRate: d.survivalRate || '100.0',
            feedAmount: d.feedAmount || '',
            feedPrice: d.feedPrice || '',
            feedCost: d.feedCost || '',
            cumulativeFeed: d.cumulativeFeed || '',
            cumulativeFeedCost: d.cumulativeFeedCost || '',
            feedFactory: d.feedFactory || '',
            weightFront: d.weightFront || '',
            weightMiddle: d.weightMiddle || '',
            weightRear: d.weightRear || '',
            weightAvg: d.weightAvg || '',
            gainFront: d.gainFront || '',
            gainMiddle: d.gainMiddle || '',
            gainRear: d.gainRear || '',
            gainAvg: d.gainAvg || '',
            feedFront: d.feedFront || '',
            feedMiddle: d.feedMiddle || '',
            feedRear: d.feedRear || '',
            feedAvg: d.feedAvg || '',
            nightTargetTemp: d.nightTargetTemp || '',
            nightMinTemp: d.nightMinTemp || '',
            nightHumidity: d.nightHumidity || '',
            nightFanCount: d.nightFanCount || '',
            nightCycleTime: d.nightCycleTime || '',
            nightOpenTime: d.nightOpenTime || '',
            nightWindowSize: d.nightWindowSize || '',
            nightNegativePressure: d.nightNegativePressure || '',
            nightOpenMouthRate: d.nightOpenMouthRate || '',
            dayTargetTemp: d.dayTargetTemp || '',
            dayMaxTemp: d.dayMaxTemp || '',
            dayHumidity: d.dayHumidity || '',
            dayFanCount: d.dayFanCount || '',
            dayCycleTime: d.dayCycleTime || '',
            dayOpenTime: d.dayOpenTime || '',
            dayWindowSize: d.dayWindowSize || '',
            dayNegativePressure: d.dayNegativePressure || '',
            dayOpenMouthRate: d.dayOpenMouthRate || '',
            weekendAvgWeight: d.weekendAvgWeight || '',
            weekendStockFeed: d.weekendStockFeed || '',
            dayHint: '✅ 第' + day + '天历史数据已回填，可修改后重新保存'
          });
          that.calculateWeightAvg();
          that.calculateGainAvg();
          that.calculateFeedAvg();
        } else {
          that.clearFormKeepDay();
          that.setData({
            dayHint: '📝 第' + day + '天暂无数据，请录入后保存'
          });
        }
      },
      fail: () => {
        that.clearFormKeepDay();
        that.setData({
          dayHint: '📝 第' + day + '天暂无数据，请录入后保存'
        });
      }
    });
  },

  // 清空表单（保留日龄）
  clearFormKeepDay: function() {
    this.setData({
      deadCount: '',
      culledCount: 0,
      deadCullTotal: 0,
      respiratoryRate: '',
      feedAmount: '',
      feedPrice: '',
      feedCost: '',
      cumulativeFeed: '',
      cumulativeFeedCost: '',
      feedFactory: '',
      weightFront: '',
      weightMiddle: '',
      weightRear: '',
      weightAvg: '',
      gainFront: '',
      gainMiddle: '',
      gainRear: '',
      gainAvg: '',
      feedFront: '',
      feedMiddle: '',
      feedRear: '',
      feedAvg: '',
      nightTargetTemp: '',
      nightMinTemp: '',
      nightHumidity: '',
      nightFanCount: '',
      nightCycleTime: util.getStoredCycleTime('nightCycle'),
      nightOpenTime: util.getStoredCycleTime('nightOpen'),
      nightWindowSize: '',
      nightNegativePressure: '',
      nightOpenMouthRate: '',
      dayTargetTemp: '',
      dayMaxTemp: '',
      dayHumidity: '',
      dayFanCount: '',
      dayCycleTime: util.getStoredCycleTime('dayCycle'),
      dayOpenTime: util.getStoredCycleTime('dayOpen'),
      dayWindowSize: '',
      dayNegativePressure: '',
      dayOpenMouthRate: '',
      weekendAvgWeight: '',
      weekendStockFeed: ''
    });
  },

  // 输入框绑定
  onInput: function(e) {
    const field = e.currentTarget.dataset.field;
    const val = e.detail.value;
    const data = { [field]: val };

    // 死亡或淘汰变化时，自动算死淘合计，并重新计算存栏
    if (field === 'deadCount' || field === 'culledCount') {
      const d = field === 'deadCount' ? parseInt(val) || 0 : parseInt(this.data.deadCount) || 0;
      const c = field === 'culledCount' ? parseInt(val) || 0 : parseInt(this.data.culledCount) || 0;
      data.deadCullTotal = d + c;

      // 自动计算存栏 = 入舍数量 - 累计死淘
      const localBatch = wx.getStorageSync('currentBatch');
      const batch = localBatch || app.globalData.currentBatch;
      if (batch && batch.initialStock) {
        const initialStock = parseInt(batch.initialStock) || 0;
        // 获取历史累计死淘
        this.calculateAutoStock(initialStock, d + c);
      }
    }

    // 存栏手动修改时，自动计算存活率
    if (field === 'currentStock') {
      const stock = parseInt(val) || 0;
      const localBatch = wx.getStorageSync('currentBatch');
      const batch = localBatch || app.globalData.currentBatch;
      if (batch && batch.initialStock) {
        const initialStock = parseInt(batch.initialStock) || 0;
        if (initialStock > 0) {
          const survivalRate = ((stock / initialStock) * 100).toFixed(1);
          data.survivalRate = survivalRate;
        }
      }
    }

    this.setData(data);

    // 日龄变化时触发回填检查
    if (field === 'dayAge') {
      this.onDayChange();
    }
  },

  // 自动计算存栏（入舍数量 - 累计死淘）
  calculateAutoStock: function(initialStock, todayDeadCull) {
    const that = this;
    const batch = app.globalData.currentBatch;
    if (!batch) return;

    const currentDayAge = parseInt(this.data.dayAge) || 0;

    // 查询历史死淘数据
    const db = wx.cloud.database();
    db.collection('daily_data')
      .where({
        batchId: batch._id,
        dayAge: db.command.lt(currentDayAge)
      })
      .get({
        success: res => {
          let totalDeadCull = 0;
          (res.data || []).forEach(item => {
            totalDeadCull += (parseInt(item.deadCount) || 0) + (parseInt(item.culledCount) || 0);
          });

          // 加上今天的死淘
          totalDeadCull += todayDeadCull;

          // 计算存栏
          const currentStock = initialStock - totalDeadCull;
          const survivalRate = initialStock > 0 ? ((currentStock / initialStock) * 100).toFixed(1) : '0.0';

          that.setData({
            currentStock: currentStock,
            survivalRate: survivalRate
          });
        }
      });
  },

  // 手动计算存活率（根据当前存栏和入舍数量）
  calculateSurvivalRate: function() {
    const batch = app.globalData.currentBatch;
    if (!batch || !batch.initialStock) return;
    
    const initialStock = parseInt(batch.initialStock) || 0;
    const currentStock = parseInt(this.data.currentStock) || 0;
    
    if (initialStock > 0) {
      const survivalRate = ((currentStock / initialStock) * 100).toFixed(1);
      this.setData({ survivalRate });
    }
  },

  // 计算体重平均值
  calculateWeightAvg: function() {
    const weights = [parseFloat(this.data.weightFront), parseFloat(this.data.weightMiddle), parseFloat(this.data.weightRear)].filter(w => !isNaN(w) && w > 0);
    if (weights.length > 0) {
      const avg = weights.reduce((a, b) => a + b, 0) / weights.length;
      this.setData({ weightAvg: avg.toFixed(1) });
    }
  },

  // 计算日增重平均值
  calculateGainAvg: function() {
    const gains = [parseFloat(this.data.gainFront), parseFloat(this.data.gainMiddle), parseFloat(this.data.gainRear)].filter(g => !isNaN(g) && g > 0);
    if (gains.length > 0) {
      const avg = gains.reduce((a, b) => a + b, 0) / gains.length;
      this.setData({ gainAvg: avg.toFixed(1) });
    }
  },

  // 计算耗料平均值
  calculateFeedAvg: function() {
    const feeds = [parseFloat(this.data.feedFront), parseFloat(this.data.feedMiddle), parseFloat(this.data.feedRear)].filter(f => !isNaN(f) && f > 0);
    if (feeds.length > 0) {
      const avg = feeds.reduce((a, b) => a + b, 0) / feeds.length;
      this.setData({ feedAvg: avg.toFixed(1) });
    }
  },

  // 饲料输入处理（上料量、单价）
  onFeedInput: function(e) {
    const field = e.currentTarget.dataset.field;
    const val = e.detail.value;
    const data = { [field]: val };
    
    // 计算上料金额
    const amount = parseFloat(field === 'feedAmount' ? val : this.data.feedAmount) || 0;
    const price = parseFloat(field === 'feedPrice' ? val : this.data.feedPrice) || 0;
    
    if (amount > 0 && price > 0) {
      // 上料金额 = 上料量(kg) × 单价(元/吨) ÷ 1000
      const cost = (amount * price / 1000).toFixed(2);
      data.feedCost = cost;
    }
    
    this.setData(data);
    
    // 重新计算累计上料量和金额
    this.calculateCumulativeFeed();
  },

  // 计算累计上料量和金额（从0日龄累计到当前日龄）
  calculateCumulativeFeed: function() {
    const that = this;
    const batch = app.globalData.currentBatch;
    if (!batch) return;

    const currentDayAge = parseInt(this.data.dayAge) || 0;

    // 查询历史数据计算累计（从0到当前日龄）
    const db = wx.cloud.database();
    db.collection('daily_data')
      .where({
        batchId: batch._id,
        dayAge: db.command.lte(currentDayAge)
      })
      .get({
        success: res => {
          let totalFeed = 0;
          let totalCost = 0;

          // 累加历史数据（0到当前日龄）
          (res.data || []).forEach(item => {
            totalFeed += parseFloat(item.feedAmount) || 0;
            totalCost += parseFloat(item.feedCost) || 0;
          });

          // 加上今天的上料（如果今天数据还没保存）
          const todayAmount = parseFloat(that.data.feedAmount) || 0;
          const todayCost = parseFloat(that.data.feedCost) || 0;

          // 检查今天是否已保存
          const todaySaved = (res.data || []).some(item => item.dayAge === currentDayAge);
          if (!todaySaved && todayAmount > 0) {
            totalFeed += todayAmount;
            totalCost += todayCost;
          }

          that.setData({
            cumulativeFeed: totalFeed.toFixed(2),
            cumulativeFeedCost: totalCost.toFixed(2)
          });
        }
      });
  },

  // 保存数据
  saveData: function() {
    if (!this.data.dayAge && this.data.dayAge !== 0) {
      wx.showToast({ title: '请填写日龄', icon: 'none' });
      return;
    }
    if (!this.data.hasBatch) {
      wx.showToast({ title: '请先新建批次', icon: 'none' });
      return;
    }

    const that = this;

    // 保存循环时间记忆
    if (that.data.nightCycleTime) util.saveCycleTime('nightCycle', that.data.nightCycleTime);
    if (that.data.nightOpenTime) util.saveCycleTime('nightOpen', that.data.nightOpenTime);
    if (that.data.dayCycleTime) util.saveCycleTime('dayCycle', that.data.dayCycleTime);
    if (that.data.dayOpenTime) util.saveCycleTime('dayOpen', that.data.dayOpenTime);

    // 通过回调获取最新 batch，避免 globalData 未就绪
    app.getCurrentBatch(function(batch) {
      if (!batch) {
        wx.showToast({ title: '未找到当前批次', icon: 'none' });
        return;
      }

      const data = {
        batchId: batch._id,
        dayAge: parseInt(that.data.dayAge),
        deadCount: parseInt(that.data.deadCount) || 0,
        culledCount: parseInt(that.data.culledCount) || 0,
        deadCullTotal: parseInt(that.data.deadCullTotal) || 0,
        currentStock: parseInt(that.data.currentStock) || 0,
        initialStock: parseInt(batch.initialStock) || 0,
        respiratoryRate: parseFloat(that.data.respiratoryRate) || 0,
        feedAmount: that.data.feedAmount || '',
        feedPrice: that.data.feedPrice || '',
        feedCost: that.data.feedCost || '',
        cumulativeFeed: that.data.cumulativeFeed || '',
        cumulativeFeedCost: that.data.cumulativeFeedCost || '',
        feedFactory: that.data.feedFactory || '',
        weightFront: that.data.weightFront || '',
        weightMiddle: that.data.weightMiddle || '',
        weightRear: that.data.weightRear || '',
        weightAvg: that.data.weightAvg || '',
        gainFront: that.data.gainFront || '',
        gainMiddle: that.data.gainMiddle || '',
        gainRear: that.data.gainRear || '',
        gainAvg: that.data.gainAvg || '',
        feedFront: that.data.feedFront || '',
        feedMiddle: that.data.feedMiddle || '',
        feedRear: that.data.feedRear || '',
        feedAvg: that.data.feedAvg || '',
        nightTargetTemp: that.data.nightTargetTemp || '',
        nightMinTemp: that.data.nightMinTemp || '',
        nightHumidity: that.data.nightHumidity || '',
        nightFanCount: that.data.nightFanCount || '',
        nightCycleTime: that.data.nightCycleTime || '',
        nightOpenTime: that.data.nightOpenTime || '',
        nightWindowSize: that.data.nightWindowSize || '',
        nightNegativePressure: that.data.nightNegativePressure || '',
        nightOpenMouthRate: that.data.nightOpenMouthRate || '',
        dayTargetTemp: that.data.dayTargetTemp || '',
        dayMaxTemp: that.data.dayMaxTemp || '',
        dayHumidity: that.data.dayHumidity || '',
        dayFanCount: that.data.dayFanCount || '',
        dayCycleTime: that.data.dayCycleTime || '',
        dayOpenTime: that.data.dayOpenTime || '',
        dayWindowSize: that.data.dayWindowSize || '',
        dayNegativePressure: that.data.dayNegativePressure || '',
        dayOpenMouthRate: that.data.dayOpenMouthRate || '',
        weekendAvgWeight: that.data.weekendAvgWeight || '',
        weekendStockFeed: that.data.weekendStockFeed || ''
      };

      wx.cloud.callFunction({
        name: 'saveDailyData',
        data: data,
        success: res => {
          console.log('【保存返回】', JSON.stringify(res.result));
          
          // 检查云函数返回结果
          if (res.result && res.result.success) {
            wx.showToast({ title: '保存成功', icon: 'success' });
            // 从云函数返回更新存栏和存活率
            if (res.result.currentStock !== undefined) {
              that.setData({
                currentStock: res.result.currentStock,
                survivalRate: res.result.survivalRate || '0.0'
              });
            }
            that.clearFormKeepDay();
          } else {
            // 云函数返回失败
            const errorMsg = res.result && res.result.error ? res.result.error : '保存失败';
            console.error('【保存失败】', errorMsg);
            wx.showToast({ title: errorMsg, icon: 'none' });
          }
        },
        fail: err => {
          console.error('【调用失败】', err);
          wx.showToast({ title: '网络错误，请重试', icon: 'none' });
        }
      });
    });
  }
});
