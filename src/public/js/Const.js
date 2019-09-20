//车辆类型
export const vehicleType = [
  '炮孔作业车辆',
  '矿渣运输车辆',
  '推土机',
  '挖掘机',
  '混装车',
  '武装押运车辆',
  '其它',
];

//人员类型
export const personnelType = [
  '炮孔作业人员',
  '爆破实施人员',
  '矿渣运输人员',
  '武装押运人员',
  '其他',
];

//所属公司
export const companyList = ['集团', '分子公司'];

//预案类型
export const planList = [
  '全部',
  '露天边坡坍塌事预案',
  '排土场坍塌预案',
  '泥石流事故预案',
  '爆破事故预案',
  '车辆伤害事故预案',
  '触电事故预案',
  '其他',
];

// 预案等级
export const planLevel = ['I级', 'II级', 'III级', 'IV级'];

//车辆状态
export const vehicleState = [
  {label: '全部', value: ''},
  {label: '在线', value: '1'},
  {label: '离线', value: '2'},
];

//人员类别
export const personalType = [
  '炮孔作业人员',
  '爆破实施人员',
  '矿渣运输人员',
  '武装押运人员',
];

//电子围栏限制条件
export const limitType = ['禁止驶入','禁止驶出']

//车载终端编号
export const vehicleTerminalNumber = [];

// 高精度终端编号
export const HighPrecisionTerminalNumbering = [];


// 道路类型
export const roadType=["运输道路","修理厂道路"];

//创建人
export const creator =["张三","",""];

//统计类型
export const statisticalType=["爆破物资统计","报警统计","车辆统计"];



export const ALLIMGS = {
  text: require('../../assets/home/文字.png'),
  炮孔作业车辆: require('../../assets/target/炮孔作业车辆.png'),
  炮孔作业车辆_Active: require('../../assets/target/炮孔作业车辆_Active.png'),
  矿渣运输车辆: require('../../assets/target/运渣车.png'),
  矿渣运输车辆_Active: require('../../assets/target/运渣车_Active.png'),
  推土机: require('../../assets/target/推土机.png'),
  推土机_Active: require('../../assets/target/推土机_Active.png'),
  挖掘机: require('../../assets/target/挖掘机.png'),
  挖掘机_Active: require('../../assets/target/挖掘机_Active.png'),
  other: require('../../assets/target/other.png'),
  other_Active: require('../../assets/target/other_Active.png'),
  手环: require('../../assets/target/renxin.png'),
  手环_Active: require('../../assets/target/renxin.png'),
};
