import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import sidebar from './en/sidebar.json';
import sidebarRU from './ru/sidebar.json';

export const defaultNS = 'sidebar';

export const resources = {
  en: {
    sidebar,
  },
  ru: {
    sidebar: sidebarRU
  },
} as const;

i18n.use(initReactI18next).init({
  debug: true,
  fallbackLng: 'en',
  lng: 'en',
  ns: ['sidebar'],
  resources,
});

export default i18n;