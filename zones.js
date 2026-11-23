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

  // Дорога Сараландж — Нор хчуги (от светофора Сараландж × Арменакяна через Сари Тах до конца спуска поста 40.15989, 44.51535)
  const SARALANJ_LINE = [
    [40.19081, 44.53206],
    [40.19060, 44.53189],
    [40.19018, 44.53152],
    [40.18975, 44.53100],
    [40.18760, 44.52834],
    [40.18559, 44.52879],
    [40.18246, 44.53056],
    [40.18000, 44.53153],
    [40.17707, 44.52861],
    [40.17398, 44.52850],
    [40.17247, 44.52836],
    [40.17151, 44.52806],
    [40.17030, 44.52752],
    [40.16941, 44.52705],
    [40.16849, 44.52590],
    [40.16798, 44.52515],
    [40.16726, 44.52439],
    [40.16647, 44.52379],
    [40.16551, 44.52314],
    [40.16409, 44.52228],
    [40.16360, 44.52195],
    [40.16266, 44.52097],
    [40.16144, 44.52030],
    [40.16095, 44.51999],
    [40.16029, 44.51906],
    [40.15995, 44.51812],
    [40.15989, 44.51780],
    [40.15982, 44.51711],
    [40.15978, 44.51660],
    [40.15981, 44.51607],
    [40.15989, 44.51535]
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
    },

    // Подсчёт попаданий линии маршрута [lon, lat] в дневные запретные зоны (Кентрон + Нор хчуги)
    countRouteHits(coords) {
      if (!coords || coords.length < 3) return 0;
      let hits = 0;
      const step = coords.length > 250 ? 2 : 1;
      for (let i = 1; i < coords.length - 1; i += step) {
        const p = coords[i];
        if (this.inKentron(p[1], p[0])) hits++;
      }
      return hits;
    },

    // Построение автомобильного маршрута с объездом дневных запретных зон (Кентрон + Нор хчуги)
    async fetchSafeRoute(fromPt, toPt, avoidZone = true) {
      const fetchOsrm = pts => {
        const c = pts.map(p => p.lon + ',' + p.lat).join(';');
        const q = '?overview=full&geometries=geojson&alternatives=true';
        const one = u => fetch(u + c + q).then(r => r.json()).then(j => {
          if (!j || !j.routes || !j.routes.length) throw 0;
          return j.routes;
        });
        return one('https://router.project-osrm.org/route/v1/driving/')
          .catch(() => one('https://routing.openstreetmap.de/routed-car/route/v1/driving/'));
      };

      const directRoutes = await fetchOsrm([fromPt, toPt]);
      const scored = directRoutes.map(r => ({
        route: r,
        hits: this.countRouteHits(r.geometry && r.geometry.coordinates)
      }));
      scored.sort((a, b) => a.hits - b.hits || (a.route.distance || 0) - (b.route.distance || 0));

      if (!avoidZone || scored[0].hits === 0 || this.inKentron(toPt.lat, toPt.lon)) {
        return scored[0].route;
      }

      // Если прямой маршрут проходит через запретную зону — пробуем реальные объезды вокруг Кентрона и Нор хчуги
      const bypasses = [
        [fromPt, { lat: 40.1755, lon: 44.4890 }, toPt],
        [fromPt, { lat: 40.1780, lon: 44.4850 }, { lat: 40.1995, lon: 44.5020 }, toPt],
        [fromPt, { lat: 40.1680, lon: 44.5400 }, { lat: 40.1945, lon: 44.5350 }, toPt]
      ];
      const extra = await Promise.allSettled(bypasses.map(pts => fetchOsrm(pts)));
      extra.forEach(res => {
        if (res.status !== 'fulfilled' || !res.value) return;
        res.value.forEach(r => {
          scored.push({
            route: r,
            hits: this.countRouteHits(r.geometry && r.geometry.coordinates)
          });
        });
      });

      scored.sort((a, b) => a.hits - b.hits || (a.route.distance || 0) - (b.route.distance || 0));
      return scored[0].route;
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
