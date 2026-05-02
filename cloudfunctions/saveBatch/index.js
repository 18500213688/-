const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { _id, breedName, inDate, inCount, status, exitDate, exitCount } = event;
  try {
    const record = {
      breedName, inDate, inCount,
      status: status || 'active',
      updateTime: new Date(),
    };
    if (status === 'exit') {
      record.exitDate = exitDate;
      record.exitCount = exitCount;
      record.exitTime = new Date();
    }
    if (_id) {
      await db.collection('batch').doc(_id).update({ data: record });
    } else {
      record.createTime = new Date();
      await db.collection('batch').add({ data: record });
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
};
