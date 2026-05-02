const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { phone, code } = event;

  // 手机号+验证码登录
  if (phone && code) {
    try {
      // 验证验证码
      const now = Date.now();
      const codeRes = await db.collection('sms_codes')
        .where({
          phone: phone,
          used: false
        })
        .orderBy('createTime', 'desc')
        .limit(1)
        .get();

      if (codeRes.data.length === 0) {
        return { success: false, error: '请先获取验证码' };
      }

      const storedCode = codeRes.data[0];
      
      // 检查是否过期（5分钟内）
      if (now > storedCode.expireTime) {
        return { success: false, error: '验证码已过期' };
      }

      // 验证验证码是否正确
      if (storedCode.code !== code) {
        return { success: false, error: '验证码错误' };
      }

      // 标记验证码已使用
      await db.collection('sms_codes').doc(storedCode._id).update({
        data: { used: true }
      });

      // 查找或创建用户
      let userRes = await db.collection('user_info')
        .where({ openid: openid })
        .get();

      if (userRes.data.length === 0) {
        // 新用户
        await db.collection('user_info').add({
          data: {
            openid: openid,
            phone: phone,
            nickName: '',
            avatarUrl: '',
            createTime: new Date(),
            updateTime: new Date()
          }
        });
      } else {
        // 更新手机号
        await db.collection('user_info').doc(userRes.data[0]._id).update({
          data: {
            phone: phone,
            updateTime: new Date()
          }
        });
      }

      return { success: true, openid: openid };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // 微信一键登录（原有逻辑）
  try {
    const res = await db.collection('user_info').where({
      openid: openid,
    }).get();
    if (res.data.length === 0) {
      await db.collection('user_info').add({
        data: {
          openid: openid,
          createTime: new Date(),
        }
      });
    }
    return { success: true, openid: openid };
  } catch (e) {
    return { success: false, error: e.message };
  }
};
