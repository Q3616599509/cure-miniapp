/**
 * Cure 种子数据 — 7大品类，每个品类20+商品，含分类、优惠券、门店
 * Run: node src/seed.js
 */
const path = require('path');

// Delete existing DB to start fresh, then import database module to create schema
const fs = require('fs');
const dbPath = path.resolve(__dirname, '..', 'data', 'cure.db');
const walPath = dbPath + '-wal';
const shmPath = dbPath + '-shm';
try { fs.unlinkSync(dbPath); } catch (_) {}
try { fs.unlinkSync(walPath); } catch (_) {}
try { fs.unlinkSync(shmPath); } catch (_) {}

// Import database — this creates all tables
const { db } = require('./database');

console.log('🌱 开始填充种子数据...\n');

// ── 分类数据 ──
const categories = [
  { id: 1, name: '咖啡茶饮', icon: '☕', sort: 1, type: 'instant' },
  { id: 2, name: '食品零食', icon: '🍪', sort: 2, type: 'both' },
  { id: 3, name: '家居日用', icon: '🏠', sort: 3, type: 'both' },
  { id: 4, name: '数码配件', icon: '📱', sort: 4, type: 'mall' },
  { id: 5, name: '美妆个护', icon: '💄', sort: 5, type: 'mall' },
  { id: 6, name: '服饰鞋包', icon: '👗', sort: 6, type: 'mall' },
  { id: 7, name: '图书文具', icon: '📚', sort: 7, type: 'mall' },
];
const insertCat = db.prepare('INSERT INTO categories (id, name, icon, sort, type) VALUES (?, ?, ?, ?, ?)');
for (const c of categories) insertCat.run(c.id, c.name, c.icon, c.sort, c.type);

