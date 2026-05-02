const app = getApp();
const util = require('../../utils/util.js');

Page({
  data: {
    userInfo: null,
    phone: '',
    isLoggedIn: false,
    loginPhone: '',

    // 公司信息
    companyName: '',
    companyFarm: '',
    companyHouse: '',
    companyBound: false,
    companyBindReady: false,

    // 批次信息
    batchTitle: '新建批次',
    hasBatch: false,
    variety: '',
    type: '小白(中)',
    typeIndex: 1,
    typeList: ['小白(慢)', '小白(中)', '小白(快)', '大白(慢)', '大白(快)'],
    qty: '',
    entryDate: '',
    batchEnded: false,

    exitForm: {
      exitAge: '',
      exitWeight: '',
      survival: '',
      totalFeed: '',
      feedAmount: '',
      feedPrice: '',
      exitFCR: '',
      meatCost: ''
    }
  },

  onLoad: function() {
    this.loadUserInfo();
    this.loadBatchInfo();
    this.loadCompanyInfo();
  },

  onShow: function() {
    this.loadUserInfo();
    this.loadBatchInfo();
  },

  // 加载用户信息
  loadUserInfo: function() {
    const userInfo = app.globalData.userInfo;
    const loginInfo = wx.getStorageSync('loginInfo') || {};
    const phone = loginInfo.phone || '';
    this.setData({
      userInfo: userInfo,
      phone: phone,
      isLoggedIn: !!(phone && userInfo)
    });
  },

  // 手机号输入
  onPhoneInput: function(e) {
    this.setData({ loginPhone: e.detail.value });
  },

  // 提交手机号绑定
  doLogin: function() {
    const phone = this.data.loginPhone;
    if (!phone || phone.length !== 11) {
      wx.showToast({ title: '请输入正确手机号', icon: 'none' });
      return;
    }
    const loginInfo = {
      phone: phone,
      nickName: (this.data.userInfo && this.data.userInfo.nickName) || '微信用户',
      loginTime: Date.now()
    };
    wx.setStorageSync('loginInfo', loginInfo);
    this.setData({
      phone: phone,
      isLoggedIn: true,
      loginPhone: ''
    });
    wx.showToast({ title: '绑定成功', icon: 'success' });
  },

  // 加载批次信息 → 优先读 localStorage（保存后立即可用），没有再查云数据库
  loadBatchInfo: function() {
    const that = this;
    // 先从 localStorage 读取（保存后立即可用）
    const localBatch = wx.getStorageSync('currentBatch');
    if (localBatch) {
      that.setData({
        hasBatch: true,
        batchTitle: localBatch.status === 'finished' ? '新建批次' : '当前批次',
        variety: localBatch.variety || '',
        type: localBatch.type || '小白(中)',
        qty: localBatch.initialStock || '',
        entryDate: localBatch.entryDate || '',
        companyHouse: localBatch.companyHouse || '',
        batchEnded: localBatch.status === 'finished',
        exitForm: {
          exitAge: localBatch.exitAge || '',
          exitWeight: localBatch.exitWeight || '',
          survival: localBatch.survival || '',
          totalFeed: localBatch.totalFeed || '',
          feedAmount: localBatch.feedAmount || '',
          feedPrice: localBatch.feedPrice || '',
          exitFCR: localBatch.exitFCR || '',
          meatCost: localBatch.meatCost || ''
        }
      });
    } else {
      // localStorage 没有，从云数据库查
      app.getCurrentBatch(function(batch) {
        if (batch) {
          wx.setStorageSync('currentBatch', batch);
          that.setData({
            hasBatch: true,
            batchTitle: batch.status === 'finished' ? '新建批次' : '当前批次',
            variety: batch.variety || '',
            type: batch.type || '小白(中)',
            qty: batch.initialStock || '',
            entryDate: batch.entryDate || '',
            batchEnded: batch.status === 'finished',
            exitForm: {
              exitAge: batch.exitAge || '',
              exitWeight: batch.exitWeight || '',
              survival: batch.survival || '',
              totalFeed: batch.totalFeed || '',
              feedAmount: batch.feedAmount || '',
              feedPrice: batch.feedPrice || '',
              exitFCR: batch.exitFCR || '',
              meatCost: batch.meatCost || ''
            }
          });
        } else {
          that.setData({
            hasBatch: false,
            batchTitle: '新建批次',
            variety: '',
            type: '小白(中)',
            typeIndex: 1,
            qty: '',
            entryDate: '',
            exitForm: {
              exitAge: '', exitWeight: '', survival: '',
              totalFeed: '', feedAmount: '', feedPrice: '',
              exitFCR: '', meatCost: ''
            }
          });
        }
      });
    }
  },

  // 重置批次（清空表单，回到新建状态）
  resetBatch: function() {
    wx.showModal({
      title: '重置批次',
      content: '确定清空当前批次信息，重新填写吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            hasBatch: false,
            batchTitle: '新建批次',
            variety: '',
            type: '小白(中)',
            typeIndex: 1,
            qty: '',
            entryDate: ''
          });
          wx.showToast({ title: '已重置', icon: 'success' });
        }
      }
    });
  },

  // 通用输入
  onInput: function(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: e.detail.value });
  },

  // 进鸡日期选择
  onEntryDateChange: function(e) {
    this.setData({ entryDate: e.detail.value });
  },

  // 类型选择
  onTypeChange: function(e) {
    const index = e.detail.value;
    this.setData({
      typeIndex: index,
      type: this.data.typeList[index]
    });
  },

  // ===== 公司信息：检查是否可绑定 =====
  checkCompanyInfo: function() {
    const { companyName, companyFarm, companyHouse } = this.data;
    const ready = !!(companyName && companyFarm && companyHouse);
    this.setData({ companyBindReady: ready });
    // 保存到本地
    wx.setStorageSync('companyInfo', {
      companyName: companyName,
      companyFarm: companyFarm,
      companyHouse: companyHouse
    });
  },

  // ===== 公司信息：确认绑定 =====
  confirmCompanyBind: function() {
    const { companyName, companyFarm, companyHouse } = this.data;
    if (!companyName || !companyFarm || !companyHouse) return;

    this.setData({
      companyBound: true,
      companyBindReady: false
    });
    wx.showToast({ title: '绑定成功', icon: 'success' });
  },

  // ===== 公司信息：解除绑定 =====
  unbindCompany: function() {
    wx.showModal({
      title: '解除绑定',
      content: '确定解除公司信息绑定吗？\n解除后需要重新绑定才能归属到公司和场区。',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            companyName: '',
            companyFarm: '',
            companyHouse: '',
            companyBound: false,
            companyBindReady: false
          });
          wx.removeStorageSync('companyInfo');
          wx.showToast({ title: '已解除绑定', icon: 'success' });
        }
      }
    });
  },

  // 加载本地公司信息
  loadCompanyInfo: function() {
    const info = wx.getStorageSync('companyInfo') || {};
    if (info.companyName && info.companyFarm && info.companyHouse) {
      this.setData({
        companyName: info.companyName,
        companyFarm: info.companyFarm,
        companyHouse: info.companyHouse,
        companyBound: true
      });
    }
  },

  // ===== 保存/新建批次 =====
  createBatch: function() {
    if (!this.data.variety || !this.data.entryDate) {
      wx.showToast({ title: '请填写品种和入舍日期', icon: 'none' });
      return;
    }
    const that = this;
    wx.showModal({
      title: '确认保存',
      content: `栋号：${this.data.companyHouse || '-'}\n品种：${this.data.variety} ${this.data.type}\n数量：${this.data.qty || '-'}只\n入舍日期：${this.data.entryDate}`,
      success: (res) => {
        if (res.confirm) {
          that.doCreateBatch();
        }
      }
    });
  },

  doCreateBatch: function() {
    const that = this;
    const db = wx.cloud.database();
    const companyHouse = that.data.companyHouse || '';
    const batchData = {
      variety: this.data.variety,
      type: this.data.type,
      initialStock: parseInt(this.data.qty) || 0,
      entryDate: this.data.entryDate,
      companyHouse: companyHouse,
      status: 'active',
      createTime: Date.now()
    };
    // 保存栋号到本地
    wx.setStorageSync('companyInfo', Object.assign(wx.getStorageSync('companyInfo') || {}, { companyHouse: companyHouse }));
    db.collection('batch').add({
      data: batchData,
      success: (res) => {
        wx.showToast({ title: '保存成功', icon: 'success' });
        // 保存成功，写入 localStorage，各页面从 localStorage 读取
        const newBatch = Object.assign({ _id: res._id }, batchData);
        wx.setStorageSync('currentBatch', newBatch);
        app.globalData.currentBatch = newBatch;
        // 更新页面显示
        that.setData({
          hasBatch: true,
          batchTitle: '当前批次',
          variety: batchData.variety,
          type: batchData.type,
          qty: batchData.initialStock,
          entryDate: batchData.entryDate,
          companyHouse: companyHouse
        });
      },
      fail: (err) => {
        console.error('新建批次失败', err);
        wx.showToast({ title: '保存失败', icon: 'none' });
      }
    });
  },

  viewBatch: function() {
    wx.showToast({ title: '当前批次信息如上', icon: 'none' });
  },

  // ===== 出栏信息输入 =====
  onExitInput: function(e) {
    const field = e.currentTarget.dataset.field;
    const exitForm = this.data.exitForm;
    const keys = field.split('.');
    if (keys.length === 2) {
      exitForm[keys[1]] = e.detail.value;
    }
    this.setData({ exitForm: exitForm });
  },

  // 自动计算出栏料比/成本
  autoCalcExit: function() {
    const ef = this.data.exitForm;
    const totalFeed = parseFloat(ef.totalFeed) || 0;
    const feedAmount = parseFloat(ef.feedAmount) || 0;
    const exitWeight = parseFloat(ef.exitWeight) || 0;
    const survival = parseFloat(ef.survival) || 0;
    const initialStock = parseInt(this.data.qty) || 0;

    let feedPrice = '';
    let exitFCR = '';
    let meatCost = '';

    if (totalFeed > 0 && feedAmount > 0) {
      feedPrice = (feedAmount / totalFeed).toFixed(2);
    }
    if (exitWeight > 0 && survival > 0 && initialStock > 0) {
      const liveCount = initialStock * survival / 100;
      const totalWeight = exitWeight * liveCount / 1000;
      if (totalWeight > 0) {
        exitFCR = (totalFeed / totalWeight).toFixed(2);
      }
      if (exitFCR && feedPrice) {
        meatCost = (parseFloat(exitFCR) * parseFloat(feedPrice)).toFixed(2);
      }
    }

    const exitForm = { ...this.data.exitForm };
    if (feedPrice) exitForm.feedPrice = feedPrice;
    if (exitFCR) exitForm.exitFCR = exitFCR;
    if (meatCost) exitForm.meatCost = meatCost;
    this.setData({ exitForm: exitForm });
    wx.showToast({ title: '计算完成', icon: 'success' });
  },

  // 确认出栏
  confirmExit: function() {
    const that = this;
    const ef = this.data.exitForm;
    if (!ef.exitAge || !ef.exitWeight) {
      wx.showToast({ title: '请填写出栏日龄和均重', icon: 'none' });
      return;
    }
    wx.showModal({
      title: '确认出栏',
      content: `出栏日龄：${ef.exitAge}天\n存活率：${ef.survival || '-'}%\n出栏均重：${ef.exitWeight}g\n累计耗料：${ef.totalFeed || '-'}kg\n累计料比：${ef.exitFCR || '-'}\n\n确认后本批次将归档结束`,
      success: (res) => {
        if (res.confirm) {
          that.doConfirmExit();
        }
      }
    });
  },

  doConfirmExit: function() {
    const that = this;
    const batch = app.globalData.currentBatch;
    if (!batch) return;
    const ef = this.data.exitForm;
    const db = wx.cloud.database();
    db.collection('batch').doc(batch._id).update({
      data: {
        status: 'finished',
        exitAge: parseInt(ef.exitAge) || 0,
        survival: parseFloat(ef.survival) || 0,
        exitWeight: parseFloat(ef.exitWeight) || 0,
        totalFeed: parseFloat(ef.totalFeed) || 0,
        feedAmount: parseFloat(ef.feedAmount) || 0,
        feedPrice: parseFloat(ef.feedPrice) || 0,
        exitFCR: parseFloat(ef.exitFCR) || 0,
        meatCost: parseFloat(ef.meatCost) || 0,
        exitTime: Date.now()
      },
      success: () => {
        wx.showToast({ title: '出栏完成', icon: 'success' });
        that.setData({ batchEnded: true });
      },
      fail: (err) => {
        console.error('出栏失败', err);
        wx.showToast({ title: '出栏失败', icon: 'none' });
      }
    });
  }
});
