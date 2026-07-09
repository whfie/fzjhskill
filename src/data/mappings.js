// 数据映射表 - ID → 中文名称（重构自原项目 conditionToCN.js / calcNames.js）

// 武学类型
export const METHOD_NAMES = {
  1: "拳脚",
  2: "内功",
  3: "轻功",
  4: "招架",
  5: "剑法",
  6: "刀法",
  7: "棍法",
  8: "暗器",
  9: "鞭法",
  10: "双持",
  11: "乐器",
};

export function getMethodName(id) {
  return METHOD_NAMES[id] || id;
}

// 武学属性（伤害类型）
export const ELEMENT_NAMES = {
  1: "无性",
  3: "阳性",
  5: "阴性",
  7: "混元",
  9: "外功",
};

export function getElementName(id) {
  return ELEMENT_NAMES[id] || ELEMENT_NAMES[String(id)] || id;
}

// 装备武器类型
export const WEAPON_TYPES = {
  jianfa1: "长剑",
  jianfa2: "短剑",
  jianfa3: "软剑",
  jianfa4: "重剑",
  jianfa5: "刺剑",
  daofa1: "长刀",
  daofa2: "短刀",
  daofa3: "弯刀",
  daofa4: "大环刀",
  daofa5: "双刃斧",
  gunfa1: "长棍",
  gunfa2: "长枪",
  gunfa3: "三节棍",
  gunfa4: "狼牙棒",
  gunfa5: "战戟",
  bianfa1: "长鞭",
  bianfa2: "软鞭",
  bianfa3: "九节鞭",
  bianfa4: "杆子鞭",
  bianfa5: "链枷",
  anqi1: "锥形暗器",
  anqi2: "圆形暗器",
  anqi3: "针形暗器",
  shuangchi1: "双环",
  shuangchi2: "对剑",
  shuangchi3: "双钩",
  qinfa1: "古琴",
  qinfa2: "笛子",
};

export function getWeaponType(id) {
  return WEAPON_TYPES[id] || id;
}

// 角色属性 ID → 中文名
export const ATTR_NAMES = {
  age: "年龄",
  sex: "性别",
  exp: "经验",
  pot: "潜能",
  money: "碎银",
  gold: "黄金",
  looks: "容貌",
  luck: "福缘",
  str: "臂力",
  int: "悟性",
  con: "根骨",
  dex: "身法",
  currStr: "臂力",
  currInt: "悟性",
  currCon: "根骨",
  currDex: "身法",
  secStr: "臂力",
  secInt: "悟性",
  secCon: "根骨",
  secDex: "身法",
  jing: "精力",
  jingMax: "最大精力",
  qi: "气血",
  qiMax: "气血最大值",
  neili: "内力",
  neiliMax: "内力最大值",
  lv: "等级",
  yuanbao: "元宝",
  weight: "背包容量",
  zhengqi: "侠义正气",
  kill: "杀死人数",
  yueli: "江湖阅历",
  killPlayer: "杀玩家数",
  weiwang: "江湖威望",
  dead: "死亡次数",
  meili: "风度魅力",
  deadReason: "上次死因",
  jindu: "江湖进度",
  lunhui: "轮回次数",
  mengjing: "梦境层数",
  panshi: "判师次数",
  qiPercent: "气血上限",
  decorativeLimit: "装饰箱容量",
  meridianExp: "经脉经验",
  breathVal: "真气",
  leftRightFightExp: "左右互搏熟练度",
  meiyu: "江湖美誉",
  gongxiandian: "师门贡献点",
  yinpiao: "银票",
  zjjifen: "战绩积分",
  prestige: "师门声望",
  intimacy: "亲密度",
  dreamCoins: "梦境币",
  dreamPoints: "碎银",
  jiaozi: "游字令",
  emotion: "情绪",
  sober: "清醒值",
  pijuan: "疲倦值",
  zhounianqin_jf: "新春礼券",
  zhounianliquan: "七夕礼券",
  daily_point: "积分",
  mingbi: "冥币",
  baoyu: "宝玉",
  spcl: "饰品材料",
  yxjianghuling1: "江湖令",
  dreamYiYu: "梦内呓语",
  xiangnang: "香囊",
  zongheng: "雪矾",
  molizhu: "墨璃珠",
  anecdote: "轶闻",
  amartial: "武学要领",
  bmartial: "武学心得",
  cmartial: "武学至极",
  dmartial: "功法学识",
  baiduo: "白堕",
  canghuangling: "苍黄令",
  xizhaoling: "昔朝令",
  minditem1: "清心散",
  minditem2: "谧心丸",
  minditem3: "凝心露",
  minditem4: "聚心丹",
  miyao: "密钥",
  guanyingquan: "观影券",
  zhounianjf: "丹青",
  accpoint: "固身元气",
  characterPoint: "特性见解",
  lianGongTiLi: "笃志",
  ningshendan: "凝神丹",
  reputation: "个人功绩",
  diligent: "勤建之志",
  sgbpoint: "贡献昌盛度",
  gbpoint: "师门昌盛度",
  renown: "资历",
  bmaterials1: "三合土",
  bmaterials2: "青石砖",
  bmaterials3: "楠木",
  bmaterials4: "汉白玉",
  bmaterials5: "琉璃瓦",
  bmaterials6: "生漆",
  donate: "佳绩",
  featscount: "名绩点",
  paymaskmake: "鹿胶",
  ygpill: "养真丹",
  guidancecount: "师门指点次数",
};

