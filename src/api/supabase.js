import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

function isMissingColumnError(error, columnName, tableName) {
    return error?.code === '42703' || String(error?.message || '').includes(`column ${tableName}.${columnName} does not exist`);
}

function withoutField(data, field) {
    const { [field]: _removed, ...rest } = data;
    return rest;
}

// ─── Number coercion ─────────────────────────────────────────
// All "numeric" columns in DB are TEXT and may contain dot/comma/space
// digit-grouping (e.g. "12.000.000", "12 000 000") or decimal commas ("9,3").
// Detect grouping pattern, strip separators, return finite Number or null.
function toNum(v) {
    if (v == null) return null;
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    let s = String(v).trim().replace(/\s/g, '');
    if (!s) return null;
    if (/^\d{1,3}(\.\d{3})+$/.test(s))      s = s.replace(/\./g, '');   // 12.000.000
    else if (/^\d{1,3}(,\d{3})+$/.test(s))  s = s.replace(/,/g, '');    // 12,000,000
    else                                    s = s.replace(',', '.');    // 9,3
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : null;
}

export function normalizeCar(raw) {
    if (!raw || typeof raw !== 'object') return null;
    return {
        ...raw,
        // camelCase aliases
        isPopular:  raw.is_popular ?? false,
        isActive:   raw.is_active ?? true,
        usedIn:     Array.isArray(raw.used_in) ? raw.used_in : [],
        // Numeric coercions
        fullPrice:  toNum(raw.full_price ?? raw.price),
        priceNum:   toNum(raw.price),
        battery:    toNum(raw.battery),
        range:      toNum(raw.range),
        volume:     toNum(raw.volume),
        capacity:   toNum(raw.capacity),
        weight:     toNum(raw.weight),
    };
}

// ─── Cars ────────────────────────────────────────────────────

export async function fetchCars() {
    const { data, error } = await supabase
        .from('cars')
        .select('*')
        .order('id');
    if (error) throw error;
    return data.map(normalizeCar).filter(Boolean);
}

export async function addCar(car) {
    const { data, error } = await supabase
        .from('cars')
        .insert(car)
        .select()
        .single();
    if (error && isMissingColumnError(error, 'is_active', 'cars') && 'is_active' in car) {
        const retry = await supabase
            .from('cars')
            .insert(withoutField(car, 'is_active'))
            .select()
            .single();
        if (retry.error) throw retry.error;
        return retry.data;
    }
    if (error) throw error;
    return data;
}

export async function updateCar(id, updates) {
    const { data, error } = await supabase
        .from('cars')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    if (error && isMissingColumnError(error, 'is_active', 'cars') && 'is_active' in updates) {
        const retry = await supabase
            .from('cars')
            .update(withoutField(updates, 'is_active'))
            .eq('id', id)
            .select()
            .single();
        if (retry.error) throw retry.error;
        return retry.data;
    }
    if (error) throw error;
    return data;
}

export async function deleteCar(id) {
    const { error } = await supabase
        .from('cars')
        .delete()
        .eq('id', id);
    if (error) throw error;
}

// ─── Leads (server-side pagination, filtering, search) ───────

/**
 * Fetch leads with server-side pagination, status filter, and search.
 * @param {Object} options
 * @param {number} options.page        - 1-based page number
 * @param {number} options.pageSize    - items per page
 * @param {string} [options.status]    - status filter ('new', 'in_progress', 'done', 'cancelled') or 'all'/undefined
 * @param {string} [options.search]    - search query (matches name or phone via ilike)
 * @returns {{ data: Array, count: number }}
 */
export async function fetchLeadsPaginated({ page = 1, pageSize = 8, status, search } = {}) {
    let query = supabase
        .from('leads')
        .select('*', { count: 'exact' })
        .order('id', { ascending: false });

    // Server-side status filter
    if (status && status !== 'all') {
        query = query.eq('status', status);
    }

    // Server-side search — match name or phone
    if (search && search.trim()) {
        const term = `%${search.trim()}%`;
        query = query.or(`name.ilike.${term},phone.ilike.${term}`);
    }

    // Server-side pagination via range
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: data || [], count: count || 0 };
}

/**
 * Fetch counts for each lead status for the summary cards.
 * Uses a single query with count and groups on the client,
 * but limits to just id + status columns to minimize payload.
 */
export async function fetchLeadCounts() {
    const { data, error } = await supabase
        .from('leads')
        .select('status', { count: 'exact' });
    if (error) throw error;

    const counts = { all: data.length, new: 0, in_progress: 0, done: 0, cancelled: 0 };
    for (const row of data) {
        const s = row.status || 'new';
        if (s in counts) counts[s]++;
    }
    return counts;
}

// Keep legacy fetchLeads for backward compat (realtime handler uses it)
export async function fetchLeads() {
    const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('id', { ascending: false });
    if (error) throw error;
    return data;
}

// ─── Auth ────────────────────────────────────────────────────

export async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
}

export async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}

export function getSession() {
    return supabase.auth.getSession();
}

export function onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
}

export async function checkIsAdmin(userId) {
    const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();
    if (error) return false;
    return data?.role === 'admin';
}

// ─── Site Settings ───────────────────────────────────────────

export async function fetchSettings() {
    const { data, error } = await supabase
        .from('site_settings')
        .select('phone, whatsapp, email, telegram')
        .eq('id', 1)
        .single();
    if (error) throw error;
    return data;
}

export async function updateSettings(updates) {
    const { data, error } = await supabase
        .from('site_settings')
        .update(updates)
        .eq('id', 1)
        .select()
        .single();
    if (error) throw error;
    return data;
}

// ─── Lead Status ─────────────────────────────────────────────

export async function updateLeadStatus(id, status) {
    return updateLead(id, { status });
}

export async function updateLead(id, updates) {
    const { data, error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
}

// ─── Storage ─────────────────────────────────────────────────

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function uploadCarImage(file, path) {
    if (!ALLOWED_MIME.includes(file.type)) {
        throw new Error('Неподдерживаемый формат. Только JPG, PNG, WebP');
    }
    if (file.size > MAX_FILE_SIZE) {
        throw new Error('Файл больше 5 MB');
    }
    const { data, error } = await supabase.storage
        .from('cars')
        .upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage
        .from('cars')
        .getPublicUrl(data.path);
    return publicUrl;
}
