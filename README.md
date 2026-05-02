# 机掌柜-养殖数据小程序 v2026-04-22

## 项目说明

微信小程序，用于肉鸡养殖数据录入、统计和报表管理。

## 目录结构

```
mini-program/
├── app.js              # 全局逻辑
├── app.json            # 全局配置（页面/tabBar/云开发）
├── app.wxss            # 全局样式
├── project.config.json # 项目配置
├── sitemap.json        # sitemap配置
├── utils/
│   └── util.js         # 工具函数
├── pages/
│   ├── entry/         # 录入页
│   │   ├── entry.js
│   │   ├── entry.wxml
│   │   ├── entry.wxss
│   │   └── entry.json
│   ├── data/          # 数据页
│   ├── report/        # 报表页
│   └── settings/       # 设置页
├── cloudfunctions/    # 云函数
│   ├── login/         # 登录云函数
│   └── saveDailyData/ # 保存日数据云函数
└── images/            # tabBar图标（需自行添加）
```

## 使用步骤

### 1. 导入项目
1. 打开微信开发者工具
2. 选择"导入项目"
3. 项目目录选择 `D:\WorkBuddy\Claw\mini-program`
4. AppID 填 `wx4cde617bc132b182`

### 2. 配置云开发环境
1. 登录微信公众平台 mp.weixin.qq.com
2. 进入小程序后台 → 开发 → 云开发
3. 开通云开发，创建环境（记住环境ID）
4. 云环境ID已配置为 `cloudbase-d3g6iddoh1cf24a4c`，如需更换请修改 `app.js` 第16行

### 3. 创建数据库集合
在云开发控制台创建以下集合：
- `batch` - 批次信息
- `daily_data` - 日数据
- `env_data` - 环控数据
- `weekly_data` - 周数据

### 4. 上传云函数
1. 在开发者工具中右键 `cloudfunctions` 文件夹
2. 选择"上传并部署：云端安装依赖"
3. 等待部署完成

### 5. 添加tabBar图标
在 `images/` 目录下添加以下图标（72x72像素）：
- entry.png / entry-active.png
- data.png / data-active.png
- report.png / report-active.png
- settings.png / settings-active.png

## 功能说明

### 录入页
- 录入模式切换（当前日龄/补录）
- 体重/耗料数据（1-3点采样，自动计算均值）
- 夜间/白天环境参数
- 循环时间自动记忆
- 周末填写（库存料量）

### 数据页
- 今日汇总展示
- 体重/环控数据展示

### 报表页
- 日报：按日龄筛选，累计数据展示
- 环控：每天一行，夜间+白天并排
- 周报：周数据汇总 + 出栏汇总（绿色高亮）
- 历史：历史批次列表

### 设置页
- 个人信息/手机绑定
- 公司信息/扫码授权
- 新建批次
- 确认出栏

## 数据计算公式

- 存活率 = 存栏 / 进鸡数量 × 100%
- 累计死淘 = 当日死淘 + 历史累计死淘
- 日料比 = 日耗料 / 日体重
- 累计料比 = 累计耗料 / (累计均重 × 存栏)
- 造肉成本 = 料比 × 饲料单价 ÷ 2

## 注意事项

1. 首次使用需在设置页新建批次
2. 循环时间会自动记忆，下次自动填入
3. 出栏前需填写"出栏库存料量"
4. 云函数需要手动上传部署

## 联系方式

技术支持：小爪 🐾