export function getAttrName(attr) {
  if (!attr) return "";
  return ATTR_NAMES[attr] || "";
}

// 门派 ID → 中文名
const FAMILY_ALIAS = { xiaoyao: "tianshan", lingjiugong: "tianshan" };

export const FAMILY_NAMES = {
  baituoshan: "鸩羽山",
  dali: "天龙寺",
  emei: "峨眉派",
  gaibang: "丐帮",
  guanfu: "官府",
  gumu: "问情宫",
  haijing: "海鲸帮",
  huashan: "华山",
  jinqianbang: "财神帮",
  kongtong: "崆峒派",
  kunlun: "昆仑派",
  luoyue: "落月山庄",
  mingjiao: "明教",
  mizong: "雪山寺",
  murong: "燕氏皇族",
  quanzhen: "全真教",
  riyueshenjiao: "拜日教",
  seclusion: "归隐",
  shaolin: "少林派",
  tangmen: "唐门",
  taohuadao: "蓬莱岛",
  tianjingmen: "天竞门",
  tianshan: "虚渺宫",
  tiezhang: "伏龙山",
  wudang: "武当派",
  wudu: "万灵谷",
  xingxiu: "天狼教",
  yongyelou: "永夜楼",
  youming: "幽冥教",
  youxia: "散人",
};

export function getFamilyName(id) {
  if (!id) return "";
  return FAMILY_NAMES[FAMILY_ALIAS[id] || id] || "";
}

export const NPC_SKILLS = new Set([
  "chunfengkuaiyidaofa1",
  "yitianjianfa1",
  "tianmozhi1",
  "duzhuojianfa1",
  "luoyuejianfa1",
  "qingdianzilei1",
  "riyuelun1",
  "lunhuijianfa2",
  "baiyuanjianfa1",
  "weituochu",
  "jiangwangguibu",
  "lanyeshenzhang",
  "taixuangong2",
  "weijinxinfa",
  "wuqituifa",
  "bawangqiangfa",
  "mingyugong",
]);

export const WX_CLASSIFY = {
  quan: "拳",
  zhang: "掌",
  zhi: "指",
  zhua: "爪",
  tui: "腿",
};

export function getWxClassifyName(id) {
  return WX_CLASSIFY[id] || "";
}

// 资源名映射
export const RESOURCE_NAMES = {
  money: "碎银",
  gold: "黄金",
  yuanbao: "元宝",
  meiyu: "江湖美誉",
  deadCurrency: "亿冥币",
  mingbi: "亿冥币",
  zjjifen: "功绩",
  yinpiao: "银票",
  spcl: "饰品材料",
  jiaozi: "游字令",
  zhounianjf: "七夕礼券",
  dreamYiYu: "梦内呓语",
  xiangnang: "香囊",
  zongheng: "雪矾",
  molizhu: "墨璃珠",
  amartial: "武学要领",
  dmartial: "功法学识",
  bmartial: "武学心得",
  cmartial: "武学至极",
  xizhaoling: "昔朝令",
};

export function getResourceName(key) {
  return RESOURCE_NAMES[key] || key;
}

// 逻辑运算符 → 中文
const LOGIC_CN = {
  小于: "低于",
  小于等于: "不高于",
  等于: "为",
  大于等于: "不低于",
  大于: "高于",
  不等于: "",
};

