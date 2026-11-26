(() => {
  const labels = {
    fa: ['فروش امروز', 'صندوق نقدی', 'نرخ دالر', 'یادداشت جدید'],
    ps: ['د نن پلور', 'نغدي صندوق', 'د ډالر نرخ', 'نوی یادښت'],
    en: ['Today’s sales', 'Cash on hand', 'Dollar rate', 'New note']
  };
  function paint() {
    const home = document.querySelector('#content[data-screen="dashboard"] .zrf-home');
    const hero = home?.querySelector('.z62-hero');
    if (!hero || home.querySelector('.zref-summary')) return;
    const lang = (document.documentElement.lang || 'fa').split('-')[0];
    const words = labels[lang] || labels.fa;
    const panel = document.createElement('div');
    panel.className = 'zref-summary';
    function tile(index, value, action) {
      const btn = document.createElement('button');
      btn.type = 'button';
      const label = document.createElement('span');
      label.textContent = words[index];
      btn.append(label);
      if (value) {
        const amount = document.createElement('strong');
        amount.dir = 'auto';
        amount.textContent = value;
        btn.append(amount);
      }
      btn.addEventListener('click', action);
      panel.append(btn);
    }
    if (zaviModuleEnabled('sales')) tile(0, currency(summary(nowISO(), nowISO()).sales), () => go('sales'));
    if (zaviModuleEnabled('money')) tile(1, currency(cashBalances().a_cash || 0), () => go('money'));
    const field = home.querySelector('input[name="usdRate"],#zaviUsdRateInput') || document.querySelector('#content [data-usd-rate-form] input');
    if (field && field.getClientRects().length) tile(2, String(fxUsdRate() || '—'), () => {field.scrollIntoView({block:'center'});field.focus()});
    if (zaviModuleEnabled('journal')) tile(3, '', () => {
      go('journal');
      document.querySelector('#content [data-action="journal_note"]')?.click();
    });
    hero.after(panel);
  }
  const content = document.getElementById('content');
  if (content) {
    let pending = false;
    new MutationObserver(() => {
      if (!pending && content.dataset.screen === 'dashboard' && !content.querySelector('.zref-summary')) {
        pending = true;
        requestAnimationFrame(() => {pending = false;paint()});
      }
    }).observe(content, {childList:true, subtree:true});
    paint();
  }
})();
