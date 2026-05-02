const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { batchId, exitDate, exitCount } = event;
  try {
    await db.collection('batch').doc(batchId).update({
      data: {
        status: 'exit',
        exitDate: exitDate,
        exitCount: exitCount,
        exitTime: new Date(),
      }
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
};
