import { useState, useEffect } from 'react';
import CatalogCard from "../components/cards/CatalogCard";
import ProductModal from "../components/modals/ProductModal";
import { fetchCars } from '../api/supabase';
import { useAdminStore } from '../store/useAdminStore';

function CatalogCardSkeleton() {
    return (
        <div className="skeleton-ccard">
            <div className="skeleton skeleton-ccard-img" />
            <div className="skeleton skeleton-ccard-line" />
            <div className="skeleton skeleton-ccard-sub" />
            <div className="skeleton-ccard-grid">
                {[0,1,2,3].map(i => <div key={i} className="skeleton skeleton-ccard-cell" />)}
            </div>
            <div className="skeleton skeleton-ccard-btn" />
        </div>
    );
}

function CatalogPage() {
    const [cars, setCars] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const modalOpen = useAdminStore(s => s.modalOpen);
    const refreshTick = useAdminStore(s => s.refreshTick);

    useEffect(() => {
        let cancelled = false;
        const attempt = async (retriesLeft) => {
            try {
                const data = await fetchCars();
                if (!cancelled) {
                    setCars(data);
                    setError(null);
                    setLoading(false);
                }
            } catch (err) {
                if (retriesLeft > 0) {
                    await new Promise(r => setTimeout(r, 2500));
                    return attempt(retriesLeft - 1);
                }
                if (!cancelled) {
                    setError(err.message);
                    setLoading(false);
                }
            }
        };
        attempt(2);
        return () => {
            cancelled = true;
        };
    }, [refreshTick]);

    if (error) return <section className="admin-section"><p className="text-body-md">Ошибка: {error}</p></section>;

    return (
        <section className="admin-section">
            <div className="cat-cards">
                {loading
                    ? [0,1,2,3,4,5].map(i => <CatalogCardSkeleton key={i} />)
                    : cars.map(car => <CatalogCard key={car.id} car={car} />)
                }
            </div>
            {modalOpen && <ProductModal />}
        </section>
    );
}

export default CatalogPage;
