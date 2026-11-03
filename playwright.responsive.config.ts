import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./tests/responsive', timeout:180000, workers:2, retries:0,
 reporter:'list', outputDir:'test-results/responsive',
 use:{baseURL:'http://127.0.0.1:3100',actionTimeout:15000,trace:'retain-on-failure'},
 projects:['chromium','firefox','webkit'].map(browserName=>({name:browserName,use:{browserName:browserName as 'chromium'|'firefox'|'webkit'}})),
 webServer:{command:'npm run start --workspace @travessia/web -- --port 3100',url:'http://127.0.0.1:3100',timeout:120000,reuseExistingServer:!process.env.CI},
});
