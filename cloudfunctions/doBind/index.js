const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { farm, house } = event;
  
  try {
    // 获取调用者的openid
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    
    // 先查询是否已绑定
    const existRes = await db.collection('bind_records')
      .where({ openid, farm, house })
      .get();
    
    if (existRes.data.length > 0) {
      return { success: true, message: '已绑定，无需重复绑定' };
    }
    
    // 写入绑定记录
    await db.collection('bind_records').add({
      data: {
        openid: openid,
        farm: farm,
        house: house,
        bindTime: Date.now(),
        status: 'active'
      }
    });
    
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
};
