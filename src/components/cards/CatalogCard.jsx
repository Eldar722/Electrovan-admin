import GEELYimg from '../../assets/images/image/populars_cars/admin_GEELY.png';
import tengeIcon from '../../assets/images/icons/homepage/tengeDark-icon.svg';
import peopleIcon from '../../assets/images/icons/cards/peoples-icon.svg';
import batteryIcon from '../../assets/images/icons/cards/battery-icon.svg';
import mapIcon from '../../assets/images/icons/cards/map-icon.svg';
import boxIcon from '../../assets/images/icons/cards/box-icon.svg';
import { useAdminStore } from '../../store/useAdminStore';

function CatalogCard({ car }) {
    const openModal = useAdminStore(s => s.openModal);
    const imgSrc = car.image_url || GEELYimg;

    return (
        <div className="cat-card-back">
            {!car.isActive && <div className="car-status-badge text-caption">Скрыто с сайта</div>}
            <img src={imgSrc} alt={`${car.brand} ${car.model}`} onError={e => { e.target.src = GEELYimg; }} />
            <div className="cat-card-menu">
                <div className='ccard-title text-body-sm'>{car.brand} {car.model}</div>
                <div className='ccard-text'>
                    <span className='text-caption'>
                        {(car.fullPrice ?? 0).toLocaleString('ru-RU')} <img src={tengeIcon} alt="tenge-icon" />
                    </span>
                </div>
            </div>
            <div className="cat-card-about text-caption">
                <span><img src={peopleIcon} alt='people' /> {car.seats != null ? `${car.seats} чел.` : '—'}</span>
                <span><img src={mapIcon} alt='range' /> {car.range != null ? `${car.range} км` : '—'}</span>
                <span><img src={batteryIcon} alt='battery' /> {car.battery != null ? `${car.battery} кВт·ч` : '—'}</span>
                <span><img src={boxIcon} alt='volume' /> {car.volume != null ? `${car.volume} м³` : '—'}</span>
            </div>
            <button
                type="button"
                className="ccard-edit-btn text-caption"
                onClick={() => openModal(car)}
            >
                Редактировать
            </button>
        </div>
    );
}

export default CatalogCard;
