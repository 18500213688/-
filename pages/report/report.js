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

  // 加载周报数据（完全动态，有数据就显示）
  loadWeeklyData: function() {
    const that = this;
    if (!this.data.batchInfo) return;
    const db = wx.cloud.database();
    const batchId = this.data.batchInfo._id;

    db.collection('weekly_data')
      .where({ batchId: batchId })
      .orderBy('exitDayAge', 'asc')
      .get({
        success: res => {
          const list = res.data || [];
          const rows = [];

          list.forEach(d => {
            const isWeekData = d.isWeekData || (d.exitDayAge % 7 === 0);
            let label = '';
            
            if (isWeekData) {
              // 周数据：1, 2, 3, 4, 5, 6, 7, 8, 9, 10...
              const weekNo = d.weekNo || Math.floor(d.exitDayAge / 7);
              label = String(weekNo);
            } else {
              // 出栏数据：38天出栏, 42天出栏...
              label = d.exitDayAge + '天出栏';
            }
            
            rows.push({
              dayAge: d.exitDayAge,
              label: label,
              isExit: !isWeekData,
              hasData: true,
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

          that.setData({ weekReportRows: rows });
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
