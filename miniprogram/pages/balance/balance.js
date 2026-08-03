// pages/balance/balance.js — Account Balance
const app = getApp();
const { formatPrice, formatDate, showToast, showModal } = require('../../utils/util');

Page({
  data: {
    balance: '0.00',
    transactions: [],
    loading: true,
    rechargeOptions: [
      { amount: 50, bonus: 0 },
      { amount: 100, bonus: 5 },
      { amount: 200, bonus: 15 },
      { amount: 500, bonus: 50 },
    ],
    selectedAmount: 0,
    isLoggedIn: false,
  },

  onLoad() {
    this.checkLogin();
  },

  onShow() {
    this.checkLogin();
  },

  checkLogin() {
    const loggedIn = app.isLoggedIn();
    this.setData({ isLoggedIn: loggedIn });
    if (loggedIn) {
      this.loadBalance();
      this.loadTransactions();
    } else {
      this.setData({ loading: false });
    }
  },

  async loadBalance() {
    try {
      const res = await app.request({ url: '/auth/profile' });
      if (res.code === 200) {
        this.setData({
          balance: formatPrice(res.data.balance || 0),
        });
      }
    } catch (err) {
      console.error('Failed to load balance:', err);
      if (err.code === 401) {
        this.setData({ isLoggedIn: false });
      }
    }
  },

  async loadTransactions() {
    // Mock transaction data — in production: GET /v1/member/balance-log
    const mockTransactions = [
      { id: 1, type: 'recharge', amount: 100, balance_after: 350, description: '充值100元', time: '2026-07-28 10:30' },
      { id: 2, type: 'consume', amount: -28, balance_after: 250, description: '订单消费 #ORD20260728001', time: '2026-07-27 15:20' },
      { id: 3, type: 'recharge', amount: 200, balance_after: 278, description: '充值200元（送15元）', time: '2026-07-20 09:15' },
      { id: 4, type: 'refund', amount: 45, balance_after: 78, description: '订单退款 #ORD20260715003', time: '2026-07-16 14:00' },
      { id: 5, type: 'consume', amount: -32, balance_after: 33, description: '订单消费 #ORD20260710005', time: '2026-07-10 12:30' },
      { id: 6, type: 'recharge', amount: 50, balance_after: 65, description: '充值50元', time: '2026-07-05 18:00' },
      { id: 7, type: 'consume', amount: -15, balance_after: 15, description: '订单消费 #ORD20260701002', time: '2026-07-01 11:45' },
    ];

    const transactions = mockTransactions.map(t => ({
      ...t,
      amountText: (t.amount > 0 ? '+' : '') + formatPrice(t.amount),
      isIncome: t.amount > 0,
      typeText: this.getTransactionTypeText(t.type),
      typeIcon: this.getTransactionTypeIcon(t.type),
      timeText: formatDate(t.time, 'YYYY-MM-DD HH:mm'),
    }));

    this.setData({ transactions, loading: false });
  },

  getTransactionTypeText(type) {
    const map = {
      recharge: '充值',
      consume: '消费',
      refund: '退款',
      bonus: '赠送',
    };
    return map[type] || '其他';
  },

  getTransactionTypeIcon(type) {
    const map = {
      recharge: '💰',
      consume: '🛒',
      refund: '↩️',
      bonus: '🎁',
    };
    return map[type] || '📋';
  },

  onRechargeSelect(e) {
    const amount = e.currentTarget.dataset.amount;
    this.setData({ selectedAmount: amount });
  },

  async onRecharge() {
    if (this.data.selectedAmount === 0) {
      showToast('请选择充值金额');
      return;
    }

    const res = await showModal({
      title: '确认充值',
      content: `确定充值 ${this.data.selectedAmount} 元吗？`,
    });
    if (!res.confirm) return;

    // In production, this would call WeChat Pay
    wx.showLoading({ title: '支付中...' });
    setTimeout(() => {
      wx.hideLoading();
      const newBalance = parseFloat(this.data.balance) + this.data.selectedAmount;
      this.setData({
        balance: formatPrice(newBalance),
        selectedAmount: 0,
      });
      showToast('充值成功', 'success');
      this.loadTransactions();
    }, 1000);
  },

  onLoginTap() {
    wx.switchTab({ url: '/pages/user/user' });
  },
});
