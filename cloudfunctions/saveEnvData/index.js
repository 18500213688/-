const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { batchId, date, night, day } = event;
  try {
    const res = await db.collection('env_data').where({ batchId, date }).get();
    const record = { batchId, date, night: night || {}, day: day || {}, updateTime: new Date() };
    if (res.data.length > 0) {
      await db.collection('env_data').doc(res.data[0]._id).update({ data: record });
    } else {
      record.createTime = new Date();
      await db.collection('env_data').add({ data: record });
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
};
