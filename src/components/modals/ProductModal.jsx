import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import crossIcon from '../../assets/images/icons/cards/cross-icon.svg';
import GEELYimg from '../../assets/images/image/populars_cars/admin_GEELY.png';
import { addCar, updateCar, deleteCar, uploadCarImage } from '../../api/supabase';
import { useAdminStore } from '../../store/useAdminStore';

const CATEGORIES = ['Грузовой', 'Пассажирский', 'Грузо-Пассажирский'];
const USED_IN_OPTIONS = ['Ремонт и строительство', 'Аренда', 'Логистика', 'Туризм'];

const EMPTY = {
    brand: '', model: '', category: CATEGORIES[0],
    description: '',
    price: '', seats: '', battery: '', range: '',
    volume: '', capacity: '', weight: '', dim_l: '', dim_w: '', dim_h: '',
    is_popular: false, is_active: true, image_url: '',
    used_in: [],
};

function parseDimensions(str) {
    if (!str) return { dim_l: '', dim_w: '', dim_h: '' };
    const parts = str.split(/[×x\s]+/).map(s => s.trim()).filter(Boolean);
    return { dim_l: parts[0] || '', dim_w: parts[1] || '', dim_h: parts[2] || '' };
}

function toFormState(car) {
    // Prefer normalized numeric fields (Number | null) over raw text columns.
    // Fall back to raw only for fields not produced by normalizeCar.
    return {
        brand: car.brand ?? '',
        model: car.model ?? '',
        category: car.category ?? CATEGORIES[0],
        description: car.description ?? '',
        price: car.fullPrice ?? '',
        seats: car.seats ?? '',
        battery: car.battery ?? '',
        range: car.range ?? '',
        volume: car.volume ?? '',
        capacity: car.capacity ?? '',
        weight: car.weight ?? '',
        ...parseDimensions(car.dimensions ?? ''),
        is_popular: car.isPopular ?? car.is_popular ?? false,
        is_active: car.isActive ?? car.is_active ?? true,
        image_url: car.image_url ?? '',
        used_in: Array.isArray(car.usedIn) ? car.usedIn : (Array.isArray(car.used_in) ? car.used_in : []),
    };
}

