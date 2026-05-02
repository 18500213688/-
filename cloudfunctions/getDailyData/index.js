const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { batchId, date, dayAge, limit = 30, getAll } = event;
  try {
    // 构建基础查询
    let query = db.collection('daily_data').where({ batchId });

    // 按日期查询
    if (date) {
      query = db.collection('daily_data').where({ batchId, date });
    }
    // 获取全部数据（用于计算累计死淘）
    else if (getAll) {
      query = db.collection('daily_data').where({ batchId }).orderBy('dayAge', 'asc');
      const res = await query.limit(500).get();
      return { success: true, list: res.data };
    }
    // 按日龄精确查询
    else if (dayAge !== undefined && dayAge !== null) {
      const age = parseInt(dayAge);
      query = db.collection('daily_data').where({ batchId, dayAge: age });
      const res = await query.limit(1).get();
      return { success: true, data: res.data[0] || null };
    }

    // 默认：按日期倒序取最近数据
    query = query.orderBy('date', 'desc');
    const res = await query.limit(limit).get();
    return { success: true, data: res.data };
  } catch (e) {
    return { success: false, error: e.message };
  }
};
