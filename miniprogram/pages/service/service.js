// pages/service/service.js — AI Smart Customer Service
const app = getApp();

// ── AI Smart Reply Engine ──
// Pattern: [keywords] → { reply, followUp? }
const SMART_REPLIES = [
  {
    keys: ['订单', '买了', '下单', '购买', 'order'],
    reply: '您好！请提供您的订单编号，我可以帮您查询订单状态、物流信息或处理售后问题 🛒',
    followUp: '查询订单',
  },
  {
    keys: ['发货', '物流', '快递', 'ship', 'delivery', '送到', '到哪'],
    reply: '您的订单发货后我们会第一时间推送物流信息。通常下单后 24 小时内发货，您可以在「我的 → 我的订单」中查看实时物流状态 📦',
    followUp: '查物流',
  },
  {
    keys: ['退货', '退款', '退换', 'return', 'refund', '取消订单', '取消'],
    reply: '如需退货/退款，请在「我的订单」中找到对应订单，点击「申请售后」。我们的退款将在收到退货后 1-3 个工作日内原路返回 💰',
    followUp: '申请售后',
  },
  {
    keys: ['门店', '地址', '位置', 'store', 'location', '在哪', '哪里', '定位'],
    reply: '您可以在首页或点单页面查看附近的 Cure 门店。选择门店后可以查看详细地址、营业时间和导航路线 📍',
    followUp: '查看门店',
  },
  {
    keys: ['会员', '积分', '成长值', '等级', 'vip', 'member', '优惠'],
    reply: 'Cure 会员分为普通、银卡、金卡和钻石四个等级。消费可获得积分和成长值，积分可在积分商城兑换好礼，高等级会员享专属折扣 🎁',
    followUp: '积分商城',
  },
  {
    keys: ['优惠券', 'coupon', '折扣', '满减'],
    reply: '优惠券可在「我的 → 优惠券」中查看。新用户注册即送新人专享券，参与活动也有机会获得限量优惠券哦 🎫',
    followUp: '领券',
  },
  {
    keys: ['客服', '人工', '热线', '电话', '投诉', '建议', '反馈'],
    reply: '如需人工客服，请拨打客服热线 400-XXX-XXXX（工作日 9:00-21:00），或在此描述您的问题，我会尽力帮您解决 💚',
  },
  {
    keys: ['支付', '付款', '微信支付', 'pay', '扣款', '价格', '多少钱'],
    reply: 'Cure 支持微信支付，支付过程由微信支付全程保障，安全可靠。如需查询扣款详情，请在微信支付账单中查看 🔒',
  },
  {
    keys: ['hi', 'hello', '你好', '您好', '嗨', '在吗', '在么'],
    reply: '您好！我是 Cure 智能客服小 C，很高兴为您服务 😊 您可以问我关于订单、物流、门店、会员等相关问题～',
    followUp: '常见问题',
  },
];

// Default reply when no keywords match
const DEFAULT_REPLY = '很抱歉，我暂时无法理解您的问题 😅\n\n您可以尝试以下方式：\n• 换个说法描述您的问题\n• 拨打客服热线 400-XXX-XXXX\n• 在「意见反馈」中提交详细说明\n\n我会尽快为您处理！';

// Quick FAQ suggestions
const QUICK_FAQS = [
  { text: '如何查询订单状态？', query: '查询订单' },
  { text: '怎么退货退款？', query: '退货退款' },
  { text: '门店在哪里？', query: '门店地址' },
  { text: '会员有什么权益？', query: '会员权益' },
  { text: '优惠券怎么用？', query: '优惠券' },
  { text: '多久能发货？', query: '发货时间' },
];

function getSmartReply(message) {
  const msg = message.toLowerCase();
  let bestMatch = null;

  for (const rule of SMART_REPLIES) {
    for (const key of rule.keys) {
      if (msg.includes(key.toLowerCase())) {
        bestMatch = rule;
        break;
      }
    }
    if (bestMatch) break;
  }

  return bestMatch || { reply: DEFAULT_REPLY };
}

Page({
  data: {
    messages: [],
    inputValue: '',
    showQuickFaqs: true,
    scrollToView: '',
    isTyping: false,
  },

  onLoad() {
    // Welcome message
    this.addBotMessage(
      '您好！我是 Cure 智能客服小 C 💚\n\n我可以帮您解答：\n• 📦 订单与物流\n• 🔄 退换货流程\n• 📍 门店地址\n• 👑 会员权益\n• 🎫 优惠券使用\n\n请直接输入问题，我会快速为您解答～'
    );
  },

  // ── Input ──
  onInputChange(e) {
    this.setData({ inputValue: e.detail.value });
  },

  async onSend() {
    const text = this.data.inputValue.trim();
    if (!text) return;

    // Add user message
    this.addUserMessage(text);
    this.setData({ inputValue: '', showQuickFaqs: false, isTyping: true });

    // Simulate AI thinking delay
    await this.delay(600 + Math.random() * 600);
    this.setData({ isTyping: false });

    // Get smart reply
    const { reply, followUp } = getSmartReply(text);
    this.addBotMessage(reply, followUp);
  },

  // ── Quick FAQ ──
  onFaqTap(e) {
    const { query } = e.currentTarget.dataset;
    this.addUserMessage(query);
    this.setData({ showQuickFaqs: false, isTyping: true });

    setTimeout(() => {
      this.setData({ isTyping: false });
      const { reply, followUp } = getSmartReply(query);
      this.addBotMessage(reply, followUp);
    }, 600 + Math.random() * 400);
  },

  // ── Follow-up action ──
  onFollowUp(e) {
    const { action } = e.currentTarget.dataset;
    switch (action) {
      case '查询订单':
      case '查物流':
      case '申请售后':
        wx.switchTab({ url: '/pages/user/user' });
        break;
      case '查看门店':
        wx.switchTab({ url: '/pages/order-now/order-now' });
        break;
      case '积分商城':
        wx.navigateTo({ url: '/pages/points/points' });
        break;
      case '领券':
        wx.navigateTo({ url: '/pages/coupons/coupons' });
        break;
      case '常见问题':
        this.setData({ showQuickFaqs: true });
        break;
      default:
        break;
    }
  },

  // ── Helpers ──
  addUserMessage(text) {
    const msg = { id: this.msgId(), type: 'user', text, time: this.now() };
    const messages = [...this.data.messages, msg];
    this.setData({ messages, scrollToView: msg.id });
  },

  addBotMessage(text, followUp) {
    const msg = { id: this.msgId(), type: 'bot', text, time: this.now(), followUp };
    const messages = [...this.data.messages, msg];
    this.setData({ messages, scrollToView: msg.id });
  },

  msgId() {
    return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  },

  now() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  },

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  // ── Call Customer Service Hotline ──
  onCallService() {
    wx.makePhoneCall({
      phoneNumber: '4000000000', // Replace with real hotline
      fail: () => {
        wx.showToast({ title: '拨号失败', icon: 'none' });
      },
    });
  },
});