// ── 商品数据 ──
const products = [
  // ═══ 1. 咖啡茶饮 (20 items) ═══
  { cat:1, name:'经典美式咖啡', desc:'精选阿拉比卡豆，醇厚顺滑', imgs:'["https://images.unsplash.com/photo-1551030173-122aabc4489c?w=400"]', price:22,sale_price:18,member_price:16,stock:999,sales:3280, specs:'[{"name":"温度","values":["热","冰"]},{"name":"杯型","values":["中杯","大杯"]}]',tags:'["热销","经典"]',is_hot:1,fulfillment:'pickup,delivery' },
  { cat:1,name:'拿铁咖啡', desc:'浓缩咖啡与丝滑牛奶的完美融合', imgs:'["https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=400"]', price:26,sale_price:22,member_price:20,stock:999,sales:2890, specs:'[{"name":"温度","values":["热","冰"]},{"name":"杯型","values":["中杯","大杯"]}]',tags:'["人气推荐"]',is_hot:1,fulfillment:'pickup,delivery' },
  { cat:1,name:'卡布奇诺', desc:'浓郁奶泡搭配浓缩咖啡', imgs:'["https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400"]', price:26,sale_price:22,member_price:20,stock:999,sales:2150, specs:'[{"name":"温度","values":["热","冰"]},{"name":"杯型","values":["中杯","大杯"]}]',tags:'["经典"]',fulfillment:'pickup,delivery' },
  { cat:1,name:'焦糖玛奇朵', desc:'甜美焦糖与香浓咖啡的邂逅', imgs:'["https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=400"]', price:30,sale_price:26,member_price:24,stock:999,sales:1920, specs:'[{"name":"温度","values":["热","冰"]},{"name":"杯型","values":["中杯","大杯"]}]',tags:'["甜蜜"]',fulfillment:'pickup,delivery' },
  { cat:1,name:'摩卡咖啡', desc:'巧克力与咖啡的双重诱惑', imgs:'["https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=400"]', price:30,sale_price:26,member_price:24,stock:999,sales:1670, specs:'[{"name":"温度","values":["热","冰"]},{"name":"杯型","values":["中杯","大杯"]}]',tags:'["新品"]',fulfillment:'pickup,delivery' },
  { cat:1,name:'抹茶拿铁', desc:'日式抹茶与鲜奶的清新组合', imgs:'["https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=400"]', price:28,sale_price:24,member_price:22,stock:999,sales:1450, specs:'[{"name":"温度","values":["热","冰"]},{"name":"杯型","values":["中杯","大杯"]}]',tags:'["清爽"]',fulfillment:'pickup,delivery' },
  { cat:1,name:'冰摇柠檬茶', desc:'鲜榨柠檬汁搭配红茶，清爽解暑', imgs:'["https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400"]', price:18,sale_price:15,member_price:14,stock:999,sales:3100, specs:'[{"name":"糖量","values":["全糖","半糖","无糖"]},{"name":"杯型","values":["中杯","大杯"]}]',tags:'["热销","夏日"]',is_hot:1,fulfillment:'pickup,delivery' },
  { cat:1,name:'满杯红柚', desc:'西柚果肉满满，维C爆棚', imgs:'["https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400"]', price:24,sale_price:20,member_price:18,stock:999,sales:2780, specs:'[{"name":"糖量","values":["全糖","半糖","无糖"]},{"name":"杯型","values":["中杯","大杯"]}]',tags:'["爆款"]',fulfillment:'pickup,delivery' },
  { cat:1,name:'芝芝莓莓', desc:'草莓果肉+芝士奶盖，双重口感', imgs:'["https://images.unsplash.com/photo-1568901839119-631a2b4b5c32?w=400"]', price:32,sale_price:28,member_price:26,stock:999,sales:2340, specs:'[{"name":"糖量","values":["全糖","半糖","无糖"]},{"name":"杯型","values":["中杯","大杯"]}]',tags:'["人气"]',fulfillment:'pickup,delivery' },
  { cat:1,name:'多肉葡萄', desc:'手剥巨峰葡萄，果肉看得见', imgs:'["https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400"]', price:32,sale_price:28,member_price:26,stock:999,sales:2010, specs:'[{"name":"糖量","values":["全糖","半糖","无糖"]},{"name":"杯型","values":["中杯","大杯"]}]',fulfillment:'pickup,delivery' },
  { cat:1,name:'热巧克力', desc:'比利时巧克力融化在热牛奶中', imgs:'["https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=400"]', price:24,sale_price:20,member_price:18,stock:999,sales:980, specs:'[{"name":"杯型","values":["中杯","大杯"]}]',fulfillment:'pickup,delivery' },
  { cat:1,name:'燕麦拿铁', desc:'植物基燕麦奶搭配浓缩咖啡', imgs:'["https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400"]', price:28,sale_price:24,member_price:22,stock:999,sales:1320, specs:'[{"name":"温度","values":["热","冰"]},{"name":"杯型","values":["中杯","大杯"]}]',tags:'["健康"]',fulfillment:'pickup,delivery' },
  { cat:1,name:'生椰拿铁', desc:'浓郁椰香与咖啡的奇妙碰撞', imgs:'["https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400"]', price:28,sale_price:24,member_price:22,stock:999,sales:2560, specs:'[{"name":"温度","values":["热","冰"]},{"name":"杯型","values":["中杯","大杯"]}]',tags:'["爆款"]',is_hot:1,fulfillment:'pickup,delivery' },
  { cat:1,name:'脏脏咖啡', desc:'浓缩咖啡倒入冰牛奶的视觉盛宴', imgs:'["https://images.unsplash.com/photo-1507133750040-4a8f570215b8?w=400"]', price:26,sale_price:22,member_price:20,stock:999,sales:870, specs:'[{"name":"杯型","values":["中杯","大杯"]}]',fulfillment:'pickup,delivery' },
  { cat:1,name:'冷萃咖啡', desc:'12小时低温萃取，口感纯净', imgs:'["https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=400"]', price:28,sale_price:24,member_price:22,stock:999,sales:1140, specs:'[{"name":"杯型","values":["中杯","大杯"]}]',fulfillment:'pickup,delivery' },
  { cat:1,name:'桃桃乌龙茶', desc:'蜜桃果粒+清香乌龙茶底', imgs:'["https://images.unsplash.com/photo-1556881286-fc6915169721?w=400"]', price:22,sale_price:18,member_price:16,stock:999,sales:1890, specs:'[{"name":"糖量","values":["全糖","半糖","无糖"]},{"name":"杯型","values":["中杯","大杯"]}]',fulfillment:'pickup,delivery' },
  { cat:1,name:'百香果双响炮', desc:'百香果+椰果+珍珠，口感丰富', imgs:'["https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400"]', price:20,sale_price:16,member_price:14,stock:999,sales:2430, specs:'[{"name":"糖量","values":["全糖","半糖","无糖"]}]',tags:'["人气"]',fulfillment:'pickup,delivery' },
  { cat:1,name:'芋泥波波奶茶', desc:'软糯芋泥+Q弹波波，冬日暖饮', imgs:'["https://images.unsplash.com/photo-1558857563-b371033873b8?w=400"]', price:26,sale_price:22,member_price:20,stock:999,sales:1560, specs:'[{"name":"温度","values":["热","常温"]},{"name":"糖量","values":["全糖","半糖","无糖"]}]',fulfillment:'pickup,delivery' },
  { cat:1,name:'美式三明治', desc:'烟熏火腿+芝士+生菜，现做热压', imgs:'["https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400"]', price:18,sale_price:15,member_price:14,stock:500,sales:920, specs:'[{"name":"加热","values":["需要","不需要"]}]',fulfillment:'pickup,delivery' },
  { cat:1,name:'提拉米苏蛋糕', desc:'意式经典提拉米苏，入口即化', imgs:'["https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400"]', price:32,sale_price:28,member_price:26,stock:300,sales:680, specs:'[{"name":"规格","values":["单人份","分享装"]}]',fulfillment:'pickup,delivery' },

  // ═══ 2. 食品零食 (20 items) ═══
  { cat:2,name:'每日坚果混合装', desc:'精选7种坚果果干，每日一包营养均衡', imgs:'["https://images.unsplash.com/photo-1600189020840-00a0c92940d8?w=400"]', price:89,sale_price:69,member_price:62,stock:500,sales:4560, tags:'["热销","健康"]',is_hot:1,fulfillment:'pickup,delivery,express' },
  { cat:2,name:'北海道鲜牛乳饼干', desc:'浓浓奶香，酥脆可口', imgs:'["https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400"]', price:28,sale_price:22,member_price:20,stock:800,sales:3200, tags:'["人气"]',fulfillment:'pickup,delivery,express' },
  { cat:2,name:'黑巧克力布朗尼', desc:'比利时黑巧含量72%，微苦醇厚', imgs:'["https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400"]', price:45,sale_price:36,member_price:32,stock:400,sales:2100, tags:'["精致"]',fulfillment:'pickup,delivery,express' },
  { cat:2,name:'芒果干200g', desc:'东南亚进口芒果，自然风干无添加', imgs:'["https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=400"]', price:32,sale_price:25,member_price:22,stock:600,sales:3890, is_hot:1,fulfillment:'pickup,delivery,express' },
  { cat:2,name:'海苔肉松卷', desc:'酥脆海苔包裹松软肉松，咸香可口', imgs:'["https://images.unsplash.com/photo-1627662055844-5a152e726dd3?w=400"]', price:36,sale_price:28,member_price:25,stock:500,sales:2670,fulfillment:'pickup,delivery,express' },
  { cat:2,name:'麻辣味牛肉干', desc:'四川风味，精选牛后腿肉，香辣有嚼劲', imgs:'["https://images.unsplash.com/photo-1624552182786-85425899752c?w=400"]', price:58,sale_price:45,member_price:40,stock:400,sales:1980,fulfillment:'pickup,delivery,express' },
  { cat:2,name:'凤梨酥礼盒', desc:'台湾传统工艺，酥皮包裹酸甜凤梨馅', imgs:'["https://images.unsplash.com/photo-1590080875515-8c411ece02e9?w=400"]', price:68,sale_price:55,member_price:49,stock:300,sales:1450, tags:'["礼盒"]',fulfillment:'express' },
  { cat:2,name:'有机燕麦片500g', desc:'澳洲进口燕麦，高纤维低GI', imgs:'["https://images.unsplash.com/photo-1614961233917-78ca24fad549?w=400"]', price:42,sale_price:35,member_price:32,stock:700,sales:2340, tags:'["健康"]',fulfillment:'express' },
  { cat:2,name:'混合口味果冻布丁', desc:'12枚装，芒果/草莓/蓝莓三味混合', imgs:'["https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400"]', price:26,sale_price:19,member_price:17,stock:600,sales:4120, is_hot:1,fulfillment:'pickup,delivery,express' },
  { cat:2,name:'炭烧腰果仁', desc:'微炭烧工艺，颗颗饱满酥脆', imgs:'["https://images.unsplash.com/photo-1600189020840-00a0c92940d8?w=400"]', price:38,sale_price:30,member_price:27,stock:500,sales:1870,fulfillment:'express' },
  { cat:2,name:'蔓越莓曲奇饼干', desc:'手工烘焙，酸甜蔓越莓搭配黄油曲奇', imgs:'["https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400"]', price:35,sale_price:28,member_price:25,stock:450,sales:1560,fulfillment:'express' },
  { cat:2,name:'薯条三兄弟', desc:'北海道风格，脆而不腻', imgs:'["https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400"]', price:48,sale_price:38,member_price:34,stock:350,sales:2340, tags:'["进口"]',fulfillment:'express' },
  { cat:2,name:'即食鸡胸肉', desc:'低脂高蛋白，健身代餐首选', imgs:'["https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400"]', price:15,sale_price:12,member_price:11,stock:800,sales:5230, is_hot:1,tags:'["健康","低脂"]',fulfillment:'pickup,delivery,express' },
  { cat:2,name:'抹茶夹心麻薯', desc:'日式抹茶粉包裹，软糯Q弹', imgs:'["https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400"]', price:22,sale_price:16,member_price:14,stock:550,sales:3450,fulfillment:'express' },
  { cat:2,name:'盐焗开心果', desc:'美国加州开心果，盐焗入味', imgs:'["https://images.unsplash.com/photo-1599724457509-43e10af3b023?w=400"]', price:55,sale_price:42,member_price:38,stock:400,sales:1340,fulfillment:'express' },
  { cat:2,name:'果蔬脆片', desc:'十种蔬果混合，非油炸更健康', imgs:'["https://images.unsplash.com/photo-1620706857370-e1b9770e8bb1?w=400"]', price:30,sale_price:24,member_price:22,stock:500,sales:2780, tags:'["健康"]',fulfillment:'express' },
  { cat:2,name:'黑芝麻丸', desc:'九蒸九晒古法工艺，养发补钙', imgs:'["https://images.unsplash.com/photo-1622485831126-4aed55f2b399?w=400"]', price:39,sale_price:32,member_price:29,stock:450,sales:1890, tags:'["养生"]',fulfillment:'express' },
  { cat:2,name:'进口速溶咖啡', desc:'哥伦比亚冻干咖啡，3秒速溶', imgs:'["https://images.unsplash.com/photo-1551030173-122aabc4489c?w=400"]', price:78,sale_price:59,member_price:53,stock:500,sales:3120, tags:'["进口"]',fulfillment:'express' },
  { cat:2,name:'蜂蜜柚子茶酱', desc:'韩国进口，温水冲泡即可享用', imgs:'["https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400"]', price:45,sale_price:35,member_price:32,stock:400,sales:1670,fulfillment:'express' },
  { cat:2,name:'纯牛奶1L装', desc:'澳洲全脂纯牛奶，浓郁奶香', imgs:'["https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400"]', price:18,sale_price:14,member_price:13,stock:900,sales:6780, is_hot:1,tags:'["热销"]',fulfillment:'pickup,delivery,express' },

  // ═══ 3. 家居日用 (20 items) ═══
  { cat:3,name:'竹纤维抽纸', desc:'原生竹浆，柔软亲肤，三层加厚，24包装', imgs:'["https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=400"]', price:69,sale_price:49,member_price:44,stock:800,sales:8920, is_hot:1,tags:'["热销","必备"]',fulfillment:'pickup,delivery,express' },
  { cat:3,name:'免洗手消毒凝胶', desc:'75%酒精，速干不粘手，便携装', imgs:'["https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400"]', price:25,sale_price:18,member_price:16,stock:900,sales:5670,fulfillment:'pickup,delivery,express' },
  { cat:3,name:'北欧风收纳盒三件套', desc:'简约设计，可叠放，节省空间', imgs:'["https://images.unsplash.com/photo-1603707192224-ecc88fe94e43?w=400"]', price:58,sale_price:42,member_price:38,stock:400,sales:2340, tags:'["家居"]',fulfillment:'express' },
  { cat:3,name:'香薰蜡烛礼盒', desc:'植物大豆蜡，持香30小时，四种香型可选', imgs:'["https://images.unsplash.com/photo-1602913010352-a5bd7b2c8ab8?w=400"]', price:88,sale_price:68,member_price:61,stock:300,sales:1560, tags:'["精致"]',fulfillment:'express' },
  { cat:3,name:'防滑衣架20个装', desc:'加宽加厚，防滑设计，挂衣不留痕', imgs:'["https://images.unsplash.com/photo-1612908592031-8e11ffa0c3e3?w=400"]', price:35,sale_price:28,member_price:25,stock:600,sales:3120, is_hot:1,fulfillment:'express' },
  { cat:3,name:'不锈钢保温杯', desc:'316不锈钢内胆，12小时保温，500ml', imgs:'["https://images.unsplash.com/photo-1579656592043-a20e25a4aa4b?w=400"]', price:128,sale_price:89,member_price:80,stock:400,sales:2670, tags:'["人气"]',fulfillment:'express' },
  { cat:3,name:'懒人抹布', desc:'干湿两用，可水洗重复使用，50片装', imgs:'["https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400"]', price:19,sale_price:15,member_price:14,stock:700,sales:6780, is_hot:1,fulfillment:'pickup,delivery,express' },
  { cat:3,name:'USB充电小夜灯', desc:'触摸调光，三档亮度，柔和暖光', imgs:'["https://images.unsplash.com/photo-1544711752-2c28c97865a5?w=400"]', price:45,sale_price:35,member_price:32,stock:500,sales:3450,fulfillment:'express' },
  { cat:3,name:'棉柔洗脸巾', desc:'加厚珍珠纹，干湿两用，80抽3包装', imgs:'["https://images.unsplash.com/photo-1611944212541-13cd4a9e97e8?w=400"]', price:42,sale_price:32,member_price:29,stock:600,sales:4560, tags:'["人气"]',fulfillment:'express' },
  { cat:3,name:'真空压缩袋套装', desc:'8件套+手泵，节省75%空间', imgs:'["https://images.unsplash.com/photo-1529154036614-a58a0cd89dac?w=400"]', price:55,sale_price:39,member_price:35,stock:350,sales:1890,fulfillment:'express' },
  { cat:3,name:'除湿盒干燥剂', desc:'衣柜鞋柜专用，吸湿防霉，12盒装', imgs:'["https://images.unsplash.com/photo-1563453824-6e3b1ccd8723?w=400"]', price:36,sale_price:28,member_price:25,stock:550,sales:2340,fulfillment:'express' },
  { cat:3,name:'北欧ins风抱枕', desc:'45x45cm，棉麻面料，含芯', imgs:'["https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=400"]', price:42,sale_price:32,member_price:29,stock:400,sales:2120,fulfillment:'express' },
  { cat:3,name:'多功能厨房剪刀', desc:'德国不锈钢，可拆卸清洗，剪骨开瓶', imgs:'["https://images.unsplash.com/photo-1590794055146-95ba5b8b5e06?w=400"]', price:48,sale_price:38,member_price:34,stock:450,sales:1670,fulfillment:'express' },
  { cat:3,name:'日式简约餐具套装', desc:'4人份，16件套，釉下彩陶瓷', imgs:'["https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=400"]', price:128,sale_price:99,member_price:89,stock:250,sales:1340, tags:'["精选"]',fulfillment:'express' },
  { cat:3,name:'除螨喷雾', desc:'天然植物配方，母婴可用，免洗免晒', imgs:'["https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?w=400"]', price:38,sale_price:29,member_price:26,stock:500,sales:2890,fulfillment:'express' },
  { cat:3,name:'硅胶保鲜盖6件套', desc:'食品级硅胶，弹性密封，可重复使用', imgs:'["https://images.unsplash.com/photo-1604335399105-a0c585fd81a1?w=400"]', price:28,sale_price:22,member_price:20,stock:600,sales:1980,fulfillment:'pickup,delivery,express' },
  { cat:3,name:'创意月球灯', desc:'3D打印，触控调光，浪漫床头灯', imgs:'["https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?w=400"]', price:78,sale_price:59,member_price:53,stock:300,sales:1230, tags:'["创意"]',fulfillment:'express' },
  { cat:3,name:'浴室防滑垫', desc:'硅藻土吸水，速干防霉，多色可选', imgs:'["https://images.unsplash.com/photo-1507652313519-d4e9174996dd?w=400"]', price:55,sale_price:42,member_price:38,stock:350,sales:2100,fulfillment:'express' },
  { cat:3,name:'粘毛器替换装', desc:'斜撕设计，粘力强劲，一撕即用，10卷装', imgs:'["https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400"]', price:25,sale_price:18,member_price:16,stock:700,sales:4560,fulfillment:'pickup,delivery,express' },
  { cat:3,name:'折叠购物袋', desc:'环保帆布材质，可折叠收纳，大容量', imgs:'["https://images.unsplash.com/photo-1544816155-12df9643f363?w=400"]', price:22,sale_price:16,member_price:14,stock:550,sales:2670, tags:'["环保"]',fulfillment:'express' },

  // ═══ 4. 数码配件 (20 items) ═══
  { cat:4,name:'快充数据线三合一', desc:'苹果/安卓/Type-C通用，120W超级快充', imgs:'["https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400"]', price:49,sale_price:35,member_price:32,stock:700,sales:7890, is_hot:1,tags:'["热销","必备"]',fulfillment:'express' },
  { cat:4,name:'无线蓝牙耳机', desc:'蓝牙5.3，ENC降噪，续航30小时', imgs:'["https://images.unsplash.com/photo-1590658268037-6bf12f032f55?w=400"]', price:199,sale_price:149,member_price:134,stock:400,sales:5670, is_hot:1,tags:'["爆款"]',fulfillment:'express' },
  { cat:4,name:'手机壳液态硅胶', desc:'全包防摔，亲肤手感，多色可选', imgs:'["https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=400"]', price:35,sale_price:25,member_price:22,stock:600,sales:4560,fulfillment:'express' },
  { cat:4,name:'10000mAh充电宝', desc:'轻薄便携，22.5W快充，数显电量', imgs:'["https://images.unsplash.com/photo-1609592806991-82cb9aba1e9d?w=400"]', price:128,sale_price:89,member_price:80,stock:450,sales:3450, tags:'["必备"]',fulfillment:'express' },
  { cat:4,name:'Type-C扩展坞', desc:'7合1，HDMI 4K输出，USB3.0，SD卡槽', imgs:'["https://images.unsplash.com/photo-1625723044792-44de16ccda62?w=400"]', price:168,sale_price:129,member_price:116,stock:300,sales:1890,fulfillment:'express' },
  { cat:4,name:'钢化膜两片装', desc:'9H硬度，高清透光，防指纹涂层', imgs:'["https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400"]', price:29,sale_price:19,member_price:17,stock:800,sales:6780, is_hot:1,fulfillment:'express' },
  { cat:4,name:'手机支架桌面款', desc:'铝合金材质，可折叠便携，多角度调节', imgs:'["https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400"]', price:38,sale_price:28,member_price:25,stock:500,sales:2340,fulfillment:'express' },
  { cat:4,name:'USB-C to Lightning线', desc:'MFi认证，2米编织线，不易缠绕', imgs:'["https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400"]', price:45,sale_price:35,member_price:32,stock:550,sales:3120,fulfillment:'pickup,express' },
  { cat:4,name:'车载手机支架', desc:'重力感应，一放即合，出风口通用', imgs:'["https://images.unsplash.com/photo-1618414074972-723c8314d3db?w=400"]', price:35,sale_price:25,member_price:22,stock:400,sales:2890,fulfillment:'express' },
  { cat:4,name:'无线充电板', desc:'15W快充，兼容iPhone/安卓，轻薄设计', imgs:'["https://images.unsplash.com/photo-1586816879360-004f5b0c51e5?w=400"]', price:78,sale_price:59,member_price:53,stock:350,sales:1780,fulfillment:'express' },
  { cat:4,name:'USB小风扇', desc:'三档风力，静音设计，可夹可立', imgs:'["https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?w=400"]', price:42,sale_price:32,member_price:29,stock:500,sales:3450, tags:'["夏日"]',fulfillment:'express' },
  { cat:4,name:'笔记本散热支架', desc:'6档角度调节，铝合金材质，镂空散热', imgs:'["https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400"]', price:89,sale_price:69,member_price:62,stock:300,sales:1230,fulfillment:'express' },
  { cat:4,name:'蓝牙音箱便携款', desc:'IPX7防水，20W大功率，TWS串联', imgs:'["https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400"]', price:168,sale_price:129,member_price:116,stock:250,sales:1560, tags:'["爆款"]',fulfillment:'express' },
  { cat:4,name:'SD存储卡128GB', desc:'U3 V30，读取170MB/s，4K录制', imgs:'["https://images.unsplash.com/photo-1597740985671-2a8a3b805d8a?w=400"]', price:128,sale_price:99,member_price:89,stock:350,sales:1980,fulfillment:'express' },
  { cat:4,name:'手机自拍杆三脚架', desc:'蓝牙遥控，三合一，1.7米伸缩', imgs:'["https://images.unsplash.com/photo-1545069518-22f8763385e3?w=400"]', price:58,sale_price:42,member_price:38,stock:400,sales:2340,fulfillment:'express' },
  { cat:4,name:'氮化镓充电器65W', desc:'三口快充，笔记本/手机/平板通用', imgs:'["https://images.unsplash.com/photo-1625403077010-3039f7be06eb?w=400"]', price:128,sale_price:99,member_price:89,stock:400,sales:2670, is_hot:1,tags:'["新品"]',fulfillment:'express' },
  { cat:4,name:'平板保护壳', desc:'全包防摔，智能休眠，多角度支架', imgs:'["https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400"]', price:58,sale_price:42,member_price:38,stock:350,sales:1890,fulfillment:'express' },
  { cat:4,name:'网线Cat7', desc:'万兆传输，双屏蔽，镀金接头，3米', imgs:'["https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400"]', price:35,sale_price:25,member_price:22,stock:500,sales:1450,fulfillment:'express' },
  { cat:4,name:'运动相机挂脖支架', desc:'柔性记忆合金，适配GoPro/Insta360', imgs:'["https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400"]', price:55,sale_price:39,member_price:35,stock:300,sales:890,fulfillment:'express' },
  { cat:4,name:'数据线收纳包', desc:'防水EVA材质，大容量，便携数码包', imgs:'["https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400"]', price:32,sale_price:22,member_price:20,stock:450,sales:1670,fulfillment:'express' },

  // ═══ 5. 美妆个护 (20 items) ═══
  { cat:5,name:'玻尿酸补水面膜', desc:'三重玻尿酸，密集补水，20片装', imgs:'["https://images.unsplash.com/photo-1570194065650-d99fb4ee8e45?w=400"]', price:89,sale_price:69,member_price:62,stock:600,sales:8920, is_hot:1,tags:'["热销"]',fulfillment:'express' },
  { cat:5,name:'氨基酸洁面乳', desc:'温和清洁不紧绷，敏肌可用，120g', imgs:'["https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?w=400"]', price:68,sale_price:49,member_price:44,stock:500,sales:5670, tags:'["人气"]',fulfillment:'express' },
  { cat:5,name:'哑光口红', desc:'丝绒雾面，持久不沾杯，8色可选', imgs:'["https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400"]', price:128,sale_price:89,member_price:80,stock:400,sales:4560, is_hot:1,fulfillment:'express' },
  { cat:5,name:'防晒霜SPF50+', desc:'清爽不油腻，物理+化学双重防晒', imgs:'["https://images.unsplash.com/photo-1557205397-f3e5bb959968?w=400"]', price:98,sale_price:79,member_price:71,stock:500,sales:3890, tags:'["夏日必备"]',fulfillment:'express' },
  { cat:5,name:'眼霜淡化黑眼圈', desc:'咖啡因成分，改善浮肿暗沉，15g', imgs:'["https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=400"]', price:158,sale_price:119,member_price:107,stock:300,sales:2340,fulfillment:'express' },
  { cat:5,name:'洗发水无硅油', desc:'控油蓬松，茶树精油香氛，500ml', imgs:'["https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=400"]', price:79,sale_price:59,member_price:53,stock:600,sales:4120, is_hot:1,fulfillment:'express' },
  { cat:5,name:'美白精华液', desc:'烟酰胺+维C，淡斑提亮，30ml', imgs:'["https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400"]', price:188,sale_price:139,member_price:125,stock:250,sales:1980, tags:'["精华"]',fulfillment:'express' },
  { cat:5,name:'保湿喷雾', desc:'温泉水配方，随时补水，150ml', imgs:'["https://images.unsplash.com/photo-1572669855116-43e4fba87e81?w=400"]', price:58,sale_price:39,member_price:35,stock:550,sales:3450,fulfillment:'express' },
  { cat:5,name:'卸妆水', desc:'温和不刺激，眼唇脸三合一，500ml', imgs:'["https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=400"]', price:68,sale_price:49,member_price:44,stock:500,sales:3120, tags:'["必备"]',fulfillment:'express' },
  { cat:5,name:'润唇膏套装', desc:'蜂蜜+芦荟双支装，深层滋润', imgs:'["https://images.unsplash.com/photo-1556543697-2fb00d31948a?w=400"]', price:38,sale_price:28,member_price:25,stock:600,sales:2670,fulfillment:'express' },
  { cat:5,name:'眉笔双头设计', desc:'防水防汗，三角笔芯，自然显色', imgs:'["https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400"]', price:35,sale_price:25,member_price:22,stock:500,sales:4120,fulfillment:'express' },
  { cat:5,name:'眼影盘12色', desc:'大地色系+玫瑰色系，哑光珠光混搭', imgs:'["https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=400"]', price:128,sale_price:89,member_price:80,stock:350,sales:2340, tags:'["精致"]',fulfillment:'express' },
  { cat:5,name:'发膜修护', desc:'角蛋白修护，染烫受损救星，500g', imgs:'["https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=400"]', price:68,sale_price:49,member_price:44,stock:400,sales:1890,fulfillment:'express' },
  { cat:5,name:'沐浴露香氛', desc:'持久留香，泡沫绵密，500ml', imgs:'["https://images.unsplash.com/photo-1576426863848-c21f53c60b19?w=400"]', price:58,sale_price:42,member_price:38,stock:550,sales:3120,fulfillment:'express' },
  { cat:5,name:'美妆蛋套装', desc:'不吃粉，干湿两用，含收纳架', imgs:'["https://images.unsplash.com/photo-1596704017254-9b121068fb31?w=400"]', price:28,sale_price:19,member_price:17,stock:600,sales:4560,fulfillment:'express' },
  { cat:5,name:'护手霜礼盒', desc:'6种香型，滋润不油腻，圣诞礼盒', imgs:'["https://images.unsplash.com/photo-1617897903246-719242758050?w=400"]', price:68,sale_price:49,member_price:44,stock:350,sales:1780, tags:'["礼盒"]',fulfillment:'express' },
  { cat:5,name:'CC霜气垫', desc:'轻薄遮瑕，水光妆效，含替换装', imgs:'["https://images.unsplash.com/photo-1590156393845-04fe08dfa7b1?w=400"]', price:138,sale_price:99,member_price:89,stock:300,sales:1560,fulfillment:'express' },
  { cat:5,name:'散粉定妆', desc:'透明哑光，控油持妆8小时', imgs:'["https://images.unsplash.com/photo-1631214524020-7e18db9a8f92?w=400"]', price:78,sale_price:59,member_price:53,stock:400,sales:2340,fulfillment:'express' },
  { cat:5,name:'去角质啫喱', desc:'温和去死皮，含果酸成分，150ml', imgs:'["https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400"]', price:55,sale_price:39,member_price:35,stock:450,sales:1450,fulfillment:'express' },
  { cat:5,name:'美容仪导入导出', desc:'超声波+EMS微电流，提拉紧致', imgs:'["https://images.unsplash.com/photo-1590439471364-192aa70c0b53?w=400"]', price:388,sale_price:269,member_price:242,stock:150,sales:890, tags:'["黑科技"]',is_new:1,fulfillment:'express' },

  // ═══ 6. 服饰鞋包 (20 items) ═══
  { cat:6,name:'纯棉短袖T恤', desc:'新疆长绒棉，200g重磅，多色可选', imgs:'["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400"]', price:128,sale_price:79,member_price:71,stock:500,sales:10230, is_hot:1,tags:'["热销","经典"]',fulfillment:'express' },
  { cat:6,name:'帆布鞋经典款', desc:'硫化工艺，防滑耐磨，百搭款', imgs:'["https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400"]', price:168,sale_price:119,member_price:107,stock:400,sales:6780, is_hot:1,tags:'["经典"]',fulfillment:'express' },
  { cat:6,name:'帆布托特包', desc:'大容量通勤包，内置拉链暗袋', imgs:'["https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400"]', price:89,sale_price:59,member_price:53,stock:350,sales:4120, tags:'["人气"]',fulfillment:'express' },
  { cat:6,name:'防晒棒球帽', desc:'UPF50+，透气速干，可调节头围', imgs:'["https://images.unsplash.com/photo-1588850561407-ed78c282e3d6?w=400"]', price:58,sale_price:38,member_price:34,stock:550,sales:3450, tags:'["夏日"]',fulfillment:'express' },
  { cat:6,name:'运动短裤', desc:'速干面料，弹力腰带，运动休闲两穿', imgs:'["https://images.unsplash.com/photo-1565693413579-8ff3fdcf082c?w=400"]', price:98,sale_price:69,member_price:62,stock:450,sales:3120,fulfillment:'express' },
  { cat:6,name:'连帽卫衣', desc:'加绒保暖，宽松版型，情侣款', imgs:'["https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400"]', price:168,sale_price:119,member_price:107,stock:400,sales:2780,fulfillment:'express' },
  { cat:6,name:'双肩背包', desc:'防泼水尼龙，电脑隔层，USB充电口', imgs:'["https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400"]', price:198,sale_price:149,member_price:134,stock:300,sales:2340, tags:'["必备"]',fulfillment:'express' },
  { cat:6,name:'冰丝防晒袖套', desc:'UPF50+，凉感面料，触肤降温', imgs:'["https://images.unsplash.com/photo-1618354691373-d851c5c3a588?w=400"]', price:25,sale_price:18,member_price:16,stock:800,sales:5670, is_hot:1,tags:'["热销","夏日"]',fulfillment:'express' },
  { cat:6,name:'棉麻阔腿裤', desc:'垂感面料，松紧腰头，显瘦舒适', imgs:'["https://images.unsplash.com/photo-1594938298603-c812157b5e54?w=400"]', price:138,sale_price:89,member_price:80,stock:350,sales:1980,fulfillment:'express' },
  { cat:6,name:'运动腰包', desc:'防水面料，可调节松紧，跑步必备', imgs:'["https://images.unsplash.com/photo-1576873601810-e91efcc1451f?w=400"]', price:38,sale_price:28,member_price:25,stock:450,sales:2890,fulfillment:'express' },
  { cat:6,name:'莫代尔家居服', desc:'柔软亲肤，空调房必备，情侣款', imgs:'["https://images.unsplash.com/photo-1434389677669-e08b4cda3b3f?w=400"]', price:128,sale_price:89,member_price:80,stock:400,sales:2340,fulfillment:'express' },
  { cat:6,name:'潮流斜挎包', desc:'机能风设计，多口袋，潮人必备', imgs:'["https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400"]', price:78,sale_price:55,member_price:49,stock:300,sales:1670, tags:'["潮品"]',fulfillment:'express' },
  { cat:6,name:'牛仔短裤', desc:'高腰A字版型，夏季百搭', imgs:'["https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400"]', price:118,sale_price:79,member_price:71,stock:350,sales:2890,fulfillment:'express' },
  { cat:6,name:'薄款丝巾', desc:'真丝质感，防晒披肩两用，多花色', imgs:'["https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=400"]', price:58,sale_price:38,member_price:34,stock:400,sales:1450,fulfillment:'express' },
  { cat:6,name:'袜子纯棉5双装', desc:'新疆长绒棉，中筒船袜混搭', imgs:'["https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=400"]', price:38,sale_price:28,member_price:25,stock:600,sales:4560, is_hot:1,fulfillment:'express' },
  { cat:6,name:'复古圆形墨镜', desc:'偏光镜片，UV400防护，明星同款', imgs:'["https://images.unsplash.com/photo-1577803645773-f96470509666?w=400"]', price:88,sale_price:59,member_price:53,stock:300,sales:1980,fulfillment:'express' },
  { cat:6,name:'瑜伽运动内衣', desc:'高支撑性，透气速干，交叉美背', imgs:'["https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=400"]', price:98,sale_price:69,member_price:62,stock:350,sales:2340, tags:'["运动"]',fulfillment:'express' },
  { cat:6,name:'真皮卡包', desc:'头层牛皮，20卡位，小巧便携', imgs:'["https://images.unsplash.com/photo-1606503825005-349a26e13a5c?w=400"]', price:78,sale_price:55,member_price:49,stock:250,sales:1230,fulfillment:'express' },
  { cat:6,name:'纯色围巾', desc:'羊绒混纺，冬季保暖，多色可选', imgs:'["https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=400"]', price:98,sale_price:69,member_price:62,stock:300,sales:1670,fulfillment:'express' },
  { cat:6,name:'弹力打底裤', desc:'高腰收腹，蜜桃臀设计，四季可穿', imgs:'["https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=400"]', price:68,sale_price:45,member_price:40,stock:450,sales:3450, is_hot:1,fulfillment:'express' },

  // ═══ 7. 图书文具 (20 items) ═══
  { cat:7,name:'《人类简史》', desc:'尤瓦尔·赫拉利畅销力作，从动物到上帝', imgs:'["https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400"]', price:68,sale_price:49,member_price:44,stock:400,sales:5670, is_hot:1,tags:'["畅销"]',fulfillment:'express' },
  { cat:7,name:'方格笔记本5本装', desc:'A5尺寸，80g道林纸，不透墨', imgs:'["https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=400"]', price:32,sale_price:22,member_price:20,stock:600,sales:4560, is_hot:1,fulfillment:'express' },
  { cat:7,name:'钢笔墨水礼盒', desc:'德国进口，非碳素不堵笔，8色套装', imgs:'["https://images.unsplash.com/photo-1560787313-5dff3307e257?w=400"]', price:78,sale_price:59,member_price:53,stock:350,sales:2340, tags:'["礼盒"]',fulfillment:'express' },
  { cat:7,name:'手账本套装', desc:'活页设计，含贴纸胶带，少女心', imgs:'["https://images.unsplash.com/photo-1517842645767-c639042777db?w=400"]', price:58,sale_price:42,member_price:38,stock:400,sales:3120, tags:'["人气"]',fulfillment:'express' },
  { cat:7,name:'《被讨厌的勇气》', desc:'阿德勒心理学通俗读物，自我启发经典', imgs:'["https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400"]', price:49,sale_price:35,member_price:32,stock:450,sales:3890, is_hot:1,fulfillment:'express' },
  { cat:7,name:'彩色马克笔24色', desc:'双头设计，酒精性墨水，快干防水', imgs:'["https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400"]', price:48,sale_price:35,member_price:32,stock:500,sales:2670,fulfillment:'express' },
  { cat:7,name:'《三体》全集', desc:'刘慈欣科幻巨著，雨果奖获奖作品', imgs:'["https://images.unsplash.com/photo-1618666012174-83b441c0bc76?w=400"]', price:98,sale_price:69,member_price:62,stock:350,sales:4560, is_hot:1,tags:'["经典"]',fulfillment:'express' },
  { cat:7,name:'磁性书签', desc:'莫兰迪配色，一枚多用，12枚装', imgs:'["https://images.unsplash.com/photo-1524578271613-d550eacf6090?w=400"]', price:18,sale_price:12,member_price:11,stock:700,sales:5670, is_hot:1,fulfillment:'express' },
  { cat:7,name:'素描本A4', desc:'200g加厚纸，双面可用，50张', imgs:'["https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400"]', price:28,sale_price:22,member_price:20,stock:500,sales:1890,fulfillment:'express' },
  { cat:7,name:'《枪炮、病菌与钢铁》', desc:'人类社会发展史经典，普利策奖', imgs:'["https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=400"]', price:78,sale_price:55,member_price:49,stock:300,sales:2340, tags:'["经典"]',fulfillment:'express' },
  { cat:7,name:'标签打印机', desc:'蓝牙连接，APP编辑，热敏不褪色', imgs:'["https://images.unsplash.com/photo-1563986768609-322da13575f2?w=400"]', price:168,sale_price:129,member_price:116,stock:200,sales:1560, tags:'["新品"]',is_new:1,fulfillment:'express' },
  { cat:7,name:'便利贴套装', desc:'莫兰迪色系，多尺寸组合，黏性适中', imgs:'["https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400"]', price:15,sale_price:9,member_price:8,stock:600,sales:6780, is_hot:1,fulfillment:'express' },
  { cat:7,name:'《思考，快与慢》', desc:'诺贝尔经济学奖得主丹尼尔·卡尼曼力作', imgs:'["https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400"]', price:69,sale_price:49,member_price:44,stock:350,sales:2120,fulfillment:'express' },
  { cat:7,name:'铅笔36支装', desc:'HB硬度，原木笔杆，不易断芯', imgs:'["https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=400"]', price:25,sale_price:18,member_price:16,stock:550,sales:3450,fulfillment:'express' },
  { cat:7,name:'桌面收纳笔筒', desc:'竹木材质，三格分类，文艺复古', imgs:'["https://images.unsplash.com/photo-1585336261022-680e295ce3fe?w=400"]', price:38,sale_price:28,member_price:25,stock:400,sales:1980,fulfillment:'express' },
  { cat:7,name:'《小王子》精装版', desc:'圣埃克苏佩里经典，全彩插图', imgs:'["https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400"]', price:42,sale_price:32,member_price:29,stock:400,sales:3890, is_hot:1,tags:'["经典"]',fulfillment:'express' },
  { cat:7,name:'透明文件袋10个装', desc:'A4尺寸，加厚防水，按扣设计', imgs:'["https://images.unsplash.com/photo-1606761568499-6d2451b23c66?w=400"]', price:22,sale_price:15,member_price:14,stock:600,sales:4120,fulfillment:'express' },
  { cat:7,name:'《原则》', desc:'瑞·达利欧人生与工作原则，桥水基金创始人', imgs:'["https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?w=400"]', price:88,sale_price:59,member_price:53,stock:300,sales:1780,fulfillment:'express' },
  { cat:7,name:'贴纸套装200张', desc:'手账|日记|装饰，6种图案混合', imgs:'["https://images.unsplash.com/photo-1613294326794-e7c74fe886e2?w=400"]', price:16,sale_price:11,member_price:10,stock:550,sales:5670, is_hot:1,fulfillment:'express' },
  { cat:7,name:'可擦笔6支装', desc:'温控墨水，写错可擦，学生必备', imgs:'["https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=400"]', price:28,sale_price:19,member_price:17,stock:500,sales:3120, tags:'["实用"]',fulfillment:'express' },
];