// 技能准备类型
const METHOD_CN = { 1: "拳脚", 2: "内功", 3: "轻功", 4: "招架", 5: "兵器" };

export function getMethodCN(stype) {
  return METHOD_CN[stype] || "";
}

// 武学属性标签（卡片展示用）
export const SKILL_ATTRIBUTES = [
  { key: "potEfficiency", label: "潜能效率" },
  { key: "atk", label: "攻击力系数" },
  { key: "damRate", label: "伤害率系数" },
  { key: "powerAtkRate", label: "加力攻击系数" },
  { key: "powerDamRate", label: "加力伤害系数" },
  { key: "def", label: "防御系数" },
  { key: "parry", label: "招架系数" },
  { key: "hitRate", label: "命中率系数" },
  { key: "dodge", label: "闪避系数" },
  { key: "atkSpd", label: "攻速系数" },
  { key: "neili", label: "内力系数" },
  { key: "HpRate", label: "生命系数" },
  { key: "autoZhaoAtkDamageClass", label: "伤害类型" },
  { key: "zhaoJiaDefDamageParam", label: "招架减伤率" },
];

// 计算参数中文名（效果计算器用）
export const CALC_PARAM_NAMES = {
  currstr: "总臂力",
  currdex: "总身法",
  currcon: "总根骨",
  currStr: "总臂力",
  currDex: "总身法",
  currCon: "总根骨",
  z1: "技能系数",
  avgqiatk: "平均气血攻击",
  buff1Num: "自身增益数量",
  buff2Num: "自身减益或毒数量",
  buff3Num: "对方增益数量",
  buff4Num: "对方减益或毒数量",
  cost: "技能内力消耗",
  zhengqi: "侠义值",
  qimax: "当前气血上限",
  qiMax2: "对方气血上限",
  qi: "当前气血",
  qi2: "对方当前气血",
  neili: "当前内力",
  neili3: "对方当前内力",
  neiliMax: "内力上限",
  neiliMax3: "对方内力上限",
  roleLv: "人物等级",
  jingMax: "精力上限",
  currjqdamage: "单系谙技值",
  jqdamage: "双系谙技值",
  CN: "淬炼次数",
  YD1: "硬度",
  YD2: "硬度",
  wyindu: "硬度",
  wyindu2: "硬度",
  RD1: "韧性",
  RD2: "韧性",
  wrendu: "韧性",
  wrendu2: "韧性",
  W1: "武器重量",
  W2: "武器重量",
  wweight: "武器重量",
  wweight2: "武器重量",
  wdamage: "武器伤害力",
  wdamage2: "武器伤害力",
  nengGongRecoverNeiLiFactor: "内功内力系数",
  jiaLi: "当前加力值",
  jiaLiMax: "加力最大值",
  recordDamage: "受到实际伤害",
  shieldDeductedHP: "护盾吸收量",
  shieldCurrentHP: "护盾剩余吸收量",
  damageToHurt: "业果承血量",
  augment1num: "激昂层数（上限12）",
  augment2num: "隐元层数（上限32）",
  augment3num: "洞明层数（上限3）",
  augment5num: "隐元层数（上限32）",
  augment6num: "骁勇层数（上限60）",
  augment7num: "仙蛊层数（上限16）",
  augment8num: "着相层数（上限10）",
  augment10num: "长庚层数（上限5）",
  despairForce: "血志层数（上限15）",
  combatStack1num: "创伤层数（上限5）",
  combatStack1num2: "创伤层数（上限5）",
  combatStack2num: "蓄势层数（上限5）",
  combatStack3num: "【金】层数（上限3）",
  combatStack3num2: "【金】层数（上限3）",
  combatStack4num: "生辉层数（上限10）",
  combatStack5num: "天和层数（上限7）",
  combatStack5num2: "天和层数（上限7）",
  combatStack7num: "【镝】层数（上限7）",
  combatStack8num: "复还层数（上限6）",
  combatStack9num: "潜亏层数（上限5）",
  combatStack10num: "驱霆层数（上限10）",
  combatStack11num: "苏生层数（上限10）",
  combatStack13num: "速朽层数（上限40）",
  combatStack22num: "隐逸层数（上限5）",
  combatStack24num: "业因层数（上限10）",
  combatStack26num: "乱脉层数（上限9）",
  fragile4num: "毒蛊层数（上限16）",
  fragile5num: "和息层数（上限4）",
};

