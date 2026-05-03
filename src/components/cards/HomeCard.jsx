import GEELYimg from '../../assets/images/image/populars_cars/admin_GEELY.png';
import tengeIcon from '../../assets/images/icons/homepage/tengeDark-icon.svg';
import peopleIcon from '../../assets/images/icons/cards/peoples-icon.svg';
import batteryIcon from '../../assets/images/icons/cards/battery-icon.svg';
import mapIcon from '../../assets/images/icons/cards/map-icon.svg';
import boxIcon from '../../assets/images/icons/cards/box-icon.svg';

function HomeCard({ car, onEdit }) {
    return (
        <div className="card-back">
            <img src={car.image_url || GEELYimg} alt={`${car.brand} ${car.model}`} />
            <div className='hcard-title text-heading-lg'>{car.brand} {car.model}</div>
            <div className='hcard-text text-body-md'>
                <span className="groupe-text">{car.category}</span>
                <span className='text-body-lg'>
                    {(car.fullPrice ?? 0).toLocaleString('ru-RU')} <img src={tengeIcon} alt="tenge-icon" />
                </span>
            </div>
            <div className='card-about'>
                <span><img src={peopleIcon} alt='people' /> {car.seats != null ? `${car.seats} чел.` : '—'}</span>
                <span><img src={batteryIcon} alt='battery' /> {car.battery != null ? `${car.battery} кВт·ч` : '—'}</span>
                <span><img src={mapIcon} alt='range' /> {car.range != null ? `${car.range} км` : '—'}</span>
                <span><img src={boxIcon} alt='volume' /> {car.volume != null ? `${car.volume} м³` : '—'}</span>
            </div>
            <button
                type="button"
                className="ccard-edit-btn text-caption"
                onClick={() => onEdit?.(car)}
            >
                Редактировать
            </button>
        </div>
    );
}

export default HomeCard;
