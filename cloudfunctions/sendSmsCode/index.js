const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 模拟验证码（开发阶段使用）
// 正式环境需要接入腾讯云短信服务
function generateCode() {
  return Math.random().toString().slice(2, 8);
}

exports.main = async (event, context) => {
  const { phone } = event;

  if (!phone || !/^1\d{10}$/.test(phone)) {
    return {
      success: false,
      error: '手机号格式不正确'
    };
  }

  try {
    const code = generateCode();
    const now = Date.now();

    // 存储验证码到数据库（有效期5分钟）
    await db.collection('sms_codes').add({
      data: {
        phone,
        code,
        createTime: now,
        expireTime: now + 5 * 60 * 1000,
        used: false
      }
    });

    // TODO: 正式环境调用腾讯云短信API发送验证码
    // const smsRes = await cloud.openapi.cloudSms.sendSms({...});
    console.log(`[开发模式] 验证码 ${code} 已生成，手机号: ${phone}`);

    return {
      success: true,
      message: '验证码已发送',
      // 开发模式：返回验证码方便测试
      devCode: code
    };
  } catch (err) {
    console.error('发送验证码失败', err);
    return {
      success: false,
      error: '发送失败，请稍后重试'
    };
  }
};
