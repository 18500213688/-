const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const { company, farm, house, houseId } = event;
  
  try {
    // 生成场景字符串（最多32字符）
    const scene = `bind_${farm}_${house}`.substring(0, 32);
    
    // 调用微信云开发API生成小程序码
    const result = await cloud.openapi.wxacode.createQRCode({
      path: 'pages/index/index',  // 小程序首页（扫码后跳转）
      width: 280,
      scene: scene  // 自定义参数，扫码后可在onLoad获取
    });
    
    // 返回二维码buffer，转为base64
    const buffer = result.buffer;
    const base64 = buffer.toString('base64');
    const dataUrl = `data:image/png;base64,${base64}`;
    
    return {
      success: true,
      qrDataUrl: dataUrl,
      scene: scene
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
};
