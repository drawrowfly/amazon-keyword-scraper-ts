export interface Key {
    keyword: string;
    totalProducts: number;
}

export interface Keywords {
    [name: string]: Key;
}
