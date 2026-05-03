import { NavLink } from 'react-router-dom';
import homeIcon from '../assets/images/icons/sidebar/home-icon.svg';
import cartIcon from '../assets/images/icons/sidebar/sidebar-catalog.svg';
import ordersIcon from '../assets/images/icons/sidebar/orders-icon.svg';
import { HOME, CATALOG, ORDERS } from '../services/consts';
import { useState } from 'react';
import ExitModal from './modals/ExitModal';

const MENU_ITEMS = [
    { name: 'Главная', icon: homeIcon, alt: 'home-icon', path: HOME },
    { name: 'Каталог', icon: cartIcon, alt: 'catalog-icon', path: CATALOG },
    { name: 'Заказы', icon: ordersIcon, alt: 'orders-icon', path: ORDERS }
];

function Sidebar({ isOpen, onNavigate }) {
    const [open, setOpen] = useState(false);

    return(
        <aside className={`sidebar-section${isOpen ? ' sidebar-open' : ''}`}>
            <div className="sidebar-title text-heading-xl">ElectroVan</div>
            <div className="sidebar-line"></div>
            <nav className="sidebar-buttons">
                {MENU_ITEMS.map((item) => (
                    <NavLink
                        key={item.name}
                        to={item.path}
                        className={({ isActive }) =>
                            isActive ? "sidebar-button text-body-lg active" : "sidebar-button text-body-lg"
                        }
                        onClick={onNavigate}
                    >
                        <img src={item.icon} alt={item.alt} />
                        {item.name}
                    </NavLink>
                ))}
            </nav>
            <div className='exit-bar'>
                <div className='sidebar-underline'></div>
                <div className='exit-btn text-heading-lg' onClick={() => setOpen(true)}>Выйти</div>
                {open && <ExitModal setOpen={setOpen} />}
            </div>
        </aside>
    )
}

export default Sidebar;
