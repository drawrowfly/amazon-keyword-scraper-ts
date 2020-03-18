import { GrabKeywords } from './GrabKeywords';

describe('GrabKeywords', () => {
    test(`result should contain { keyword: 'ANY KEY' , totalProducts: 'ANY NUMBER' }`, done => {
        let amazon = new GrabKeywords({ keyword: 'iphone', limit: 1, event: true });
        amazon.on('keyword', item => {
            expect(item).toEqual({ keyword: expect.any(String), totalProducts: expect.any(Number) });
            done();
        });
        amazon._initScraper();
    });
});