function ProductModal() {
    const { editingCar, closeModal, triggerRefresh } = useAdminStore();
    const isEdit = editingCar !== null;

    const [form, setForm] = useState(() => isEdit ? toFormState(editingCar) : EMPTY);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState(null);
    const [isClosing, setIsClosing] = useState(false);
    const fileRef = useRef(null);
    const modalRef = useRef(null);
    const triggerRef = useRef(null);

    const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

    const toggleUsedIn = (option) => {
        setForm(prev => ({
            ...prev,
            used_in: prev.used_in.includes(option)
                ? prev.used_in.filter(v => v !== option)
                : [...prev.used_in, option],
        }));
    };

    const handleClose = useCallback(() => {
        setIsClosing(true);
        setTimeout(() => {
            closeModal();
            triggerRef.current?.focus();
        }, 300);
    }, [closeModal]);

    // Lock body scroll while modal is open
    useEffect(() => {
        const prev = document.body.style.overflow;
        triggerRef.current = document.activeElement;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, []);

    // Escape key to close
    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key === 'Escape') handleClose();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [handleClose]);

    // Focus trap
    useEffect(() => {
        const el = modalRef.current;
        if (!el) return;
        const handleTab = (e) => {
            if (e.key !== 'Tab') return;
            const focusable = el.querySelectorAll(
                'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            );
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last  = focusable[focusable.length - 1];
            if (e.shiftKey) {
                if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
            } else {
                if (document.activeElement === last)  { e.preventDefault(); first?.focus(); }
            }
        };
        document.addEventListener('keydown', handleTab);
        return () => document.removeEventListener('keydown', handleTab);
    }, []);

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const MAX_SIZE = 5 * 1024 * 1024;
        const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
        if (file.size > MAX_SIZE) { setError('Файл больше 5 MB'); return; }
        if (!ALLOWED.includes(file.type)) { setError('Только JPG, PNG, WebP'); return; }

        try {
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const path = `${Date.now()}-${safeName}`;
            const url = await uploadCarImage(file, path);
            set('image_url', url);
            setError(null);
        } catch (err) {
            setError('Ошибка загрузки: ' + err.message);
        }
    };

    const buildPayload = () => {
        const imageUrl = form.image_url.trim() || null;
        return {
            brand: form.brand.trim(),
            model: form.model.trim(),
            category: form.category,
            description: form.description.trim() || null,
            price: Math.max(0, Number(form.price) || 0),
            full_price: Math.max(0, Number(form.price) || 0),
            seats: form.seats ? Math.max(1, Number(form.seats)) : null,
            battery: form.battery ? Math.max(0, Number(form.battery)) : null,
            range: form.range ? Math.max(0, Number(form.range)) : null,
            volume: form.volume ? Math.max(0, Number(form.volume)) : null,
            capacity: form.capacity ? Math.max(0, Number(form.capacity)) : null,
            weight: form.weight ? Math.max(0, Number(form.weight)) : null,
            dimensions: [form.dim_l, form.dim_w, form.dim_h].map(v => v.toString().trim()).filter(Boolean).join('×') || null,
            is_popular: form.is_popular,
            is_active: form.is_active,
            // One image URL used for all three display contexts.
            // DB keeps three columns for future per-context overrides.
            image_url: imageUrl,
            modal_image_url: imageUrl,
            popular_bg_url: imageUrl,
            used_in: form.used_in.filter(v => USED_IN_OPTIONS.includes(v)),
        };
    };

    const handleSave = async () => {
        if (!form.brand || !form.model) {
            setError('Укажите бренд и модель');
            return;
        }
        setError(null);
        setSaving(true);
        try {
            if (isEdit) {
                await updateCar(editingCar.id, buildPayload());
            } else {
                await addCar(buildPayload());
            }
            triggerRefresh();
            handleClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm(`Удалить ${editingCar.brand} ${editingCar.model}?`)) return;
        setDeleting(true);
        try {
            await deleteCar(editingCar.id);
            triggerRefresh();
            handleClose();
        } catch (err) {
            setError(err.message);
            setDeleting(false);
        }
    };

    const previewImg = form.image_url || GEELYimg;

    return createPortal(
        <section
            ref={modalRef}
            className={`product-modal${isClosing ? ' closing' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label={isEdit ? `Редактировать ${editingCar.brand} ${editingCar.model}` : 'Добавить авто'}
            onClick={handleClose}
        >
            <div
                className={`product-back${isClosing ? ' closing' : ''}`}
                onClick={e => e.stopPropagation()}
            >
                <div className='product-header'>
                    <button type="button" onClick={handleClose} aria-label="Закрыть" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        <img src={crossIcon} alt="" aria-hidden="true" />
                    </button>
                    <div className="product-title-main text-heading-lg">
                        {isEdit ? 'Редактировать авто' : 'Добавить авто'}
                    </div>
                </div>

                <div className="product-main">
                    <div className='image-place'>
                        <img src={previewImg} alt="car preview" onError={e => { e.target.src = GEELYimg; }} />
                        <button type="button" className='image-switch-btn text-body-md' onClick={() => fileRef.current?.click()}>
                            Изменить картинку
                        </button>
                        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                        <input
                            className='text-body-md'
                            type="text"
                            placeholder='или вставьте URL картинки'
                            value={form.image_url}
                            onChange={e => set('image_url', e.target.value)}
                            style={{ marginTop: 8, width: '100%' }}
                        />
                    </div>

                    <div className='product-main-info'>
                        <div className="block-p">
                            <span className='text-body-lg'>Бренд</span>
                            <input className='text-body-md' type="text" placeholder='Geely' value={form.brand} onChange={e => set('brand', e.target.value)} />
                        </div>
                        <div className="block-p">
                            <span className='text-body-lg'>Модель</span>
                            <input className='text-body-md' type="text" placeholder='Farizon SuperVan' value={form.model} onChange={e => set('model', e.target.value)} />
                        </div>
                        <div className="block-p">
                            <span className='text-body-lg'>Категория авто</span>
                            <select value={form.category} onChange={e => set('category', e.target.value)}>
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="block-p">
                            <span className='text-body-lg'>Описание</span>
                            <textarea
                                className='text-body-md'
                                placeholder='Краткое описание автомобиля'
                                value={form.description}
                                onChange={e => set('description', e.target.value)}
                                rows={3}
                                style={{ resize: 'vertical', width: '100%' }}
                            />
                        </div>
                        <div className="block-p">
                            <span className='text-body-lg'>Цена авто</span>
                            <input className='text-body-md' type="number" placeholder='12000000' value={form.price} onChange={e => set('price', e.target.value)} />
                        </div>
                        <div className="block-p">
                            <span className='text-body-lg'>
                                <label>
                                    <input type="checkbox" checked={form.is_popular} onChange={e => set('is_popular', e.target.checked)} style={{ marginRight: 6 }} />
                                    Популярный
                                </label>
                            </span>
                        </div>
                        <div className="block-p">
                            <span className='text-body-lg'>
                                <label>
                                    <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} style={{ marginRight: 6 }} />
                                    Активно на сайте
                                </label>
                            </span>
                        </div>
                    </div>
                </div>

                <div className='product-sub-info'>
                    <div className='info-text'>
                        <div className="product-title text-heading-lg">Технические характеристики</div>
                    </div>
                    <div className='category-block'>
                        <div className='one-categoty'>
                            <span className='text-body-lg'>Габариты (мм)</span>
                            <div className='category-input dims-input'>
                                <input type="number" placeholder='Длина' value={form.dim_l} onChange={e => set('dim_l', e.target.value)} />
                                <span className='dims-sep'>×</span>
                                <input type="number" placeholder='Ширина' value={form.dim_w} onChange={e => set('dim_w', e.target.value)} />
                                <span className='dims-sep'>×</span>
                                <input type="number" placeholder='Высота' value={form.dim_h} onChange={e => set('dim_h', e.target.value)} />
                            </div>
                        </div>
                        <span className='spanned-category'>
                            <div className='one-categoty'>
                                <span className='text-body-lg'>Объем кузова (m³)</span>
                                <div className='category-input-n'>
                                    <input type="number" placeholder='9.39' value={form.volume} onChange={e => set('volume', e.target.value)} />
                                </div>
                            </div>
                            <div className='one-categoty'>
                                <span className='text-body-lg'>Грузоподъемность (кг)</span>
                                <div className='category-input-n'>
                                    <input type="number" placeholder='1500' value={form.capacity} onChange={e => set('capacity', e.target.value)} />
                                </div>
                            </div>
                            <div className='one-categoty'>
                                <span className='text-body-lg'>Вес автомобиля (т)</span>
                                <div className='category-input-n'>
                                    <input type="number" step="0.1" placeholder='2.5' value={form.weight} onChange={e => set('weight', e.target.value)} />
                                </div>
                            </div>
                        </span>
                        <span className='spanned-category2'>
                            <div className='one-categoty'>
                                <span className='text-body-lg'>Сидячие места</span>
                                <div className='category-input'>
                                    <input type="number" placeholder='10' value={form.seats} onChange={e => set('seats', e.target.value)} />
                                </div>
                            </div>
                            <div className='one-categoty'>
                                <span className='text-body-lg'>Объем батареи (кВт*ч)</span>
                                <div className='category-input'>
                                    <input type="number" placeholder='83' value={form.battery} onChange={e => set('battery', e.target.value)} />
                                </div>
                            </div>
                            <div className='one-categoty'>
                                <span className='text-body-lg'>Запас хода (км)</span>
                                <div className='category-input'>
                                    <input type="number" placeholder='450' value={form.range} onChange={e => set('range', e.target.value)} />
                                </div>
                            </div>
                        </span>
                    </div>

                    <div className='info-text'>
                        <div className="product-title text-heading-lg">Конфигурация</div>
                    </div>
                    <div className='configuration-block'>
                        <div className='one-configuration'>
                            <span className='text-body-lg'>Сферы использования</span>
                            <div className='buttons-bar'>
                                {USED_IN_OPTIONS.map(opt => (
                                    <button
                                        key={opt}
                                        type="button"
                                        className={form.used_in.includes(opt) ? 'active' : ''}
                                        onClick={() => toggleUsedIn(opt)}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {error && (
                    <p className="text-body-md" style={{ color: 'red', padding: '0 24px' }}>{error}</p>
                )}

                <div className='final-button'>
                    {isEdit && (
                        <button type="button" onClick={handleDelete} disabled={deleting}>
                            {deleting ? 'Удаление...' : 'Удалить авто'}
                        </button>
                    )}
                    <button type="button" onClick={handleSave} disabled={saving}>
                        {saving ? 'Сохранение...' : 'Сохранить'}
                    </button>
                </div>
            </div>
        </section>,
        document.body
    );
}

export default ProductModal;
