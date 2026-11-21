// storage.js — Надёжный унифицированный сервис локального хранения EuroBaza
(function(){
  'use strict';

  const StorageService = {
    // Безопасное чтение строки
    get(key, defaultValue = null) {
      try {
        const val = localStorage.getItem(key);
        return val !== null ? val : defaultValue;
      } catch (e) {
        console.warn('StorageService.get error for key:', key, e);
        return defaultValue;
      }
    },

    // Безопасное сохранение строки
    set(key, value) {
      try {
        localStorage.setItem(key, String(value));
        return true;
      } catch (e) {
        console.error('StorageService.set error for key:', key, e);
        return false;
      }
    },

    // Безопасное чтение JSON (массив, объект и т.д.)
    getJSON(key, defaultValue = null) {
      try {
        const raw = localStorage.getItem(key);
        if (raw === null || raw === undefined) return defaultValue;
        return JSON.parse(raw);
      } catch (e) {
        console.warn('StorageService.getJSON parse error for key:', key, e);
        return defaultValue;
      }
    },

    // Безопасная запись JSON
    setJSON(key, value) {
      try {
        const raw = JSON.stringify(value);
        localStorage.setItem(key, raw);
        return true;
      } catch (e) {
        console.error('StorageService.setJSON error for key:', key, e);
        return false;
      }
    },

    // Удаление ключа
    remove(key) {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (e) {
        console.error('StorageService.remove error for key:', key, e);
        return false;
      }
    },

    // Проверка наличия ключа
    has(key) {
      try {
        return localStorage.getItem(key) !== null;
      } catch (e) {
        return false;
      }
    }
  };

  // Экспорт в глобальную область
  window.StorageService = StorageService;
})();
