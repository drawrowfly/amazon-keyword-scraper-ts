'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const core_1 = require('./core');
const keyword = process.argv[2];
if (!keyword) {
    console.log('Keyword is missing');
    process.exit(1);
}
new core_1.GrabKeywords(keyword)._initScraper();
