const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { batchId, date } = event;
  try {
    const res = await db.collection('env_data').where({ batchId, date }).get();
    return { success: true, data: res.data[0] || null };
  } catch (e) {
    return { success: false, error: e.message };
  }
};
