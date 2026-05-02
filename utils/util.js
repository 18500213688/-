// 工具函数

// 格式化日期
function formatDate(date) {
  const d = new Date(date);
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return month + '-' + day;
}

// 计算日龄
function calculateDayAge(entryDate) {
  if (!entryDate) return 0;
  const entry = new Date(entryDate);
  const today = new Date();
  const diff = Math.floor((today - entry) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

// 计算存活率
function calculateSurvivalRate(currentStock, initialStock) {
  if (!initialStock || initialStock === 0) return 0;
  return ((currentStock / initialStock) * 100).toFixed(1);
}

// 计算料比
function calculateFCR(totalFeed, totalWeight) {
  if (!totalWeight || totalWeight === 0) return 0;
  return (totalFeed / totalWeight).toFixed(2);
}

// 计算造肉成本
function calculateMeatCost(fcr, feedPrice) {
  if (!fcr || !feedPrice) return 0;
  return (fcr * feedPrice / 2).toFixed(2); // 饲料单价是元/kg，转为元/斤需除2
}

// 数字千分位格式化
function formatNumber(num) {
  if (!num && num !== 0) return '-';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// 判断是否为周末（周日为0，周六为6）
function isWeekend() {
  const today = new Date();
  const day = today.getDay();
  return day === 0; // 周日
}

// 计算周末平均体重
function calculateWeekendAvgWeight(weights) {
  const valid = weights.filter(w => w && w > 0);
  if (valid.length === 0) return 0;
  const sum = valid.reduce((a, b) => a + b, 0);
  return (sum / valid.length).toFixed(1);
}

// 获取本地存储的循环时间
function getStoredCycleTime(type) {
  try {
    return wx.getStorageSync(`cycle_${type}`) || '';
  } catch (e) {
    return '';
  }
}

// 保存循环时间到本地
function saveCycleTime(type, value) {
  try {
    wx.setStorageSync(`cycle_${type}`, value);
  } catch (e) {
    console.error('保存循环时间失败', e);
  }
}

module.exports = {
  formatDate,
  calculateDayAge,
  calculateSurvivalRate,
  calculateFCR,
  calculateMeatCost,
  formatNumber,
  isWeekend,
  calculateWeekendAvgWeight,
  getStoredCycleTime,
  saveCycleTime
}
