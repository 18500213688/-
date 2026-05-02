const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  
  if (!openid) {
    return { success: false, error: '用户未登录' };
  }

  const {
    batchId,
    dayAge,
    deadCount = 0,
    culledCount = 0,
    survivalRate = 0,
    respiratoryRate = 0,
    weightFront,
    weightMiddle,
    weightRear,
    weightAvg,
    feedFront,
    feedMiddle,
    feedRear,
    feedAvg,
    feedAmount,
    feedPrice,
    feedFactory,
    nightTargetTemp,
    nightMinTemp,
    nightHumidity,
    nightFanCount,
    nightCycleTime,
    nightOpenTime,
    nightWindowSize,
    nightNegativePressure,
    nightOpenMouthRate,
    dayTargetTemp,
    dayMaxTemp,
    dayHumidity,
    dayFanCount,
    dayCycleTime,
    dayOpenTime,
    dayWindowSize,
    dayNegativePressure,
    dayOpenMouthRate,
    weekendAvgWeight,
    weekendStockFeed
  } = event;

  try {
    console.log('【saveDailyData】收到参数:', event);
    console.log('【saveDailyData】用户openid:', openid);
    // 参数校验
    if (!batchId) {
      return { success: false, error: '缺少批次ID' };
    }
    if (!dayAge && dayAge !== 0) {
      return { success: false, error: '缺少日龄' };
    }

    // 存栏直接用前端手动填入的值
    const currentStock = parseInt(event.currentStock) || 0;
    // 累计死淘 = 当日死亡 + 当日淘汰
    const cumulativeDeadCalc = (parseInt(deadCount) || 0) + (parseInt(culledCount) || 0);

    // 获取入舍数量
    let initialStock = event.initialStock || 0;
    if (!initialStock) {
      const batchRes = await db.collection('batch').doc(batchId).get();
      if (batchRes.data) {
        initialStock = batchRes.data.initialStock || 0;
      }
    }

    // 存活率 = 存栏 / 入舍数量 × 100%
    const survivalRateCalc = initialStock > 0 ? ((currentStock / initialStock) * 100).toFixed(1) : '100.0';
    console.log('【计算结果】currentStock:', currentStock, 'survivalRate:', survivalRateCalc, 'cumulativeDead:', cumulativeDeadCalc);

    // 计算衍生指标
    const wAvg = parseFloat(weightAvg) || 0;
    const fAvg = parseFloat(feedAvg) || 0;
    const dayFeed = parseFloat(feedAmount) || 0; // 料塔上料量(kg)
    let prevWeightAvg = 0;
    let prevCumulativeFeed = 0;

    if (dayAge > 1) {
      // 第2天起：从前一天数据取
      const prevRes2 = await db.collection('daily_data')
        .where({ batchId, dayAge: dayAge - 1 })
        .get();
      if (prevRes2.data.length > 0) {
        prevWeightAvg = parseFloat(prevRes2.data[0].weightAvg) || 0;
        prevCumulativeFeed = parseFloat(prevRes2.data[0].cumulativeFeed) || 0;
      }
    }

    // 日增重(g) = 今天体重 - 昨天体重（如果Day1则等于体重本身）
    const dailyGain = dayAge === 1 ? wAvg : Math.max(0, wAvg - prevWeightAvg);
    // 日料比 = 日耗料(g) / 日增重(g)
    const dailyFCR = dailyGain > 0 ? (fAvg / dailyGain).toFixed(2) : 0;
    // 累计上料(kg) = 昨天累计 + 今天上料
    const cumulativeFeed = prevCumulativeFeed + dayFeed;

    // 查询是否已有当天数据
    const existRes = await db.collection('daily_data')
      .where({ batchId, dayAge })
      .get();

    const record = {
      batchId,
      dayAge,
      currentStock,
      survivalRate: survivalRateCalc,
      cumulativeDead: cumulativeDeadCalc,
      deadCount,
      culledCount,
      initialStock,
      respiratoryRate,

      // 体重
      weightFront: weightFront || '',
      weightMiddle: weightMiddle || '',
      weightRear: weightRear || '',
      weightAvg: wAvg,

      // 耗料
      feedFront: feedFront || '',
      feedMiddle: feedMiddle || '',
      feedRear: feedRear || '',
      feedAvg: fAvg,

      // 上料
      feedAmount: feedAmount || '',
      feedPrice: feedPrice || '',
      feedFactory: feedFactory || '',

      // 计算指标
      dailyGain: dailyGain.toFixed(1),
      dailyFCR: dailyFCR,
      cumulativeFeed: cumulativeFeed,

      // 夜间环境
      nightTargetTemp: nightTargetTemp || '',
      nightMinTemp: nightMinTemp || '',
      nightHumidity: nightHumidity || '',
      nightFanCount: nightFanCount || '',
      nightCycleTime: nightCycleTime || '',
      nightOpenTime: nightOpenTime || '',
      nightWindowSize: nightWindowSize || '',
      nightNegativePressure: nightNegativePressure || '',
      nightOpenMouthRate: nightOpenMouthRate || '',

      // 白天环境
      dayTargetTemp: dayTargetTemp || '',
      dayMaxTemp: dayMaxTemp || '',
      dayHumidity: dayHumidity || '',
      dayFanCount: dayFanCount || '',
      dayCycleTime: dayCycleTime || '',
      dayOpenTime: dayOpenTime || '',
      dayWindowSize: dayWindowSize || '',
      dayNegativePressure: dayNegativePressure || '',
      dayOpenMouthRate: dayOpenMouthRate || '',

      // 周末数据
      weekendAvgWeight: weekendAvgWeight || '',
      weekendStockFeed: weekendStockFeed || '',

      updateTime: new Date()
    };

    if (existRes.data.length > 0) {
      await db.collection('daily_data').doc(existRes.data[0]._id).update({ data: record });
    } else {
      record.createTime = new Date();
      await db.collection('daily_data').add({ data: record });
    }

    return { success: true, currentStock, survivalRate: survivalRateCalc, cumulativeDead: cumulativeDeadCalc };
  } catch (e) {
    console.error('【saveDailyData】错误:', e);
    return { success: false, error: e.message || '保存失败', stack: e.stack };
  }
};