// 选择框参数配置
export const CALC_SELECT_PARAMS = [
  {
    pattern: /^augment4num$/,
    label: "【扬武】效果",
    options: [
      { label: "无", value: 0 },
      { label: "有", value: 18 },
    ],
    default: 0,
  },
  {
    pattern: /^combatStack6num$/,
    label: "【缓】效果",
    options: [
      { label: "无", value: 0 },
      { label: "有", value: 1 },
    ],
    default: 0,
  },
  {
    pattern: /^combatStack23num$/,
    label: "【心痴】层数",
    options: [
      { label: "三层", value: 3 },
      { label: "二层", value: 2 },
      { label: "一层", value: 1 },
    ],
    default: 3,
  },
  {
    pattern: /^combatStack27num$/,
    label: "【通明】效果",
    options: [
      { label: "无", value: 0 },
      { label: "有", value: 1 },
    ],
    default: 0,
  },
  {
    pattern: /^combatStack(14|15|16|17|19|20|21)num$/,
    label: "隐脉加成",
    options: [
      { label: "无", value: 0 },
      { label: "有", value: 1 },
    ],
    default: 0,
  },
];

// 神兵特性生效条件（conditiontype）
export const CONDITION_TYPE_NAMES = {
  0: "被动",
  2: "命中生效",
  3: "敌方招架生效",
};

export function getConditionTypeName(type) {
  return (
    CONDITION_TYPE_NAMES[type] ?? CONDITION_TYPE_NAMES[String(type)] ?? type
  );
}

// 神兵特性数值类型（conditiontype=0 时计算结果描述）
export const SPECIAL_NUMBER_NAMES = {
  HIT: "增加命中力",
  ATK: "增加攻击力",
  DEF: "增加防御力",
  DODGE: "增加闪避力",
  DAMAGE: "增加神兵伤害力",
  PARRY: "增加招架力",
};

export function getSpecialNumberName(sn) {
  return SPECIAL_NUMBER_NAMES[sn] || sn;
}

// 拳脚特性分支（peculiarityid 首位数字）
export const BRANCH_NAMES = {
  1: "拳",
  2: "掌",
  3: "爪",
  4: "指",
  5: "腿",
};

export function getBranchName(peculiarityid) {
  const first = String(peculiarityid).charAt(0);
  return BRANCH_NAMES[first] ?? first;
}

// 各分支对应的徽章样式
export const BRANCH_BADGES = {
  1: "badge-danger",
  2: "badge-warning",
  3: "badge-info",
  4: "badge-success",
  5: "badge-muted",
};

export function getBranchBadge(peculiarityid) {
  const first = String(peculiarityid).charAt(0);
  return BRANCH_BADGES[first] ?? "badge-muted";
}

