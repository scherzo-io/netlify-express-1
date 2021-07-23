const puppeteer = require('puppeteer');
const axios = require('axios');

// ===== SETTINGS =====
const HEADLESS = false          //TRUE = headless, FALSE = non-headless
const TAKE_SCREENSHOT = false   //TRUE = take screenshot, FALSE = dont take screenshot
const CLOSE_BROWSER = true     //TRUE = close browser at end, FALSE = leave open (useful to leave open for debugging if non-headless)
const DEV_HOOK = true           //TRUE = send extra hook to webhook.site
// =====================

const headers = {
    'x-wc-webhook-topic' : 'RT_results',
    'content-type' : 'application/json; charset=utf-8'
}

module.exports = {
    testFunc: function testFunc() {
        
    },
       
    run: async function run(id, dob) {
        const browser = await puppeteer.launch({headless: HEADLESS, slowMo: 150, defaultViewport: null,});
        
        console.log(`\nChecking test info for ${id}...`)
        console.log(`\nSettings: \n    - Headless: ${HEADLESS}\n    - Screenshot: ${TAKE_SCREENSHOT}\n    - Close browser: ${CLOSE_BROWSER}\n`)

        try {
        const userAgent = 'Mozilla/5.0 (X11; Linux x86_64)';
        const page = await browser.newPage();
        await page.setUserAgent(userAgent);

        await page.setJavaScriptEnabled(true);
        await page.setDefaultNavigationTimeout(0);

        //set viewport size (for now just standard 1920x1080)
        await page.setViewport({
            width: 1920,
            height: 1080,
            deviceScaleFactor: 1,
            hasTouch: false,
            isLandscape: false,
            isMobile: false,
        }); 

        await page.evaluateOnNewDocument(() => {
            // Pass webdriver check
            Object.defineProperty(navigator, 'webdriver', {
                get: () => false,
            });
        });

        await page.evaluateOnNewDocument(() => {
            // Pass chrome check
            window.chrome = {
                runtime: {},
                // etc.
            };
        });

        await page.evaluateOnNewDocument(() => {
            //Pass notifications check
            const originalQuery = window.navigator.permissions.query;
            return window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                    Promise.resolve({ state: Notification.permission }) :
                    originalQuery(parameters)
            );
        });

        await page.evaluateOnNewDocument(() => {
            // Overwrite the `plugins` property to use a custom getter.
            Object.defineProperty(navigator, 'plugins', {
                // This just needs to have `length > 0` for the current test,
                // but we could mock the plugins too if necessary.
                get: () => [1, 2, 3, 4, 5],
            });
        });

        await page.evaluateOnNewDocument(() => {
            // Overwrite the `languages` property to use a custom getter.
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en'],
            });
        });

        //go to dmv page
        await page.goto('https://roadtestresults.nyrtsscheduler.com/');

        //enters student id and date of birth, then clicks 'login' and waits for page to load
        await page.type('#input-14', id);
        await page.type('#input-18', dob);
        await page.click('button.justify-center.loginButton.v-btn.v-btn--block.v-btn--is-elevated.v-btn--has-bg.theme--light.v-size--default.primary');
        await page.waitForTimeout(2500)

        //takes screenshot (for testing purposes, make sure to delete screenshots from project directory when pushing to github)
        if (TAKE_SCREENSHOT) {
            await page.screenshot({ path: `Screenshots/UserID${id}.png` });
            console.log("Screenshot saved in project directory\n")
        }

        //clicks "View Details"
        await page.click('#app > div > main > div > div.container.appWidth > div > div.v-card.v-sheet.theme--light.elevation-2 > div.v-card__text > div > div > div > table > tbody > tr > td:nth-child(1) > span > a');
        
        //grabs results data
        const testResult = await page.evaluate(() => document.querySelector('#app > div > main > div > div.container.appWidth > div > div.v-card.v-sheet.theme--light.elevation-2 > div.v-card__text > div > div > div > table > tbody > tr > td:nth-child(5) > span').innerText);
        const testDate = await page.evaluate(() => document.querySelector('#app > div > main > div > div.container.appWidth > div > div:nth-child(2) > div > div.v-card__text > div:nth-child(1) > div:nth-child(2)').innerText.substring(6));
        const testDetails = await page.evaluate(() => document.querySelector('#app > div > main > div > div.container.appWidth > div > div:nth-child(2) > div > div.v-card__text > div:nth-child(3) > div').innerText);

        //console log results
        console.log(`Student ID: ${id}\nTest Date: ${testDate}\nResult: ${testResult}\nTest Details: ${testDetails}`);


        //constructing data to json
        const data = {
            "Student ID": id,
            "Test Date" : testDate,
            "Result" : testResult,
            "Test Details" : testDetails
        }

        //send hook
        //https://fds.ferraridrivingschool.com:18675/dev/api.php
        //https://hooks.zapier.com/hooks/catch/9990403/b2fjznv/
        //https://webhook.site/bb1ebd56-98ed-4207-999a-5f4be5072af7
        const res = await axios.post('https://fds.ferraridrivingschool.com:18675/dev/api.php', 
            data, 
            {headers: headers}
            )
        if (DEV_HOOK) {    
        const dev = await axios.post('https://webhook.site/bb1ebd56-98ed-4207-999a-5f4be5072af7', 
            data, 
            {headers: headers}
            )
        }

    } catch (e) {
        console.log(e)
        console.log('If "No node found" error, most likely captcha blocked the login attempt OR results not available (check screenshot)\n' +
                  '(error is from trying to click an element on the next page that isn`t loaded yet)\n' +
                  'Best way to avoid captcha is keeping headless set to false')
    } finally {
        if (CLOSE_BROWSER) {
            await browser.close();
        }
    }
    }
};
