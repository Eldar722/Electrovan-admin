import { useState, useEffect } from 'react';
import phoneIcon from '../assets/images/icons/homepage/phone-icon.svg';
import mailIcon from '../assets/images/icons/homepage/mail-icon.svg';
import whatsappIcon from '../assets/images/icons/homepage/whatsapp-acicon.svg';
import telegramIcon from '../assets/images/icons/homepage/telegram-acicon.svg';
import HomeCard from '../components/cards/HomeCard';
import ProductModal from '../components/modals/ProductModal';
import { fetchCars, fetchSettings, updateSettings } from '../api/supabase';
import { useAdminStore } from '../store/useAdminStore';

const EMPTY_SETTINGS = { phone: '', whatsapp: '', email: '', telegram: '' };

function HomeCardSkeleton() {
    return (
        <div className="skeleton-hcard">
            <div className="skeleton skeleton-hcard-img" />
            <div className="skeleton skeleton-hcard-line" />
            <div className="skeleton skeleton-hcard-sub" />
            <div className="skeleton-hcard-grid">
                {[0,1,2,3].map(i => <div key={i} className="skeleton skeleton-hcard-cell" />)}
            </div>
        </div>
    );
}

function HomePage() {
    const [popularCars, setPopularCars] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [settings, setSettings] = useState(EMPTY_SETTINGS);
    const [settingsSaving, setSettingsSaving] = useState(false);
    const [settingsSaved, setSettingsSaved] = useState(false);
    const [settingsError, setSettingsError] = useState(null);

    const modalOpen = useAdminStore(s => s.modalOpen);
    const openModal = useAdminStore(s => s.openModal);
    const refreshTick = useAdminStore(s => s.refreshTick);

    useEffect(() => {
        setLoading(true);
        setError(null);

        const loadCars = async (retriesLeft) => {
            try {
                const data = await fetchCars();
                setPopularCars(data.filter(car => car.isPopular && car.isActive));
            } catch (err) {
                if (retriesLeft > 0) {
                    await new Promise(r => setTimeout(r, 2500));
                    return loadCars(retriesLeft - 1);
                }
                setError(err.message);
            }
        };

        Promise.allSettled([
            loadCars(2),
            fetchSettings()
                .then(data => setSettings({
                    phone: data.phone || '',
                    whatsapp: data.whatsapp || '',
                    email: data.email || '',
                    telegram: data.telegram || '',
                }))
                .catch(() => {}),
        ]).finally(() => setLoading(false));
    }, [refreshTick]);

    const setSetting = (key) => (e) =>
        setSettings(prev => ({ ...prev, [key]: e.target.value }));

    const handleSettingsUpdate = async () => {
        setSettingsSaving(true);
        setSettingsError(null);
        try {
            await updateSettings(settings);
            setSettingsSaved(true);
            setTimeout(() => setSettingsSaved(false), 2500);
        } catch (err) {
            setSettingsError(err.message);
        } finally {
            setSettingsSaving(false);
        }
    };

    return (
        <section className="admin-section">
            <div className='home-block'>
                <div className='home-title text-heading-lg'>Популярные модели на сайте</div>
                <div className='home-cards'>
                    {error && <p className="text-body-md">Ошибка: {error}</p>}
                    {loading
                        ? [0,1,2].map(i => <HomeCardSkeleton key={i} />)
                        : popularCars.map(car => <HomeCard key={car.id} car={car} onEdit={openModal} />)
                    }
                </div>
            </div>

            <div className="feedback-block">
                <div className="feed-title text-heading-xl">Актуальная информация на сайте</div>
                <div className="contact-card text-body-lg">
                    <div>
                        <span><img src={phoneIcon} alt="phoneIcon" />Номер телефона</span>
                        <div className="contact-input-row">
                            <input type="text" className='home-input text-caption' placeholder='+7 777 777 77 77'
                                value={settings.phone} onChange={setSetting('phone')} />
                            {settings.phone && (
                                <a href={`tel:${settings.phone.replace(/\s/g, '')}`} className="contact-preview-link text-caption" title="Позвонить">
                                    ↗
                                </a>
                            )}
                        </div>
                    </div>
                    <div>
                        <span><img src={whatsappIcon} alt="whatsappIcon" />Ссылка на Whatsapp</span>
                        <div className="contact-input-row">
                            <input type="text" className='home-input text-caption' placeholder='https://wa.me/77777777777'
                                value={settings.whatsapp} onChange={setSetting('whatsapp')} />
                            {settings.whatsapp && (
                                <a href={settings.whatsapp} className="contact-preview-link text-caption" target="_blank" rel="noopener noreferrer" title="Открыть">
                                    ↗
                                </a>
                            )}
                        </div>
                    </div>
                    <div>
                        <span><img src={mailIcon} alt="mailIcon" />Почта компании</span>
                        <div className="contact-input-row">
                            <input type="text" className='home-input text-caption' placeholder='info@electrovan.kz'
                                value={settings.email} onChange={setSetting('email')} />
                            {settings.email && (
                                <a href={`mailto:${settings.email}`} className="contact-preview-link text-caption" title="Написать">
                                    ↗
                                </a>
                            )}
                        </div>
                    </div>
                    <div>
                        <span><img src={telegramIcon} alt="telegramIcon" />Ссылка на Telegram</span>
                        <div className="contact-input-row">
                            <input type="text" className='home-input text-caption' placeholder='https://t.me/electrovan'
                                value={settings.telegram} onChange={setSetting('telegram')} />
                            {settings.telegram && (
                                <a href={settings.telegram} className="contact-preview-link text-caption" target="_blank" rel="noopener noreferrer" title="Открыть">
                                    ↗
                                </a>
                            )}
                        </div>
                    </div>
                </div>
                {settingsError && (
                    <p className="text-body-md" style={{ color: 'red', marginTop: 8 }}>{settingsError}</p>
                )}
                <button className='feed-button text-body-lg' onClick={handleSettingsUpdate} disabled={settingsSaving}>
                    {settingsSaved ? '✓ Сохранено' : settingsSaving ? 'Сохранение...' : 'Обновить информацию'}
                </button>
            </div>

            {modalOpen && <ProductModal />}
        </section>
    );
}

export default HomePage;
