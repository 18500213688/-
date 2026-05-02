const app = getApp();
const util = require('../../utils/util.js');

Page({
  data: {
    // 当前报表子Tab
    reportTab: 'daily',

    // 批次信息
    batchInfo: null,

    // 日报数据
    dailyList: [],
    dayFilterStart: 0,
    dayFilterEnd: 999,

    // 周报数据
    weekReportRows: [],

    // 环控数据
    envList: [],

    // 历史批次
    historyList: [],
    hasHistory: false
  },

  onLoad: function() {
    this.loadData();
  },

  onShow: function() {
    this.loadData();
  },

  // 切换报表Tab
  switchReportTab: function(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ reportTab: tab });
  },

  // 筛选起始日龄输入
  onFilterStartInput: function(e) {
    this.setData({ dayFilterStart: e.detail.value });
  },

  // 筛选结束日龄输入
  onFilterEndInput: function(e) {
    this.setData({ dayFilterEnd: e.detail.value });
  },

  // 应用筛选
  applyFilter: function() {
    this.loadDailyData();
  },

  // 加载数据
  loadData: function() {
    const that = this;
    const companyInfo = wx.getStorageSync('companyInfo') || {};

    app.getCurrentBatch(function(batch) {
      if (!batch) {
        return;
      }

      that.setData({ batchInfo: batch });
      that.loadDailyData();
      that.loadWeeklyData();
      that.loadEnvData();
      that.loadHistoryBatches();
    });
  },

  // 加载日报数据
  loadDailyData: function() {
    const that = this;
    if (!this.data.batchInfo) return;
    const db = wx.cloud.database();
    const batchId = this.data.batchInfo._id;
    const start = parseInt(this.data.dayFilterStart) || 0;
    const end = parseInt(this.data.dayFilterEnd) || 999;

    db.collection('daily_data')
      .where({
        batchId: batchId,
        dayAge: db.command.gte(start).and(db.command.lte(end))
      })
      .orderBy('dayAge', 'asc')
      .get({
        success: res => {
          that.setData({ dailyList: res.data || [] });
        }
      });
  },

  // 加载周报数据
  loadWeeklyData: function() {
    const that = this;
    if (!this.data.batchInfo) return;
    const db = wx.cloud.database();
    const batchId = this.data.batchInfo._id;
    const batch = this.data.batchInfo;

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

          that.setData({ weekReportRows: rows });
        }
      });
  },

  // 加载环控数据
  loadEnvData: function() {
    const that = this;
    if (!this.data.batchInfo) return;
    const db = wx.cloud.database();
    db.collection('env_data')
      .where({ batchId: this.data.batchInfo._id })
      .orderBy('date', 'asc')
      .get({
        success: res => {
          const list = (res.data || []).map(item => {
            if (item.date) {
              const d = new Date(item.date);
              const month = String(d.getMonth() + 1).padStart(2, '0');
              const day = String(d.getDate()).padStart(2, '0');
              item.dateStr = month + '-' + day;
            }
            return item;
          });
          that.setData({ envList: list });
        }
      });
  },

  // 加载历史批次
  loadHistoryBatches: function() {
    const that = this;
    const db = wx.cloud.database();
    db.collection('batch')
      .where({ status: 'finished' })
      .orderBy('createTime', 'desc')
      .get({
        success: res => {
          const list = (res.data || []).map(item => {
            if (item.entryDate) {
              const d = new Date(item.entryDate);
              const year = d.getFullYear();
              const month = String(d.getMonth() + 1).padStart(2, '0');
              const day = String(d.getDate()).padStart(2, '0');
              item.entryDateStr = year + '-' + month + '-' + day;
            }
            return item;
          });
          that.setData({
            historyList: list,
            hasHistory: list && list.length > 0
          });
        }
      });
  },

  // 查看历史批次报表
  viewHistoryBatch: function(e) {
    const batchId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '/pages/batch-report/batch-report?id=' + batchId
    });
  }
});
