// zones.js — Геозоны, полигоны ограничений и ключевые ориентиры EuroBaza
(function(){
  'use strict';

  // Базовый склад EuroBaza
  const BASE_POINT = {
    name: 'База EuroBaza (Арин Берд 7)',
    lat: 40.120847,
    lon: 44.514271
  };

  // Границы зоны Кентрон (Ереван) — официально: внутри периметра Ханджяна – Сарьяна – Григора Лусаворича / Агатангехоса – Корюна (07:00–21:00)
  const KENTRON_POLY = [
    [40.1890, 44.5094],
    [40.1902, 44.5155],
    [40.1894, 44.5224],
    [40.1826, 44.5238],
    [40.1760, 44.5200],
    [40.1739, 44.5138],
    [40.1744, 44.5082],
    [40.1795, 44.5061],
    [40.1852, 44.5068]
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

  // Проверка пересечения двух отрезков [a1, a2] и [b1, b2] (координаты [lat, lon])
  function segsIntersect(a1, a2, b1, b2) {
    const ccw = (p, q, r) => (r[0] - p[0]) * (q[1] - p[1]) - (q[0] - p[0]) * (r[1] - p[1]);
    const onSeg = (p, q, r) =>
      Math.min(p[0], r[0]) - 1e-12 <= q[0] && q[0] <= Math.max(p[0], r[0]) + 1e-12 &&
      Math.min(p[1], r[1]) - 1e-12 <= q[1] && q[1] <= Math.max(p[1], r[1]) + 1e-12;
    const d1 = ccw(a1, a2, b1), d2 = ccw(a1, a2, b2);
    const d3 = ccw(b1, b2, a1), d4 = ccw(b1, b2, a2);
    if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
    if (Math.abs(d1) < 1e-12 && onSeg(a1, b1, a2)) return true;
    if (Math.abs(d2) < 1e-12 && onSeg(a1, b2, a2)) return true;
    if (Math.abs(d3) < 1e-12 && onSeg(b1, a1, b2)) return true;
    if (Math.abs(d4) < 1e-12 && onSeg(b1, a2, b2)) return true;
    return false;
  }

  // Минимальное расстояние между отрезками [a1, a2] и [b1, b2] в метрах
  function segToSegMeters(a1, a2, b1, b2) {
    if (segsIntersect(a1, a2, b1, b2)) return 0;
    return Math.min(
      pointToSegMeters(a1[0], a1[1], b1, b2),
      pointToSegMeters(a2[0], a2[1], b1, b2),
      pointToSegMeters(b1[0], b1[1], a1, a2),
      pointToSegMeters(b2[0], b2[1], a1, a2)
    );
  }

  // fetch с кроссбраузерным таймаутом и поддержкой внешнего AbortSignal
  function fetchWithTimeout(url, ms, extSignal) {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    if (!ctrl) return fetch(url);
    const onExt = () => ctrl.abort();
    if (extSignal) {
      if (extSignal.aborted) { ctrl.abort(); }
      else extSignal.addEventListener('abort', onExt, { once: true });
    }
    const tid = setTimeout(() => ctrl.abort(), ms);
    return fetch(url, { signal: ctrl.signal }).finally(() => {
      clearTimeout(tid);
      if (extSignal) extSignal.removeEventListener('abort', onExt);
    });
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

    // Проверка пересечения отрезка пути с запретными зонами (Кентрон / Сараландж) — точная по отрезкам
    segmentIntersectsKentron(pA, pB) {
      if (!pA || !pB) return false;
      const latA = +pA.lat, lonA = +pA.lon, latB = +pB.lat, lonB = +pB.lon;
      if (!Number.isFinite(latA) || !Number.isFinite(lonA) || !Number.isFinite(latB) || !Number.isFinite(lonB)) return false;
      if (this.inKentron(latA, lonA) || this.inKentron(latB, lonB)) return true;
      const a = [latA, lonA], b = [latB, lonB];
      for (let i = 0, j = KENTRON_POLY.length - 1; i < KENTRON_POLY.length; j = i++) {
        if (segsIntersect(a, b, KENTRON_POLY[j], KENTRON_POLY[i])) return true;
      }
      for (let i = 0; i < SARALANJ_LINE.length - 1; i++) {
        if (segToSegMeters(a, b, SARALANJ_LINE[i], SARALANJ_LINE[i + 1]) <= SARALANJ_RADIUS_M) return true;
      }
      return false;
    },

    // Подсчёт попаданий линии маршрута [lon, lat] в дневные запретные зоны (Кентрон + Нор хчуги)
    countRouteHits(coords) {
      if (!coords || coords.length < 2) return 0;
      let hits = 0;
      for (let i = 0; i < coords.length - 1; i++) {
        const p1 = coords[i], p2 = coords[i + 1];
        if (!p1 || !p2) continue;
        // Пропускаем первую и последнюю точки как конечные адреса, проверяем тело сегмента и внутренние узлы
        const a = { lat: p1[1], lon: p1[0] }, b = { lat: p2[1], lon: p2[0] };
        const aIn = i > 0 && this.inKentron(a.lat, a.lon);
        const bIn = i + 1 < coords.length - 1 && this.inKentron(b.lat, b.lon);
        if (aIn || bIn) {
          hits++;
          continue;
        }
        // Точная проверка пересечения отрезка (чтобы длинные сегменты не перепрыгивали 85м коридор Сараланджа)
        const s1 = [a.lat, a.lon], s2 = [b.lat, b.lon];
        let crossed = false;
        for (let k = 0, j = KENTRON_POLY.length - 1; k < KENTRON_POLY.length; j = k++) {
          if (segsIntersect(s1, s2, KENTRON_POLY[j], KENTRON_POLY[k])) { crossed = true; break; }
        }
        if (!crossed) {
          for (let k = 0; k < SARALANJ_LINE.length - 1; k++) {
            if (segToSegMeters(s1, s2, SARALANJ_LINE[k], SARALANJ_LINE[k + 1]) <= SARALANJ_RADIUS_M) { crossed = true; break; }
          }
        }
        if (crossed) hits++;
      }
      return hits;
    },

    // Построение автомобильного маршрута с объездом дневных запретных зон (Кентрон + Нор хчуги)
    async fetchSafeRoute(fromPt, toPt, avoidZone = true, extSignal) {
      const fetchOsrm = pts => {
        const c = pts.map(p => p.lon + ',' + p.lat).join(';');
        const q = '?overview=full&geometries=geojson&alternatives=true';
        const one = u => fetchWithTimeout(u + c + q, 12000, extSignal).then(r => {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        }).then(j => {
          if (!j || !j.routes || !j.routes.length) throw 0;
          return j.routes;
        });
        return one('https://router.project-osrm.org/route/v1/driving/')
          .catch(e => {
            if (extSignal && extSignal.aborted) throw e;
            return one('https://routing.openstreetmap.de/routed-car/route/v1/driving/');
          });
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
