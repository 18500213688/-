App({
  globalData: {
    userInfo: null,
    openid: null,
    currentBatch: null,  // 当前批次信息
    companyInfo: null,   // 公司/场/栋信息
    isManager: false,    // 是否已授权
    pendingBind: null    // 待绑定信息（扫码后）
  },

  onLaunch: function () {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'cloudbase-d3g6iddoh1cf24a4c',
        traceUser: true,
      });
    }

    // 获取用户信息
    this.getUserInfo();
  },

  onShow: function (options) {
    // 检查是否扫码进入
    if (options.query && options.query.scene) {
      const scene = decodeURIComponent(options.query.scene);
      this.handleScanBind(scene);
    }
  },

  // 处理扫码绑定
  handleScanBind: function (scene) {
    // scene 格式: bind_厂区_栋号
    if (scene && scene.startsWith('bind_')) {
      const parts = scene.split('_');
      if (parts.length >= 3) {
        const farm = parts[1];
        const house = parts[2];
        
        this.globalData.pendingBind = { farm, house };
        
        // 跳转到绑定确认页
        wx.navigateTo({
          url: '/pages/bind-confirm/bind-confirm?farm=' + farm + '&house=' + house
        });
      }
    }
  },

  // 获取微信用户信息
  getUserInfo: function () {
    wx.getSetting({
      success: res => {
        if (res.authSetting['scope.userInfo']) {
          wx.getUserInfo({
            success: res => {
              this.globalData.userInfo = res.userInfo;
              // 触发登录
              this.doLogin();
            }
          });
        }
      }
    });
  },

  // 云开发登录
  doLogin: function () {
    wx.cloud.callFunction({
      name: 'login',
      data: {},
      success: res => {
        this.globalData.openid = res.result.openid;
        console.log('openid:', this.globalData.openid);
      }
    });
  },

  // 获取当前批次
  getCurrentBatch: function (callback) {
    const db = wx.cloud.database();
    db.collection('batch')
      .where({ status: 'active' })
      .orderBy('createTime', 'desc')
      .limit(1)
      .get({
        success: res => {
          if (res.data.length > 0) {
            this.globalData.currentBatch = res.data[0];
          } else {
            this.globalData.currentBatch = null;
          }
          callback && callback(this.globalData.currentBatch);
        },
        fail: () => {
          callback && callback(null);
        }
      });
  },

  // 计算日龄
  calculateDayAge: function (entryDate) {
    if (!entryDate) return 1;
    const entry = new Date(entryDate + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.floor((today - entry) / (1000 * 60 * 60 * 24));
    return Math.max(1, diff + 1);
  }
})
