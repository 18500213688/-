const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { batchId } = event;
  try {
    const res = await db.collection('weekly_data').where({ batchId }).orderBy('weekNo', 'asc').get();
    return { success: true, data: res.data };
  } catch (e) {
    return { success: false, error: e.message };
  }
};
