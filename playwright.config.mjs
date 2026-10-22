import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir:"./qa-browser",testMatch:"*.e2e.mjs",timeout:35_000,retries:1,workers:1,
  reporter:[["list"],["html",{open:"never",outputFolder:"playwright-report"}]],
  use:{baseURL:"http://127.0.0.1:3000",trace:"retain-on-failure",screenshot:"only-on-failure"},
  projects:[
    {name:"chromium-mobile",use:{...devices["iPhone 13"],browserName:"chromium"}},
    {name:"chromium-desktop",use:{...devices["Desktop Chrome"],viewport:{width:1440,height:900}}},
  ],
  webServer:{
    command:"pnpm start",
    url:"http://127.0.0.1:3000",
    timeout:180_000,reuseExistingServer:false,
    env:{PORT:"3000",NODE_ENV:"production"},
  },
});
