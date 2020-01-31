import rp from 'request-promise';
import { forEachLimit } from 'async';
import { EventEmitter } from 'events';

export class GrabKeywords extends EventEmitter {
    public _keyword: string;
    private _keywordList: string[];

    constructor(keyword) {
        super();
        this._keyword = keyword;
        this._keywordList = [];
        this.on('keyword', keyword => {
            this._keywordList.push(keyword);
        });
        this.on('completed', () => {
            this._keywordList = [...new Set(this._keywordList)];
        });
    }

    public _initScraper() {
        this._getKeywordSuggestions(this._keyword, true);
    }
    public _getKeywordSuggestions(keyword: string, more: boolean): Promise<any> {
        return new Promise(async (resolve, reject) => {
            try {
                let body = await rp({
                    method: 'GET',
                    uri: 'https://completion.amazon.com/api/2017/suggestions',
                    qs: {
                        'page-type': 'Gateway',
                        lop: 'en_US',
                        'site-variant': 'desktop',
                        'client-info': 'amazon-search-ui',
                        mid: 'ATVPDKIKX0DER',
                        alias: 'aps',
                        b2b: '0',
                        fresh: '1',
                        ks: '80',
                        prefix: keyword,
                        event: 'onKeyPress',
                        limit: '11',
                        fb: '1',
                        'suggestion-type': 'KEYWORD',
                        _: Date.now(),
                    },
                    headers: {
                        'User-Agent':
                            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.117 Safari/537.36',
                        Origin: 'https://www.amazon.com',
                        Referer: 'https://www.amazon.com/',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Accept-Language': 'en-US,en;q":"0.9,ru;q":"0.8',
                        Accept: 'application/json, text/javascript, */*; q":"0.01',
                    },
                    gzip: true,
                    json: true,
                });

                this._processResponse(body, more);
                resolve();
            } catch (error) {
                reject();
            }
        });
    }

    private _processResponse(body: any, more: boolean) {
        let suggestions: any[] = body.suggestions;

        if (suggestions.length) {
            for (let item of suggestions) {
                this.emit('keyword', item.value);
            }

            if (more) {
                this._moreKeywords(suggestions);
            }
        }
    }

    private _moreKeywords(keywords: any) {
        forEachLimit(
            keywords,
            5,
            (item, cb) => {
                let keyword: string = item.value;
                this._getKeywordSuggestions(keyword, false)
                    .then(() => {
                        cb(null);
                    })
                    .catch(() => {
                        cb('ERROR');
                    });
            },
            error => {
                this.emit('completed');
            },
        );
    }
}
