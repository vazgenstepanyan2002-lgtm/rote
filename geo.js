// geo.js — Изолированный сервис геолокации и GPS EuroBaza
(function(){
  'use strict';

  const GeoService = {
    // Проверка поддержки Geolocation API
    isSupported() {
      return typeof navigator !== 'undefined' && !!navigator.geolocation;
    },

    // Проверка статуса разрешения геолокации
    async hasPermission() {
      if (!this.isSupported()) return false;
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const st = await navigator.permissions.query({ name: 'geolocation' });
          return st.state === 'granted';
        }
      } catch (e) {}
      return false;
    },

    // Получить текущие координаты водителя (Promise)
    getPosition(options = {}) {
      const opts = Object.assign({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000
      }, options);

      return new Promise((resolve, reject) => {
        if (!this.isSupported()) {
          reject(new Error('Геолокация не поддерживается устройством'));
          return;
        }

        navigator.geolocation.getCurrentPosition(
          pos => {
            resolve({
              lat: pos.coords.latitude,
              lon: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              speed: (pos.coords.speed != null && isFinite(pos.coords.speed)) ? Math.round(pos.coords.speed * 3.6) : null,
              heading: pos.coords.heading,
              timestamp: pos.timestamp || Date.now()
            });
          },
          err => reject(err),
          opts
        );
      });
    },

    // Быстрый расчёт расстояния между двумя точками в метрах (формула гаверсинусов / проекции)
    distanceMeters(lat1, lon1, lat2, lon2) {
      const dLat = (lat2 - lat1) * 111000;
      const dLon = (lon2 - lon1) * 85000;
      return Math.hypot(dLat, dLon);
    }
  };

  // Экспорт в глобальную область
  window.GeoService = GeoService;
})();
