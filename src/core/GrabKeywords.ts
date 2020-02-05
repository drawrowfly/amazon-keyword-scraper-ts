import rp from 'request-promise';
import { queue, AsyncQueue } from 'async';
import { EventEmitter } from 'events';
import { fromCallback } from 'bluebird';
import { Parser } from 'json2csv';
import { writeFile } from 'fs';

import { Keywords, Key } from '../types';

export class GrabKeywords extends EventEmitter {
    public _keyword: string;
    public _limit: number;
    public _timeout: number;
    public _quitTaskAfter: number;
    public _timeOutTask: number;
    public _filePath: string;
    public _save: boolean;
    public _event: boolean;

    private _keyWordSet: Keywords;
    private _keywordCollectorQueue: AsyncQueue<any>;
    private _keywordMetaCollectorQueue: AsyncQueue<any>;
    private _errorCount: number;
    private _quitTask: number;
    private _singleSuggestions: number;
    private _json2csvParser: any;

    constructor({
        keyword,
        limit = 50,
        timeout = 3000,
        quitTaskAfter = 10,
        timeOutTask = 10,
        filePath = process.cwd(),
        save = false,
        event = false,
    }) {
        super();
        this._event = event;

        this._keyword = keyword; // entry keyword
        this._limit = limit; // number of keywords to collect

        this._timeout = timeout; // if this._errorCount>=this._timeOutTask then we will initiate setTimeout(this._timeout)
        this._errorCount = 0; // Increment when we receive http error
        this._timeOutTask = timeOutTask; // initiate timeout after this._errorCount>=this._timeOutTask

        this._quitTask = 0; // this value will be incremented every TIMEOUT, if >=this._quitTaskAfter then completeTask()
        this._quitTaskAfter = quitTaskAfter; // if this._quitTask >= this._quitTaskAfter then  completeTask()

        this._keyWordSet = {}; // store keywords
        this._singleSuggestions = 0; // Increment if Amazon suggested only 1 keyword

        this._save = save; // If we need to save output to the csv file
        this._filePath = filePath; // if this._save === true then we need to use a filePath where file will be saved

        this._json2csvParser = new Parser({ fields: ['keyword', 'totalProducts'] });

        this.on('keyword', (item: Key) => {
            if (item.keyword in this._keyWordSet === false) {
                this._keyWordSet[item.keyword] = item;
            }
            if (Object.keys(this._keyWordSet).length < this._limit) {
                this._keywordCollectorQueue.push(item);
            } else {
                this._completeTask();
            }
        });

        // Queue to collect keywords
        this._keywordCollectorQueue = queue((item: Key, callback) => {
            if (Object.keys(this._keyWordSet).length < this._limit) {
                this._getKeywordSuggestions(item.keyword)
                    .then(() => {
                        callback(null);
                    })
                    .catch(() => {
                        if (this._quitTask >= this._quitTaskAfter) {
                            this._completeTask();
                        }
                        this._errorCount++;
                        if (this._errorCount > 10) {
                            this._errorCount = 0;
                            setTimeout(() => {
                                this._quitTask++;
                                callback(null);
                            }, this._timeout);
                        } else {
                            callback(undefined);
                        }
                    });
            } else {
                callback(null);
            }
        }, 5);

        // Queue to collect keywords
        this._keywordMetaCollectorQueue = queue((item: Key, callback) => {
            this._getKeywordMeta(item)
                .then(() => {
                    callback(null);
                })
                .catch(() => {
                    callback(null);
                });
        }, 5);

        this._keywordMetaCollectorQueue.drain(() => {
            this._finalizeTask();
        });
    }

    public _initScraper() {
        if (this._keyword) {
            this._getKeywordSuggestions(this._keyword);
            return this;
        } else {
            throw new Error('Keyword is missing');
        }
    }

    public _getKeywordMeta(item: Key): Promise<any> {
        return new Promise(async (resolve, reject) => {
            try {
                let body = await rp({
                    method: 'GET',
                    uri: 'https://www.amazon.com/s',
                    qs: {
                        i: 'aps',
                        k: item.keyword,
                        ref: 'nb_sb_noss',
                        url: 'search-alias=aps',
                    },
                    headers: {
                        'User-Agent': `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_${Math.floor(
                            Math.random() * (15 - 10) + 10,
                        )}_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${Math.floor(
                            Math.random() * (79 - 70) + 70,
                        )}.0.3945.117 Safari/537.36`,
                        Origin: 'https://www.amazon.com',
                        Referer: 'https://www.amazon.com/',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Accept-Language': 'en-US,en;q":"0.9,ru;q":"0.8',
                        Accept:
                            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
                    },
                    gzip: true,
                    json: true,
                });

                let totalResultCount = body.match(/"totalResultCount":\w+(.[0-9])/gm);

                if (totalResultCount) {
                    item.totalProducts = totalResultCount[0].split('totalResultCount":')[1];
                }
                resolve();
            } catch (error) {
                reject();
            }

            // If this._event then emit an user event with the keyword
            if (this._event) {
                this.emit('keywords', item);
            }
        });
    }

    public _getKeywordSuggestions(keyword: string): Promise<any> {
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
                        'User-Agent': `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_${Math.floor(
                            Math.random() * (15 - 10) + 10,
                        )}_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${Math.floor(
                            Math.random() * (79 - 70) + 70,
                        )}.0.3945.117 Safari/537.36`,
                        Origin: 'https://www.amazon.com',
                        Referer: 'https://www.amazon.com/',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Accept-Language': 'en-US,en;q":"0.9,ru;q":"0.8',
                        Accept: 'application/json, text/javascript, */*; q":"0.01',
                    },
                    gzip: true,
                    json: true,
                });

                this._processResponse(body);
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }

    private _processResponse(body: any) {
        let suggestions: any[] = body.suggestions;

        if (suggestions.length) {
            if (this._singleSuggestions > 10) {
                if (this._keywordCollectorQueue.length()) {
                    this._completeTask();
                }
            } else {
                if (suggestions.length === 1) {
                    this._singleSuggestions++;
                }
                for (let item of suggestions) {
                    if (Object.keys(this._keyWordSet).length < this._limit) {
                        let keyword: Key = { keyword: item.value, totalProducts: 0 };
                        this.emit('keyword', keyword);
                    } else {
                        break;
                    }
                }
            }
        }
    }

    // Kill the queue and complete the task
    private _completeTask() {
        this._keywordCollectorQueue.kill();
        for (let item in this._keyWordSet) {
            this._keywordMetaCollectorQueue.push(this._keyWordSet[item]);
        }
    }

    // Finalize task
    // Do we need to save output to the file or not and etc
    private _finalizeTask() {
        if (this._save) {
            let collector: Array<Key> = [];
            for (let item in this._keyWordSet) {
                collector.push(this._keyWordSet[item]);
            }
            fromCallback(cb =>
                writeFile(
                    `${this._filePath}/${this._keyword}_${Date.now()}.csv`,
                    this._json2csvParser.parse(collector),
                    cb,
                ),
            );
        }
    }
}
