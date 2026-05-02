const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  try {
    const res = await db.collection('batch').orderBy('inDate', 'desc').get();
    return { success: true, data: res.data };
  } catch (e) {
    return { success: false, error: e.message };
  }
};
