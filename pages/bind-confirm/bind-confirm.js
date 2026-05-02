const app = getApp();

Page({
  data: {
    farm: '',
    house: '',
    binding: false,
    isLoggedIn: false,
    phone: '',
    verifyCode: '',
    sendingCode: false,
    loggingIn: false,
    wxLogging: false,
    countdown: 0,
    userInfo: null
  },

  onLoad: function(options) {
    this.setData({
      farm: options.farm || '',
      house: options.house || ''
    });
    this.checkLoginStatus();
  },

  // 检查登录状态
  checkLoginStatus: function() {
    const userInfo = app.globalData.userInfo;
    const openid = app.globalData.openid;
    
    // 从本地缓存读取登录状态
    const loginInfo = wx.getStorageSync('loginInfo') || {};
    
    if (loginInfo.phone && loginInfo.openid) {
      this.setData({
        isLoggedIn: true,
        phone: loginInfo.phone,
        userInfo: userInfo || {}
      });
    } else {
      // 确保获取openid
      if (!openid) {
        app.doLogin();
        // 延迟再检查
        setTimeout(() => this.checkLoginStatus(), 1000);
      }
    }
  },

  // 微信一键登录
  wxLogin: function() {
    const that = this;
    this.setData({ wxLogging: true });

    // 获取微信用户信息
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: res => {
        const userInfo = res.userInfo;
        app.globalData.userInfo = userInfo;
        
        // 获取openid
        if (!app.globalData.openid) {
          app.doLogin();
          setTimeout(() => {
            that.setData({ wxLogging: false });
            wx.showToast({ title: '请补充手机号', icon: 'none' });
            // 保持未登录状态，用户需要输入手机号
          }, 1500);
        } else {
          that.setData({ 
            wxLogging: false, 
            userInfo: userInfo 
          });
          wx.showToast({ title: '请补充手机号', icon: 'none' });
        }
      },
      fail: err => {
        that.setData({ wxLogging: false });
        wx.showToast({ title: '请允许授权', icon: 'none' });
      }
    });
  },

  onPhoneInput: function(e) {
    this.setData({ phone: e.detail.value });
  },

  onCodeInput: function(e) {
    this.setData({ verifyCode: e.detail.value });
  },

  // 发送验证码
  sendVerifyCode: function() {
    const phone = this.data.phone;
    
    if (!phone || phone.length !== 11) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' });
      return;
    }

    this.setData({ sendingCode: true });

    wx.cloud.callFunction({
      name: 'sendSmsCode',
      data: { phone: phone },
      success: res => {
        this.setData({ sendingCode: false });
        if (res.result && res.result.success) {
          wx.showToast({ title: '验证码已发送', icon: 'success' });
          this.startCountdown();
        } else {
          wx.showToast({ title: res.result.error || '发送失败', icon: 'none' });
        }
      },
      fail: err => {
        this.setData({ sendingCode: false });
        wx.showToast({ title: '网络错误', icon: 'none' });
      }
    });
  },

  // 倒计时
  startCountdown: function() {
    this.setData({ countdown: 60 });
    const timer = setInterval(() => {
      const c = this.data.countdown - 1;
      if (c <= 0) {
        clearInterval(timer);
        this.setData({ countdown: 0 });
      } else {
        this.setData({ countdown: c });
      }
    }, 1000);
  },

  // 手机号登录
  doPhoneLogin: function() {
    const { phone, verifyCode } = this.data;
    
    if (!phone || phone.length !== 11) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' });
      return;
    }
    
    if (!verifyCode || verifyCode.length < 4) {
      wx.showToast({ title: '请输入验证码', icon: 'none' });
      return;
    }

    this.setData({ loggingIn: true });

    wx.cloud.callFunction({
      name: 'login',
      data: {
        phone: phone,
        code: verifyCode
      },
      success: res => {
        this.setData({ loggingIn: false });
        if (res.result && res.result.success) {
          // 保存登录信息
          const loginInfo = {
            phone: phone,
            openid: app.globalData.openid || res.result.openid,
            loginTime: Date.now()
          };
          wx.setStorageSync('loginInfo', loginInfo);
          
          this.setData({ isLoggedIn: true });
          wx.showToast({ title: '登录成功', icon: 'success' });
        } else {
          wx.showToast({ title: res.result.error || '登录失败', icon: 'none' });
        }
      },
      fail: err => {
        this.setData({ loggingIn: false });
        wx.showToast({ title: '网络错误', icon: 'none' });
      }
    });
  },

  // 退出登录
  logout: function() {
    wx.removeStorageSync('loginInfo');
    this.setData({
      isLoggedIn: false,
      phone: '',
      verifyCode: ''
    });
  },

  // 执行绑定
  doBind: function() {
    if (this.data.binding) return;
    
    const { farm, house } = this.data;
    if (!farm || !house) {
      wx.showToast({ title: '参数错误', icon: 'none' });
      return;
    }

    this.setData({ binding: true });

    wx.cloud.callFunction({
      name: 'doBind',
      data: {
        farm: farm,
        house: house
      },
      success: res => {
        this.setData({ binding: false });
        if (res.result && res.result.success) {
          wx.showToast({ title: '绑定成功', icon: 'success' });
          setTimeout(() => {
            wx.switchTab({ url: '/pages/data/data' });
          }, 1500);
        } else {
          wx.showToast({ title: res.result.error || '绑定失败', icon: 'none' });
        }
      },
      fail: err => {
        this.setData({ binding: false });
        wx.showToast({ title: '网络错误', icon: 'none' });
      }
    });
  },

  cancelBind: function() {
    wx.switchTab({ url: '/pages/data/data' });
  }
});
