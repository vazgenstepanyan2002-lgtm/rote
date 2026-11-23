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

  // Дорога Сараландж — Гераци — Ханджяна — до Эребуни (камеры штрафа для грузовых днём до 21:00)
  const SARALANJ_LINE = [
    [40.20005, 44.50512],
    [40.20014, 44.50584],
    [40.19994, 44.50662],
    [40.19938, 44.50763],
    [40.19890, 44.50999],
    [40.19839, 44.51092],
    [40.19757, 44.51181],
    [40.19597, 44.51337],
    [40.19489, 44.51492],
    [40.19464, 44.51547],
    [40.19447, 44.51736],
    [40.19412, 44.51913],
    [40.19383, 44.52011],
    [40.19361, 44.52150],
    [40.19372, 44.52254],
    [40.19417, 44.52484],
    [40.19433, 44.52732],
    [40.19421, 44.52981],
    [40.19385, 44.53114],
    [40.19260, 44.53158],
    [40.19162, 44.53034],
    [40.19037, 44.52917],
    [40.18713, 44.52612],
    [40.18528, 44.52664],
    [40.18269, 44.52463],
    [40.17920, 44.52334],
    [40.17835, 44.52291],
    [40.17604, 44.52135],
    [40.17422, 44.51888],
    [40.17356, 44.51608],
    [40.17346, 44.51382],
    [40.17256, 44.51361],
    [40.16915, 44.51354],
    [40.16838, 44.51393],
    [40.16536, 44.51522],
    [40.16058, 44.51716],
    [40.15827, 44.51764],
    [40.15688, 44.51904],
    [40.15465, 44.51884]
  ];
  const SARALANJ_RADIUS_M = 85;

  // Минимальное расстояние от точки (lat, lon) до отрезка [a, b] в метрах
  function pointToSegMeters(lat, lon, a, b) {
    const ky = 111320, kx = 85200; // для широты Еревана ~40.19°
    const px = lon * kx, py = lat * ky;
    const ax = a[1] * kx, ay = a[0] * ky;
    const bx = b[1] * kx, by = b[0] * ky;
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let t = len2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
    if (t < 0) t = 0;
    else if (t > 1) t = 1;
    const cx = ax + t * dx, cy = ay + t * dy;
    return Math.hypot(px - cx, py - cy);
  }

  const ZoneService = {
    BASE: BASE_POINT,
    KENTRON_POLY: KENTRON_POLY,
    SARALANJ_LINE: SARALANJ_LINE,

    // Проверка попадания точки в полигон Кентрон (Ray casting algorithm)
    inKentronPoly(lat, lon) {
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

    // Проверка попадания точки в коридор дороги Сараландж
    inSaralanj(lat, lon) {
      if (typeof lat !== 'number' || typeof lon !== 'number') return false;
      for (let i = 0; i < SARALANJ_LINE.length - 1; i++) {
        if (pointToSegMeters(lat, lon, SARALANJ_LINE[i], SARALANJ_LINE[i + 1]) <= SARALANJ_RADIUS_M) {
          return true;
        }
      }
      return false;
    },

    // Название запретной зоны ('kentron' | 'saralanj' | null)
    getZone(lat, lon) {
      if (this.inKentronPoly(lat, lon)) return 'kentron';
      if (this.inSaralanj(lat, lon)) return 'saralanj';
      return null;
    },

    // Проверка попадания точки в любую дневную запретную зону (Кентрон или Сараландж)
    inKentron(lat, lon) {
      return this.inKentronPoly(lat, lon) || this.inSaralanj(lat, lon);
    },

    // Проверка пересечения отрезка пути с запретными зонами (Кентрон / Сараландж)
    segmentIntersectsKentron(pA, pB, steps = 15) {
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
  window.SARALANJ_LINE = SARALANJ_LINE;
  window.inSaralanj = function(lat, lon) {
    return ZoneService.inSaralanj(lat, lon);
  };
  window.inKentron = function(lat, lon) {
    return ZoneService.inKentron(lat, lon);
  };
})();
