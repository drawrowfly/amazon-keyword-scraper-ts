import { GrabKeywords } from './core';

const keyword: string = process.argv[2];

if (!keyword) {
    console.log('Keyword is missing');
    process.exit(1);
}

new GrabKeywords(keyword)._initScraper();