const insertProduct = db.prepare(`
  INSERT INTO products (category_id, name, description, images, price, sale_price, member_price, stock, sales, specs, tags, is_hot, is_new, fulfillment)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertAll = db.transaction(() => {
  for (const p of products) {
    insertProduct.run(p.cat, p.name, p.desc, p.imgs, p.price, p.sale_price,
      p.member_price || Math.round(p.sale_price * 0.9), p.stock, p.sales,
      p.specs || '[]', p.tags || '[]', p.is_hot || 0, p.is_new || 0, p.fulfillment || 'express');
  }
});
insertAll();
console.log(`✅ 已插入 ${products.length} 个商品`);

// ── 优惠券 ──
const coupons = [
  { name:'新人专享券', type:'full_reduction', threshold:50, value:15, total_count:9999, valid_days:30, desc:'新用户首单满50减15' },
  { name:'满100减20', type:'full_reduction', threshold:100, value:20, total_count:5000, valid_days:30, desc:'全场通用，满100减20' },
  { name:'满200减50', type:'full_reduction', threshold:200, value:50, total_count:3000, valid_days:30, desc:'全场通用，满200减50' },
  { name:'8折优惠券', type:'discount', threshold:0, value:8, total_count:2000, valid_days:15, desc:'全场8折（特价商品除外）' },
  { name:'免运费券', type:'free_delivery', threshold:0, value:0, total_count:5000, valid_days:30, desc:'免配送费一次' },
  { name:'满30减8', type:'full_reduction', threshold:30, value:8, total_count:8000, valid_days:15, desc:'点单专享，满30减8' },
];
const insertCoupon = db.prepare('INSERT INTO coupons (name, type, threshold, value, total_count, valid_days, description) VALUES (?, ?, ?, ?, ?, ?, ?)');
for (const c of coupons) insertCoupon.run(c.name, c.type, c.threshold, c.value, c.total_count, c.valid_days, c.desc);
console.log(`✅ 已插入 ${coupons.length} 张优惠券`);

// ── 门店 ──
const stores = [
  { name:'Cure 科技园店', address:'深圳市南山区科技园南路88号A座1层', lat:22.5362, lng:113.9558, phone:'0755-26668888', hours:'07:00-22:00' },
  { name:'Cure 华强北店', address:'深圳市福田区华强北路1019号', lat:22.5478, lng:114.0855, phone:'0755-83668888', hours:'08:00-21:00' },
  { name:'Cure 东门老街店', address:'深圳市罗湖区东门中路2088号', lat:22.5469, lng:114.1175, phone:'0755-82228888', hours:'09:00-22:30' },
  { name:'Cure 海岸城店', address:'深圳市南山区文心四路34号海岸城B1', lat:22.5168, lng:113.9376, phone:'0755-86558888', hours:'10:00-22:00' },
  { name:'Cure 宝安中心店', address:'深圳市宝安区创业一路1006号', lat:22.5550, lng:113.8850, phone:'0755-27888888', hours:'08:00-21:30' },
];
const insertStore = db.prepare('INSERT INTO stores (name, address, latitude, longitude, phone, hours) VALUES (?, ?, ?, ?, ?, ?)');
for (const s of stores) insertStore.run(s.name, s.address, s.lat, s.lng, s.phone, s.hours);
console.log(`✅ 已插入 ${stores.length} 家门店`);

// ── 管理员用户 ──
// 创建超级管理员和门店经理账号
// 开发环境下，openid 用作登录凭证
const adminUsers = [
  { openid: 'admin_super', nickname: '超级管理员', role: 'super_admin', level: 3, growth: 5000, points: 9999 },
  { openid: 'admin_store', nickname: '门店经理', role: 'store_manager', level: 2, growth: 2000, points: 5000 },
  { openid: 'admin_op', nickname: '运营小张', role: 'operator', level: 1, growth: 500, points: 1000 },
];
const insertAdmin = db.prepare('INSERT INTO users (openid, nickname, avatar_url, role, level, growth, points) VALUES (?, ?, ?, ?, ?, ?, ?)');
for (const u of adminUsers) {
  insertAdmin.run(u.openid, u.nickname, '', u.role, u.level, u.growth, u.points);
}
console.log(`✅ 已创建 ${adminUsers.length} 个管理员账号`);
console.log('   管理员登录: 在管理后台使用昵称 "超级管理员" / "门店经理" / "运营小张" 登录');

console.log('\n🎉 种子数据填充完成！');
process.exit(0);
