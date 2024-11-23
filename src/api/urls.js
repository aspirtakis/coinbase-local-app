const API_BASE_URL = 'http://192.168.1.22:4000/api';

export const ENDPOINTS = {
    ACCOUNTS: API_BASE_URL+'/api/accounts',
    PRODUCT: API_BASE_URL+'/api/product', // New endpoint for price fetch
    BIDASK: API_BASE_URL+'/api/bidask', // New endpoint for price fetch
    LISTPRODUCT: API_BASE_URL+'/api/listproducts/', // New endpoint for price fetch
    ORDERS: API_BASE_URL+'/orders', // Base endpoint for orders
    CREATEORDER:API_BASE_URL+'/create-order'
  };