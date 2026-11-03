import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests/browser-vlibras',timeout:180000,workers:1,use:{baseURL:'http://127.0.0.1:3100',launchOptions:{args:['--enable-unsafe-swiftshader']}},webServer:{command:'npm run dev --workspace @travessia/web -- --port 3100',url:'http://127.0.0.1:3100',timeout:120000},reporter:'list'});
