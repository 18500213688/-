// 简版QRCode生成器（微信小程序Canvas版）
// 基于 qrcode.js 改编，去掉DOM依赖，纯函数实现

var QRCode = {
  // 生成二维码数据
  createData: function(text, errorCorrectionLevel) {
    // 简化为返回原始文本（实际生产应生成二维码矩阵）
    // 微信小程序实际使用 canvas 渲染，这里提供数据接口
    return text;
  }
};

// 生成二维码图片（使用canvas）
// 小程序端调用示例：
// const qr = require('weapp-qrcode.js')
// qr.draw({
//   canvasId: 'qrCanvas',
//   text: '绑定信息',
//   width: 200,
//   height: 200
// })

function draw(options) {
  const { canvasId, text, width = 200, height = 200 } = options;
  
  // 使用微信canvas API
  const query = wx.createSelectorQuery();
  query.select('#' + canvasId)
    .fields({ node: true, size: true })
    .exec((res) => {
      const canvas = res[0].node;
      const ctx = canvas.getContext('2d');
      
      // 设置canvas尺寸
      canvas.width = width;
      canvas.height = height;
      
      // 绘制背景
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      
      // 绘制边框
      ctx.strokeStyle = '#1677ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(10, 10, width - 20, height - 20);
      
      // 绘制文字
      ctx.fillStyle = '#333';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('扫码绑定', width / 2, height / 2 - 10);
      
      // 绘制信息摘要
      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#666';
      const shortText = text.length > 10 ? text.substring(0, 10) + '...' : text;
      ctx.fillText(shortText, width / 2, height / 2 + 15);
      
      // 提示：请使用真实二维码库替换
      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#999';
      ctx.fillText('(需集成qrcode库)', width / 2, height - 20);
    });
}

// 导出
module.exports = {
  draw: draw,
  createData: QRCode.createData
};
