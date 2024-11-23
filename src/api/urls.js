const API_BASE_URL = 'http://localhost:4000/api';

export const ENDPOINTS = {
    ACCOUNTS: 'http://localhost:4000/api/accounts',
    PRODUCT: 'http://localhost:4000/api/product', // New endpoint for price fetch
    BIDASK: 'http://localhost:4000/api/bidask', // New endpoint for price fetch
    LISTPRODUCT: 'http://localhost:4000/api/listproducts/', // New endpoint for price fetch
    ORDERS: API_BASE_URL+'/orders', // Base endpoint for orders
    CREATEORDER:API_BASE_URL+'/create-order'
  };