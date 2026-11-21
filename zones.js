// zones.js — Геозоны, полигоны ограничений и ключевые ориентиры EuroBaza
(function(){
  'use strict';

  // Базовый склад EuroBaza
  const BASE_POINT = {
    name: 'База EuroBaza (Арин Берд 7)',
    lat: 40.120847,
    lon: 44.514271
  };

  // Границы зоны Кентрон (Ереван) — ограничение въезда грузовых автомобилей до 21:00
  const KENTRON_POLY = [
    [40.1881, 44.5094],
    [40.1891, 44.5152],
    [40.1877, 44.5221],
    [40.1826, 44.5238],
    [40.1759, 44.5202],
    [40.1731, 44.5155],
    [40.1748, 44.5081],
    [40.1795, 44.5061],
    [40.1846, 44.5068]
  ];

  const ZoneService = {
    BASE: BASE_POINT,
    KENTRON_POLY: KENTRON_POLY,

    // Проверка попадания точки в зону Кентрон (Ray casting algorithm)
    inKentron(lat, lon) {
      if (typeof lat !== 'number' || typeof lon !== 'number') return false;
      let ins = false;
      for (let i = 0, j = KENTRON_POLY.length - 1; i < KENTRON_POLY.length; j = i++) {
        const a = KENTRON_POLY[i], b = KENTRON_POLY[j];
        const yi = a[0], xi = a[1], yj = b[0], xj = b[1];
        if (((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / ((yj - yi) || 1e-12) + xi)) {
          ins = !ins;
        }
      }
      return ins;
    },

    // Проверка пересечения отрезка пути с зоной Кентрон (дискретная выборка)
    segmentIntersectsKentron(pA, pB, steps = 11) {
      if (!pA || !pB) return false;
      if (this.inKentron(pA.lat, pA.lon) || this.inKentron(pB.lat, pB.lon)) return true;
      for (let k = 1; k <= steps; k++) {
        const t = k / (steps + 1);
        const curLat = pA.lat + (pB.lat - pA.lat) * t;
        const curLon = pA.lon + (pB.lon - pA.lon) * t;
        if (this.inKentron(curLat, curLon)) return true;
      }
      return false;
    }
  };

  // Экспорт в глобальную область
  window.ZoneService = ZoneService;
  window.KENTRON_POLY = KENTRON_POLY;
  window.inKentron = function(lat, lon) {
    return ZoneService.inKentron(lat, lon);
  };
})();