export const colorMapping = {
  ColorCode: {
    ALS: {
      color: "cc.c3b(8,69,185)",
      id: "ALS",
      index: 52,
      type: "颜色",
    },
    ALSS: {
      color: "cc.c3b(38,115,38)",
      id: "ALSS",
      index: 54,
      type: "颜色",
    },
    AQS: {
      color: "cc.c3b(60,185,184)",
      id: "AQS",
      index: 53,
      type: "颜色",
    },
    AQUA: {
      color: "cc.c3b(0,255,255)",
      id: "AQUA",
      index: 36,
      type: "颜色",
    },
    ASHS: {
      color: "cc.c3b(132,109,19)",
      id: "ASHS",
      index: 55,
      type: "颜色",
    },
    BLK: {
      color: "cc.c3b(0,0,0)",
      id: "BLK",
      index: 24,
      type: "颜色",
    },
    BLU: {
      color: "cc.c3b(28,76,163)",
      id: "BLU",
      index: 4,
      type: "颜色",
    },
    CHSS: {
      color: "cc.c3b(255,255,255)",
      id: "CHSS",
      index: 66,
      type: "颜色",
    },
    CLS: {
      color: "cc.c3b(60,185,184)",
      id: "CLS",
      index: 54,
      type: "颜色",
    },
    CRO: {
      color: "cc.c3b(190,170,130)",
      id: "CRO",
      index: 25,
      type: "颜色",
    },
    CYN: {
      color: "cc.c3b(102,153,153)",
      id: "CYN",
      index: 6,
      type: "颜色",
    },
    DBL: {
      color: "cc.c3b(0,0,255)",
      id: "DBL",
      index: 46,
      type: "颜色",
    },
    DEO: {
      color: "cc.c3b(28,76,163)",
      id: "DEO",
      index: 27,
      type: "颜色",
    },
    DUY: {
      color: "cc.c3b(146,121,21)",
      id: "DUY",
      index: 33,
      type: "颜色",
    },
    DWT: {
      color: "cc.c3b(208,208,208)",
      id: "DWT",
      index: 19,
      type: "颜色",
    },
    DZS: {
      color: "cc.c3b(255,255,255)",
      id: "DZS",
      index: 61,
      type: "颜色",
    },
    FUCHSIA: {
      color: "cc.c3b(255,0,255)",
      id: "FUCHSIA",
      index: 42,
      type: "颜色",
    },
    GARNET: {
      color: "cc.c3b(255,0,0)",
      id: "GARNET",
      index: 39,
      type: "颜色",
    },
    GLD: {
      color: "cc.c3b(255,165,0)",
      id: "GLD",
      index: 23,
      type: "颜色",
    },
    GRA: {
      color: "cc.c3b(175,175,175)",
      id: "GRA",
      index: 34,
      type: "颜色",
    },
    GREE: {
      color: "cc.c3b(0,128,0)",
      id: "GREE",
      index: 37,
      type: "颜色",
    },
    GRN: {
      color: "cc.c3b(51,153,51)",
      id: "GRN",
      index: 2,
      type: "颜色",
    },
    HCS: {
      color: "cc.c3b(255,255,255)",
      id: "HCS",
      index: 62,
      type: "颜色",
    },
    HIB: {
      color: "cc.c3b(11,128,246)",
      id: "HIB",
      index: 12,
      type: "颜色",
    },
    HIC: {
      color: "cc.c3b(80,246,244)",
      id: "HIC",
      index: 14,
      type: "颜色",
    },
    HIG: {
      color: "cc.c3b(88,244,117)",
      id: "HIG",
      index: 10,
      type: "颜色",
    },
    HIM: {
      color: "cc.c3b(204,51,204)",
      id: "HIM",
      index: 13,
      type: "颜色",
    },
    HIR: {
      color: "cc.c3b(241,16,16)",
      id: "HIR",
      index: 9,
      type: "颜色",
    },
    HIW: {
      color: "cc.c3b(255,255,255)",
      id: "HIW",
      index: 15,
      type: "颜色",
    },
    HIY: {
      color: "cc.c3b(246,244,80)",
      id: "HIY",
      index: 11,
      type: "颜色",
    },
    HUB: {
      color: "cc.c3b(78,180,220)",
      id: "HUB",
      index: 32,
      type: "颜色",
    },
    JHX: {
      color: "cc.c3b(231,54,57)",
      id: "JHX",
      index: 21,
      type: "颜色",
    },
    JJLS: {
      color: "cc.c3b(60,185,184)",
      id: "JJLS",
      index: 53,
      type: "颜色",
    },
    LIME: {
      color: "cc.c3b(0,255,0)",
      id: "LIME",
      index: 43,
      type: "颜色",
    },
    LLS: {
      color: "cc.c3b(38,115,38)",
      id: "LLS",
      index: 62,
      type: "颜色",
    },
    LQS: {
      color: "cc.c3b(0,255,215)",
      id: "LQS",
      index: 59,
      type: "颜色",
    },
    LSB: {
      color: "cc.c4b(198,217,248,255)",
      id: "LSB",
      index: 49,
      type: "颜色",
    },
    LUC: {
      color: "cc.c3b(159,159,159)",
      id: "LUC",
      index: 18,
      opacity: 0,
      type: "颜色",
    },
    LZS: {
      color: "cc.c3b(135,0,255)",
      id: "LZS",
      index: 60,
      type: "颜色",
    },
    MAG: {
      color: "cc.c3b(153,51,153)",
      id: "MAG",
      index: 5,
      type: "颜色",
    },
    MAGENTA: {
      color: "cc.c4b(250,0,255,255)",
      id: "MAGENTA",
      index: 50,
      type: "颜色",
    },
    MAROON: {
      color: "cc.c3b(128,0,0)",
      id: "MAROON",
      index: 38,
      type: "颜色",
    },
    MLSS: {
      color: "cc.c3b(38,115,38)",
      id: "MLSS",
      index: 56,
      type: "颜色",
    },
    MMLS: {
      color: "cc.c3b(8,69,185)",
      id: "MMLS",
      index: 52,
      type: "颜色",
    },
    MZS: {
      color: "cc.c3b(165,43,43)",
      id: "MZS",
      index: 59,
      type: "颜色",
    },
    NAVY: {
      color: "cc.c3b(0,0,128)",
      id: "NAVY",
      index: 44,
      type: "颜色",
    },
    NAVYBLUE: {
      color: "cc.c4b(49,132,155,255)",
      id: "NAVYBLUE",
      index: 48,
      type: "颜色",
    },
    NCS: {
      color: "cc.c3b(255,255,255)",
      id: "NCS",
      index: 65,
      type: "颜色",
    },
    NOR: {
      id: "NOR",
      index: 17,
      type: "结束符",
    },
    NZS: {
      color: "cc.c3b(159,159,159)",
      id: "NZS",
      index: 60,
      type: "颜色",
    },
    OGR: {
      color: "cc.c4b(255,105,0)",
      id: "OGR",
      index: 51,
      type: "颜色",
    },
    OLIVE: {
      color: "cc.c3b(128,128,0)",
      id: "OLIVE",
      index: 41,
      type: "颜色",
    },
    ORA: {
      color: "cc.c3b(190,170,130)",
      id: "ORA",
      index: 26,
      type: "颜色",
    },
    ORN: {
      color: "cc.c3b(236,101,26)",
      id: "ORN",
      index: 29,
      type: "颜色",
    },
    PNK: {
      color: "cc.c3b(255,128,192)",
      id: "PNK",
      index: 8,
      type: "颜色",
    },
    PURPLE: {
      color: "cc.c3b(128,0,128)",
      id: "PURPLE",
      index: 47,
      type: "颜色",
    },
    QIZ: {
      color: "cc.c3b(85,54,198)",
      id: "QIZ",
      index: 31,
      type: "颜色",
    },
    RAN: {
      color: "cc.c3b(255,255,255)",
      id: "RAN",
      index: 16,
      type: "颜色",
    },
    RED: {
      color: "cc.c3b(219,57,57)",
      id: "RED",
      index: 1,
      type: "颜色",
    },
    SLSS: {
      color: "cc.c3b(132,109,19)",
      id: "SLSS",
      index: 57,
      type: "颜色",
    },
    TEAL: {
      color: "cc.c3b(0,128,128)",
      id: "TEAL",
      index: 45,
      type: "颜色",
    },
    WAT: {
      color: "cc.c3b(109,138,161)",
      id: "WAT",
      index: 35,
      type: "颜色",
    },
    WHT: {
      color: "cc.c3b(159,159,159)",
      id: "WHT",
      index: 7,
      type: "颜色",
    },
    XGR: {
      color: "cc.c3b(239,53,69)",
      id: "XGR",
      index: 30,
      type: "颜色",
    },
    XNS: {
      color: "cc.c3b(165,43,43)",
      id: "XNS",
      index: 57,
      type: "颜色",
    },
    YDK: {
      color: "cc.c3b(255,255,0)",
      id: "YDK",
      index: 40,
      type: "颜色",
    },
    YEL: {
      color: "cc.c3b(175,145,25)",
      id: "YEL",
      index: 3,
      type: "颜色",
    },
    YELL: {
      color: "cc.c3b(219,187,57)",
      id: "YELL",
      index: 28,
      type: "颜色",
    },
    YGH: {
      color: "cc.c3b(255,255,255)",
      id: "YGH",
      index: 63,
      type: "颜色",
    },
    ZCS: {
      color: "cc.c3b(255,255,255)",
      id: "ZCS",
      index: 64,
      type: "颜色",
    },
    ZHL: {
      color: "cc.c3b(218,187,59)",
      id: "ZHL",
      index: 22,
      type: "颜色",
    },
    ZHP: {
      color: "cc.c3b(58,222,91)",
      id: "ZHP",
      index: 20,
      type: "颜色",
    },
    ZHS: {
      color: "cc.c3b(185,184,60)",
      id: "ZHS",
      index: 56,
      type: "颜色",
    },
    ZLS: {
      color: "cc.c3b(185,184,60)",
      id: "ZLS",
      index: 61,
      type: "颜色",
    },
  },
};

export { LOGIC_CN };
