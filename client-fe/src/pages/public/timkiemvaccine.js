import { getMethod }   from '../../services/request';
import { formatMoney } from '../../services/money';
import { useState, useEffect, useMemo } from 'react';
import ReactPaginate from 'react-paginate';

/* ── palette ───────────────────────────────────────── */
const PRIMARY_L = '#2A388F';
const ACCENT    = '#0ea5e9';
const PAGE_SIZE = 12;

/* ══════════════════════════════════════════════════ */
function TimKiemVacxin() {
    /* ── raw data ── */
    const [allVaccines,   setAllVaccines]   = useState([]);
    const [loading,       setLoading]       = useState(true);

    /* ── filter state ── */
    const [inputVal,      setInputVal]      = useState('');   // controlled input
    const [search,        setSearch]        = useState('');   // committed search term
    const [priceMin,      setPriceMin]      = useState('');
    const [priceMax,      setPriceMax]      = useState('');
    const [selectedMfr,   setSelectedMfr]   = useState('');   // manufacturer
    const [sort,          setSort]          = useState('default');
    const [currentPage,   setCurrentPage]   = useState(0);
    const [showFilter,    setShowFilter]    = useState(false); // mobile toggle

    /* ── load ALL vaccines once ── */
    useEffect(() => {
        const uls   = new URL(document.URL);
        const param = uls.searchParams.get('search') || '';
        setSearch(param);
        setInputVal(param);

        const load = async () => {
            setLoading(true);
            try {
                const res  = await getMethod('/api/vaccine/public/search-by-param?search=&size=1000&page=0');
                const data = await res.json();
                setAllVaccines(data.content ?? []);
            } catch { setAllVaccines([]); }
            setLoading(false);
        };
        load();
    }, []);

    /* ── derived: unique manufacturers ── */
    const manufacturers = useMemo(() => {
        const names = allVaccines.map(v => v.manufacturer?.name).filter(Boolean);
        return [...new Set(names)].sort();
    }, [allVaccines]);

    /* ── derived: price bounds for placeholder ── */
    const { minPrice, maxPrice } = useMemo(() => {
        const prices = allVaccines.map(v => v.price).filter(p => p > 0);
        return prices.length
            ? { minPrice: Math.min(...prices), maxPrice: Math.max(...prices) }
            : { minPrice: 0, maxPrice: 0 };
    }, [allVaccines]);

    /* ── derived: filtered + sorted list ── */
    const filtered = useMemo(() => {
        let list = [...allVaccines];

        /* text search */
        if (search) {
            const q = search.toLowerCase();
            list = list.filter(v =>
                v.name?.toLowerCase().includes(q) ||
                v.manufacturer?.name?.toLowerCase().includes(q) ||
                v.vaccineType?.typeName?.toLowerCase().includes(q)
            );
        }

        /* price range */
        if (priceMin !== '') list = list.filter(v => (v.price || 0) >= Number(priceMin));
        if (priceMax !== '') list = list.filter(v => (v.price || 0) <= Number(priceMax));

        /* manufacturer */
        if (selectedMfr) list = list.filter(v => v.manufacturer?.name === selectedMfr);

        /* sort */
        if (sort === 'price-asc')  list.sort((a, b) => (a.price || 0) - (b.price || 0));
        if (sort === 'price-desc') list.sort((a, b) => (b.price || 0) - (a.price || 0));
        if (sort === 'name-az')    list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        if (sort === 'name-za')    list.sort((a, b) => (b.name || '').localeCompare(a.name || ''));

        return list;
    }, [allVaccines, search, priceMin, priceMax, selectedMfr, sort]);

    /* ── client-side pagination ── */
    const pageCount  = Math.ceil(filtered.length / PAGE_SIZE);
    const safePage   = Math.min(currentPage, Math.max(0, pageCount - 1));
    const displayed  = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

    /* ── handlers ── */
    const handleSearch = (e) => {
        e.preventDefault();
        setSearch(inputVal.trim());
        setCurrentPage(0);
        const newUrl = inputVal.trim()
            ? `/tim-kiem-vaccine?search=${encodeURIComponent(inputVal.trim())}`
            : '/tim-kiem-vaccine';
        window.history.pushState({}, '', newUrl);
    };

    const handlePageClick = ({ selected }) => {
        setCurrentPage(selected);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const clearAll = () => {
        setSearch(''); setInputVal('');
        setPriceMin(''); setPriceMax('');
        setSelectedMfr(''); setSort('default');
        setCurrentPage(0);
        window.history.pushState({}, '', '/tim-kiem-vaccine');
    };

    const hasFilter = search || priceMin || priceMax || selectedMfr;

    /* ── active filter tags ── */
    const activeTags = [
        search     && { label: `"${search}"`,                   onRemove: () => { setSearch(''); setInputVal(''); } },
        selectedMfr && { label: `NSX: ${selectedMfr}`,          onRemove: () => setSelectedMfr('') },
        priceMin   && { label: `Từ ${formatMoney(priceMin)}đ`,  onRemove: () => setPriceMin('') },
        priceMax   && { label: `Đến ${formatMoney(priceMax)}đ`, onRemove: () => setPriceMax('') },
    ].filter(Boolean);

    /* ════════════════════════════════════════════════
       RENDER
    ════════════════════════════════════════════════ */
    return (
        <div style={{ background: '#f8fafc', minHeight: '100vh' }}>

            {/* ── HERO / SEARCH BAR ── */}
            <div style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #0284c7 100%)',
                padding: '48px 24px 96px',
                position: 'relative', overflow: 'hidden',
            }}>
                <div style={{ position:'absolute', top:'-60px', right:'-60px', width:'280px', height:'280px', background:'rgba(14,165,233,0.15)', borderRadius:'50%', filter:'blur(50px)', pointerEvents:'none' }}/>
                <div style={{ position:'absolute', bottom:'-40px', left:'5%', width:'200px', height:'200px', background:'rgba(16,185,129,0.12)', borderRadius:'50%', filter:'blur(40px)', pointerEvents:'none' }}/>

                <div style={{ maxWidth: '720px', margin: '0 auto', textAlign: 'center', position: 'relative' }}>
                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', marginBottom: '18px' }}>
                        <a href="/" style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>Trang chủ</a>
                        <span style={{ margin: '0 6px' }}>›</span>
                        <span style={{ color: '#fff' }}>Tìm kiếm vaccine</span>
                    </div>

                    <h1 style={{
                        fontSize: 'clamp(22px,3.5vw,36px)', fontWeight: '800',
                        color: '#fff', marginBottom: '10px', lineHeight: '1.2',
                    }}>
                        {search ? `Kết quả cho "${search}"` : 'Tất cả vaccine'}
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '15px', marginBottom: '28px' }}>
                        Tìm kiếm và lọc vaccine theo giá, nhà sản xuất, danh mục
                    </p>

                    <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', maxWidth: '580px', margin: '0 auto' }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <span style={{ position:'absolute', left:'14px', top:'50%', transform:'translateY(-50%)', fontSize:'17px', pointerEvents:'none' }}>🔍</span>
                            <input
                                type="text"
                                placeholder="Tên vaccine, nhà sản xuất, danh mục..."
                                value={inputVal}
                                onChange={e => setInputVal(e.target.value)}
                                style={{
                                    width:'100%', paddingLeft:'44px', paddingRight:'14px',
                                    height:'50px', border:'none', borderRadius:'12px',
                                    fontSize:'15px', outline:'none', boxSizing:'border-box',
                                    boxShadow:'0 4px 16px rgba(0,0,0,0.2)',
                                }}
                            />
                        </div>
                        <button type="submit" style={{
                            padding:'0 26px', height:'50px', flexShrink:0,
                            background:'linear-gradient(135deg,#10b981,#059669)',
                            border:'none', borderRadius:'12px',
                            color:'#fff', fontSize:'15px', fontWeight:'700',
                            cursor:'pointer', whiteSpace:'nowrap',
                            boxShadow:'0 4px 14px rgba(16,185,129,0.4)',
                        }}>
                            Tìm kiếm
                        </button>
                    </form>
                </div>
            </div>

            {/* ── FILTER + RESULTS AREA ── */}
            <div style={{ maxWidth: '1200px', margin: '-44px auto 0', padding: '0 24px 72px', position: 'relative', zIndex: 10 }}>

                {/* ── Filter panel ── */}
                <div style={{
                    background: '#fff', borderRadius: '16px', marginBottom: '20px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                    overflow: 'hidden',
                }}>
                    {/* Filter header */}
                    <div style={{
                        padding: '16px 24px', display: 'flex',
                        alignItems: 'center', justifyContent: 'space-between',
                        borderBottom: showFilter ? '1px solid #f1f5f9' : 'none',
                        cursor: 'pointer',
                        userSelect: 'none',
                    }} onClick={() => setShowFilter(s => !s)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '18px' }}>⚙️</span>
                            <span style={{ fontWeight: '700', color: '#1e293b', fontSize: '15px' }}>Bộ lọc tìm kiếm</span>
                            {hasFilter && (
                                <span style={{
                                    background: PRIMARY_L, color: '#fff',
                                    borderRadius: '20px', padding: '2px 10px',
                                    fontSize: '12px', fontWeight: '700',
                                }}>
                                    {activeTags.length} lọc đang áp dụng
                                </span>
                            )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {hasFilter && (
                                <button
                                    onClick={e => { e.stopPropagation(); clearAll(); }}
                                    style={{
                                        background: '#fef2f2', border: '1px solid #fca5a5',
                                        borderRadius: '8px', padding: '5px 14px',
                                        fontSize: '13px', color: '#dc2626',
                                        cursor: 'pointer', fontWeight: '600',
                                    }}
                                >
                                    ✕ Xoá tất cả
                                </button>
                            )}
                            <span style={{ fontSize: '18px', color: '#94a3b8', transition: 'transform 0.2s', display: 'inline-block', transform: showFilter ? 'rotate(180deg)' : 'none' }}>▾</span>
                        </div>
                    </div>

                    {/* Filter rows */}
                    {showFilter && (
                        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                            {/* Row 1: Manufacturer + Sort */}
                            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                {/* Manufacturer */}
                                <div style={{ flex: '1 1 260px' }}>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '8px' }}>
                                        🏭 Nhà sản xuất
                                    </label>
                                    <select
                                        value={selectedMfr}
                                        onChange={e => { setSelectedMfr(e.target.value); setCurrentPage(0); }}
                                        style={{
                                            width: '100%', height: '44px', padding: '0 14px',
                                            border: `1.5px solid ${selectedMfr ? ACCENT : '#e2e8f0'}`,
                                            borderRadius: '10px', fontSize: '14px', color: '#1e293b',
                                            background: selectedMfr ? '#f0f9ff' : '#fff',
                                            cursor: 'pointer', outline: 'none',
                                        }}
                                    >
                                        <option value="">Tất cả nhà sản xuất</option>
                                        {manufacturers.map((mfr, i) => (
                                            <option key={i} value={mfr}>{mfr}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Sort */}
                                <div style={{ flex: '1 1 200px' }}>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '8px' }}>
                                        📊 Sắp xếp
                                    </label>
                                    <select
                                        value={sort}
                                        onChange={e => { setSort(e.target.value); setCurrentPage(0); }}
                                        style={{
                                            width: '100%', height: '44px', padding: '0 14px',
                                            border: '1.5px solid #e2e8f0', borderRadius: '10px',
                                            fontSize: '14px', color: '#1e293b',
                                            background: '#fff', cursor: 'pointer', outline: 'none',
                                        }}
                                    >
                                        <option value="default">Mặc định</option>
                                        <option value="name-az">Tên A → Z</option>
                                        <option value="name-za">Tên Z → A</option>
                                        <option value="price-asc">Giá thấp → cao</option>
                                        <option value="price-desc">Giá cao → thấp</option>
                                    </select>
                                </div>
                            </div>

                            {/* Row 2: Price range */}
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '8px' }}>
                                    💰 Khoảng giá (VNĐ)
                                </label>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <div style={{ position: 'relative', flex: '1 1 180px' }}>
                                        <input
                                            type="number"
                                            placeholder={minPrice ? `Từ ${formatMoney(minPrice)}đ` : 'Giá từ...'}
                                            value={priceMin}
                                            min={0}
                                            onChange={e => { setPriceMin(e.target.value); setCurrentPage(0); }}
                                            style={{
                                                width: '100%', height: '44px',
                                                padding: '0 14px', boxSizing: 'border-box',
                                                border: `1.5px solid ${priceMin ? ACCENT : '#e2e8f0'}`,
                                                borderRadius: '10px', fontSize: '14px',
                                                background: priceMin ? '#f0f9ff' : '#fff',
                                                outline: 'none',
                                            }}
                                            onFocus={e => e.target.style.borderColor = ACCENT}
                                            onBlur={e  => e.target.style.borderColor = priceMin ? ACCENT : '#e2e8f0'}
                                        />
                                    </div>

                                    <span style={{ color: '#94a3b8', fontWeight: '700', fontSize: '18px', flexShrink: 0 }}>—</span>

                                    <div style={{ flex: '1 1 180px' }}>
                                        <input
                                            type="number"
                                            placeholder={maxPrice ? `Đến ${formatMoney(maxPrice)}đ` : 'Giá đến...'}
                                            value={priceMax}
                                            min={0}
                                            onChange={e => { setPriceMax(e.target.value); setCurrentPage(0); }}
                                            style={{
                                                width: '100%', height: '44px',
                                                padding: '0 14px', boxSizing: 'border-box',
                                                border: `1.5px solid ${priceMax ? ACCENT : '#e2e8f0'}`,
                                                borderRadius: '10px', fontSize: '14px',
                                                background: priceMax ? '#f0f9ff' : '#fff',
                                                outline: 'none',
                                            }}
                                            onFocus={e => e.target.style.borderColor = ACCENT}
                                            onBlur={e  => e.target.style.borderColor = priceMax ? ACCENT : '#e2e8f0'}
                                        />
                                    </div>

                                    {/* Quick price presets */}
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flex: '2 1 240px' }}>
                                        {[
                                            { label: 'Dưới 200K',    min: '',       max: 200000  },
                                            { label: '200K – 500K',  min: 200000,   max: 500000  },
                                            { label: '500K – 1TR',   min: 500000,   max: 1000000 },
                                            { label: 'Trên 1TR',     min: 1000000,  max: ''      },
                                        ].map((p, i) => {
                                            const active = String(priceMin) === String(p.min) && String(priceMax) === String(p.max);
                                            return (
                                                <button
                                                    key={i}
                                                    onClick={() => { setPriceMin(p.min); setPriceMax(p.max); setCurrentPage(0); }}
                                                    style={{
                                                        padding: '6px 14px', borderRadius: '8px', cursor: 'pointer',
                                                        fontSize: '12px', fontWeight: '700',
                                                        border: `1.5px solid ${active ? PRIMARY_L : '#e2e8f0'}`,
                                                        background: active ? PRIMARY_L : '#fff',
                                                        color: active ? '#fff' : '#475569',
                                                        transition: 'all 0.15s',
                                                    }}
                                                >
                                                    {p.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Active filter tags */}
                    {activeTags.length > 0 && (
                        <div style={{
                            padding: '12px 24px',
                            borderTop: '1px solid #f1f5f9',
                            display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center',
                        }}>
                            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>Đang lọc:</span>
                            {activeTags.map((tag, i) => (
                                <span key={i} style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                                    background: '#e0f2fe', color: '#0369a1',
                                    borderRadius: '20px', padding: '4px 12px',
                                    fontSize: '13px', fontWeight: '600',
                                }}>
                                    {tag.label}
                                    <button
                                        onClick={tag.onRemove}
                                        style={{
                                            background: 'none', border: 'none',
                                            cursor: 'pointer', color: '#0369a1',
                                            padding: 0, lineHeight: 1, fontSize: '14px',
                                            display: 'flex', alignItems: 'center',
                                        }}
                                    >
                                        ×
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Stats row ── */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', flexWrap: 'wrap', gap: '10px',
                    marginBottom: '24px',
                }}>
                    <span style={{ color: '#64748b', fontSize: '14px', fontWeight: '500' }}>
                        {loading ? '⏳ Đang tải...' : (
                            <>
                                Hiển thị <strong style={{ color: '#1e293b' }}>{displayed.length}</strong> / <strong style={{ color: PRIMARY_L }}>{filtered.length}</strong> vaccine
                                {allVaccines.length !== filtered.length && <> (lọc từ {allVaccines.length} vaccine)</>}
                            </>
                        )}
                    </span>
                    <a href="/dang-ky-tiem-chung" style={{
                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                        background: 'linear-gradient(135deg,#1e3a8a,#0284c7)',
                        color: '#fff', textDecoration: 'none',
                        padding: '10px 20px', borderRadius: '10px',
                        fontSize: '13px', fontWeight: '700',
                        boxShadow: '0 4px 12px rgba(14,165,233,0.3)',
                    }}>
                        📅 Đặt lịch tiêm
                    </a>
                </div>

                {/* ── Skeleton ── */}
                {loading && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} style={{ background: '#fff', borderRadius: '18px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                                <div style={{ height: '185px', background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)' }}/>
                                <div style={{ padding: '18px' }}>
                                    <div style={{ height: '18px', background: '#f1f5f9', borderRadius: '6px', marginBottom: '10px' }}/>
                                    <div style={{ height: '14px', background: '#f1f5f9', borderRadius: '6px', width: '65%' }}/>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Empty state ── */}
                {!loading && filtered.length === 0 && (
                    <div style={{ textAlign:'center', padding:'72px 24px', background:'#fff', borderRadius:'20px', border:'1px solid #e2e8f0' }}>
                        <div style={{ fontSize:'56px', marginBottom:'16px' }}>🔍</div>
                        <h3 style={{ fontSize:'20px', fontWeight:'700', color:'#1e293b', marginBottom:'8px' }}>Không tìm thấy vaccine nào</h3>
                        <p style={{ color:'#64748b', fontSize:'15px', marginBottom:'24px', maxWidth:'380px', margin:'0 auto 24px' }}>
                            Thử điều chỉnh bộ lọc hoặc từ khoá tìm kiếm khác.
                        </p>
                        <button onClick={clearAll} style={{ background: PRIMARY_L, color:'#fff', border:'none', borderRadius:'10px', padding:'12px 28px', fontSize:'14px', fontWeight:'700', cursor:'pointer' }}>
                            Xoá bộ lọc
                        </button>
                    </div>
                )}

                {/* ── Grid ── */}
                {!loading && displayed.length > 0 && (
                    <>
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:'24px', marginBottom:'40px' }}>
                            {displayed.map((v, i) => <VaccineCard key={v.id ?? i} vaccine={v}/>)}
                        </div>

                        {pageCount > 1 && (
                            <div style={{ display:'flex', justifyContent:'center' }}>
                                <ReactPaginate
                                    pageCount={pageCount}
                                    pageRangeDisplayed={3}
                                    marginPagesDisplayed={2}
                                    onPageChange={handlePageClick}
                                    forcePage={safePage}
                                    previousLabel="← Trước"
                                    nextLabel="Tiếp →"
                                    breakLabel="..."
                                    containerClassName="iv-pag"
                                    pageClassName="iv-page"
                                    pageLinkClassName="iv-link"
                                    previousClassName="iv-page"
                                    previousLinkClassName="iv-link"
                                    nextClassName="iv-page"
                                    nextLinkClassName="iv-link"
                                    breakClassName="iv-page"
                                    breakLinkClassName="iv-link"
                                    activeClassName="iv-active"
                                />
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ── Pagination CSS ── */}
            <style>{`
                .iv-pag { display:flex; list-style:none; margin:0; padding:0; gap:6px; align-items:center; flex-wrap:wrap; justify-content:center; }
                .iv-link { display:flex; align-items:center; justify-content:center; min-width:40px; height:40px; padding:0 14px; border-radius:10px; border:1.5px solid #e2e8f0; background:#fff; color:#475569; font-size:14px; font-weight:600; cursor:pointer; text-decoration:none; transition:all 0.18s; }
                .iv-link:hover { border-color:${ACCENT}; color:${ACCENT}; background:#f0f9ff; }
                .iv-active .iv-link { background:${PRIMARY_L}; border-color:${PRIMARY_L}; color:#fff; box-shadow:0 4px 12px rgba(42,56,143,0.3); }
            `}</style>
        </div>
    );
}

/* ══════════════════════════════════════════════════
   VaccineCard
══════════════════════════════════════════════════ */
function VaccineCard({ vaccine }) {
    const [hover, setHover] = useState(false);
    return (
        <div
            style={{
                background:'#fff', borderRadius:'18px', overflow:'hidden',
                border: hover ? `1.5px solid ${ACCENT}` : '1.5px solid #e2e8f0',
                boxShadow: hover ? '0 12px 36px rgba(14,165,233,0.15)' : '0 2px 12px rgba(0,0,0,0.06)',
                transform: hover ? 'translateY(-5px)' : 'none',
                transition:'all 0.25s',
                display:'flex', flexDirection:'column',
            }}
            onMouseOver={() => setHover(true)}
            onMouseOut={() => setHover(false)}
        >
            {/* Image */}
            <div style={{ position:'relative', overflow:'hidden', flexShrink:0 }}>
                <img
                    src={vaccine.image || 'https://via.placeholder.com/320x185?text=Vaccine'}
                    alt={vaccine.name}
                    style={{ width:'100%', height:'185px', objectFit:'cover', display:'block', transform: hover ? 'scale(1.05)' : 'scale(1)', transition:'transform 0.4s' }}
                />
                {vaccine.price ? (
                    <div style={{ position:'absolute', top:'12px', right:'12px', background:'linear-gradient(135deg,#1e3a8a,#0284c7)', color:'#fff', fontSize:'12px', fontWeight:'800', padding:'4px 12px', borderRadius:'20px', boxShadow:'0 2px 8px rgba(0,0,0,0.25)' }}>
                        {formatMoney(vaccine.price)}đ
                    </div>
                ) : (
                    <div style={{ position:'absolute', top:'12px', right:'12px', background:'rgba(16,185,129,0.9)', color:'#fff', fontSize:'11px', fontWeight:'700', padding:'4px 12px', borderRadius:'20px' }}>
                        Liên hệ
                    </div>
                )}
                {vaccine.vaccineType?.typeName && (
                    <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'linear-gradient(transparent,rgba(15,23,42,0.7))', padding:'20px 12px 8px' }}>
                        <span style={{ fontSize:'11px', fontWeight:'700', color:'rgba(255,255,255,0.9)', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                            {vaccine.vaccineType.typeName}
                        </span>
                    </div>
                )}
            </div>

            {/* Body */}
            <div style={{ padding:'16px 18px 0', flex:1, display:'flex', flexDirection:'column' }}>
                <h3 style={{ fontSize:'15px', fontWeight:'800', color:'#0f172a', lineHeight:'1.45', marginBottom:'10px', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden', minHeight:'44px' }}>
                    {vaccine.name}
                </h3>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', marginBottom:'14px' }}>
                    {vaccine.ageGroup?.ageRange    && <Tag icon="👶" text={vaccine.ageGroup.ageRange}/>}
                    {vaccine.manufacturer?.name    && <Tag icon="🏭" text={vaccine.manufacturer.name}/>}
                    {vaccine.manufacturer?.country && <Tag icon="🌍" text={vaccine.manufacturer.country}/>}
                </div>
            </div>

            {/* Actions */}
            <div style={{ padding:'0 18px 18px', display:'flex', gap:'10px', marginTop:'auto' }}>
                <a href={'/thong-tin-vaccine?id=' + vaccine.id}
                    style={{ flex:1, textAlign:'center', textDecoration:'none', padding:'10px 8px', borderRadius:'10px', fontSize:'13px', fontWeight:'700', border:`1.5px solid ${PRIMARY_L}`, color:PRIMARY_L, background: hover ? `${PRIMARY_L}12` : 'transparent', transition:'background 0.2s' }}>
                    Chi tiết
                </a>
                <a href={'/dang-ky-tiem-chung?vaccine=' + vaccine.id}
                    style={{ flex:1, textAlign:'center', textDecoration:'none', padding:'10px 8px', borderRadius:'10px', fontSize:'13px', fontWeight:'700', background:'linear-gradient(135deg,#1e3a8a,#0284c7)', color:'#fff', boxShadow:'0 4px 12px rgba(14,165,233,0.3)' }}
                    onMouseOver={e => e.currentTarget.style.opacity = '0.88'}
                    onMouseOut={e  => e.currentTarget.style.opacity = '1'}>
                    Đặt lịch
                </a>
            </div>
        </div>
    );
}

function Tag({ icon, text }) {
    return (
        <span style={{ display:'inline-flex', alignItems:'center', gap:'4px', background:'#f1f5f9', color:'#475569', borderRadius:'8px', padding:'4px 10px', fontSize:'12px', fontWeight:'500' }}>
            <span style={{ fontSize:'11px' }}>{icon}</span>{text}
        </span>
    );
}

export default TimKiemVacxin;
