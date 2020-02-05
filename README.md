# Amazon Keyword Scraper
From 1 keyword you can scrape up to hundreds and even thousands **Unique and Relevant Keywords** with a **Number of Active Products** per each keyword.

## Features
*   Scrape Keywords with the number of active products from Amazon Store
*   Save result to a csv file or use as plugin in your app

## Module
```javascript
import { GrabKeywords } from './src';

const options = {
    keyword: "iphone",
    limit: 100,
    event: true,
};
let amazon = new GrabKeywords(options)._initScraper();

amazon.on('keywords', key => {
    console.log(key);
});

```
**Options**
```javascipt
let options = {
    // Keyword: {string default: ''}
    keyword: `iphone`,
    
    // Number of keywords to collect: {int default: 50}
    limit: 50,

    // Enable or Disable event emitter. If true then you can accept data through events: {boolean default: false}
    event: false,
    
    // Save result to a CSV file: {boolean default: false}
    save: false,

    // How many post should be downloaded asynchronously. Only if {download:true}: {int default: 5}
    asyncDownload: 5,
    
    // File path where all files will be saved: {string default: 'CURRENT_DIR'}
    filepath: `CURRENT_DIR`,
};
```
## CSV Example
![Demo](https://i.imgur.com/OwCLSev.png)



***
<a href="https://www.buymeacoffee.com/Usom2qC" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/default-blue.png" alt="Buy Me A Coffee" style="height: 41px !important;width: 174px !important;box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;-webkit-box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;" ></a>
