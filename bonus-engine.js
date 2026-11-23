// bonus-engine.js — Чистый вычислительный модуль бонусов EuroBaza (Domain Logic)
(function(){
  'use strict';

  const SUMM_ZONES = [['', 'Город'], ['2', 'Район']];

  const BonusEngine = {
    // Безопасное число
    num(v) {
      const n = typeof v === 'string' ? +v.replace(',', '.').trim() : +v;
      return Number.isFinite(n) && n >= 0 ? n : 0;
    },

    // Форматирование числа с разделением тысяч
    formatMoney(val) {
      const v = Math.round((this.num(val) || 0) * 100) / 100;
      return v.toLocaleString('ru-RU');
    },

    // Расчёт и группировка итоговых строк из дерева категорий
    computeSummaryRows(categories = []) {
      const out = [];
      if (!Array.isArray(categories)) return out;

      categories.forEach(c => {
        if (!c || !Array.isArray(c.subs)) return;
        const items = [];
        let categorySum = 0;

        c.subs.forEach(s => {
          if (!s) return;
          const parts = [];

          SUMM_ZONES.forEach(x => {
            const n = this.num(s['qty' + x[0]]);
            const p = this.num(s['price' + x[0]]);
            if (n > 0) {
              parts.push({
                l: s.one ? '' : x[1],
                n: n,
                p: p,
                v: n * p
              });
            }
          });

          if (parts.length) {
            items.push({ name: s.name, parts: parts });
            parts.forEach(z => { categorySum += z.v; });
          }
        });

        if (items.length) {
          out.push({
            name: c.name,
            sum: categorySum,
            items: items
          });
        }
      });

      return out;
    },

    // Количество единиц в категории
    categoryQuantity(cat) {
      if (!cat || !Array.isArray(cat.items)) return 0;
      return cat.items.reduce((total, it) => {
        if (!it || !Array.isArray(it.parts)) return total;
        return total + it.parts.reduce((subTotal, p) => subTotal + (this.num(p.n) || 0), 0);
      }, 0);
    },

    // Общее количество единиц мебели по всем категориям
    totalQuantity(rows = []) {
      if (!Array.isArray(rows)) return 0;
      return rows.reduce((total, c) => total + this.categoryQuantity(c), 0);
    },

    // Общая сумма бонусов
    totalSum(rows = []) {
      if (!Array.isArray(rows)) return 0;
      return rows.reduce((total, c) => total + (this.num(c.sum) || 0), 0);
    }
  };

  // Экспорт в глобальную область
  window.BonusEngine = BonusEngine;
})();
