import {
    HOME,
    CATALOG,
    ORDERS,
    LOGIN
} from './consts.js'

import HomePage from '../pages/HomePage.jsx'
import CatalogPage from '../pages/CatalogPage.jsx'
import LoginPage from '../pages/LoginPage.jsx'
import OrderPage from '../pages/OrderPage.jsx'

export const routes = [
    {
        path: HOME,
        element: HomePage
    },
    {
        path: CATALOG,
        element: CatalogPage
    },
    {
        path: ORDERS,
        element: OrderPage
    },
    {
        path: LOGIN,
        element: LoginPage
    }
]