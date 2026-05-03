import { useLocation } from 'react-router-dom';
import { useAdminStore } from '../store/useAdminStore';

const HOME_TITLE = [
    { name: 'Главная страница', page: '/home', button: null },
    { name: 'Машины в каталоге', page: '/catalog', button: 'Добавить авто' },
    { name: 'Заказы клиентов', page: '/orders', button: null },
];

function Header() {
    const location = useLocation();
    const openModal = useAdminStore(s => s.openModal);
    const pageData = HOME_TITLE.find(item => item.page === location.pathname) || HOME_TITLE[0];

    return (
        <header className="header-section">
            <div className="header-top">
                <div className="header-title text-heading-xl">{pageData.name}</div>
                {pageData.button && (
                    <button
                        type="button"
                        className="header-action-btn"
                        onClick={() => openModal(null)}
                    >
                        {pageData.button}
                    </button>
                )}
            </div>
            <div className="header-line"></div>
        </header>
    );
}

export default Header;
