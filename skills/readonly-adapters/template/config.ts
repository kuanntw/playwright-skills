export type ReadOnlyAdapterConfig = {
  name: string;
  baseURL: string;
  routes: {
    home: string;
    list: string;
    detail: string;
  };
  selectors: {
    nav: string;
    listContainer: string;
    detailTitle: string;
  };
};

export const config: ReadOnlyAdapterConfig = {
  name: 'template',
  baseURL: 'http://localhost:3000',
  routes: {
    home: '/',
    list: '/items',
    detail: '/items/1',
  },
  selectors: {
    nav: '[data-testid="main-nav"]',
    listContainer: '[data-testid="list-container"]',
    detailTitle: '[data-testid="detail-title"]',
  },
};
