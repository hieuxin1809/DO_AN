import { getMethod }   from '../../services/request';
import { formatMoney } from '../../services/money';
import { useState, useEffect, useMemo } from 'react';

/* ── palette (matches site-wide tokens) ──────────────── */
const PRIMARY   = '#1e40af';
const PRIMARY_L = '#2A388F';
const ACCENT    = '#0ea5e9';

/* ══════════════════════════════════════════════════════ */
function VaccineDanhMuc() {
    const [vaccines,  setVaccines]  = useState([]);
    const [danhMuc,   setDanhMuc]   = useState(null);
    const [loading,   setLoading]   = useState(true);
    const [search,    setSearch]    = useState('');
    const [sort,      setSort]      = useState('default');

    useEffect(() => {
        const uls = new URL(document.URL);
        const id  = uls.searchParams.get('danhmuc');
        if (!id) { setLoading(false); return; }

        const load = async () => {
            /* category info */
            const typeRes  = await getMethod('/api/vaccine-type/find-by-id?id=' + id);
            const typeData = await typeRes.json();
            setDanhMuc(typeData);

            /* vaccines in this category */
            const vRes  = await getMethod('/api/vaccine/all/find-by-type?typeId=' + id);
            const vData = await vRes.json();
            setVaccines(Array.isArray(vData) ? vData : []);
            setLoading(false);
        };
        load();
    }, []);

    /* ── client-side search + sort ── */
    const displayed = useMemo(() => {
        let list = vaccines.filter(v =>
            v.name?.toLowerCase().includes(search.toLowerCase()) ||
            v.manufacturer?.name?.toLowerCase().includes(search.toLowerCase())
        );
        if (sort === 'price-asc')  list = [...list].sort((a, b) => (a.price || 0) - (b.price || 0));
        if (sort === 'price-desc') list = [...list].sort((a, b) => (b.price || 0) - (a.price || 0));
        if (sort === 'name-az')    list = [...list].sort((a, b) => a.name?.localeCompare(b.name));
        return list;
    }, [vaccines, search, sort]);

    const parentName = danhMuc?.vaccineType?.typeName;

    /* ── loading skeleton ── */
    if (loading) {
        return (
            <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px', animation: 'pulse 1.5s infinite' }}>💉</div>
                    <p style={{ color: '#64748b', fontSize: '16px', fontWeight: '500' }}>Đang tải danh mục vaccine...</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ background: '#f8fafc', minHeight: '100vh' }}>

            {/* ═══════════════════════════════════
                HERO
            ═══════════════════════════════════ */}
            <div style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #0284c7 100%)',
                padding: '48px 24px 96px',
                position: 'relative',
                overflow: 'hidden',
            }}>
                {/* decorative blobs */}
                <div style={{ position:'absolute', top:'-60px', right:'-60px', width:'280px', height:'280px', background:'rgba(14,165,233,0.15)', borderRadius:'50%', filter:'blur(50px)', pointerEvents:'none' }}/>
                <div style={{ position:'absolute', bottom:'-40px', left:'5%',  width:'200px', height:'200px', background:'rgba(16,185,129,0.12)', borderRadius:'50%', filter:'blur(40px)', pointerEvents:'none' }}/>

                <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>
                    {/* Breadcrumb */}
                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <a href="/"               style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>Trang chủ</a>
                        <span>›</span>
                        {parentName && <>
                            <span style={{ color: 'rgba(255,255,255,0.6)' }}>{parentName}</span>
                            <span>›</span>
                        </>}
                        <span style={{ color: '#fff', fontWeight: '600' }}>{danhMuc?.typeName || 'Danh mục vaccine'}</span>
                    </div>

                    {/* Title row */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
                        <div>
                            <h1 style={{
                                fontSize: 'clamp(24px, 3.5vw, 38px)', fontWeight: '800',
                                color: '#fff', lineHeight: '1.2', marginBottom: '10px',
                            }}>
                                {danhMuc?.typeName || 'Danh mục vaccine'}
                            </h1>
                            {danhMuc?.description && (
                                <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: '15px', maxWidth: '560px', lineHeight: '1.7', margin: 0 }}>
                                    {danhMuc.description}
                                </p>
                            )}
                        </div>
                        <div style={{
                            background: 'rgba(255,255,255,0.12)',
                            backdropFilter: 'blur(8px)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '16px', padding: '16px 28px', textAlign: 'center', flexShrink: 0,
                        }}>
                            <div style={{ fontSize: '32px', fontWeight: '900', color: '#fff', lineHeight: '1' }}>
                                {vaccines.length}
                            </div>
                            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginTop: '4px', fontWeight: '600' }}>
                                loại vaccine
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════
                FILTER BAR (overlaps hero)
            ═══════════════════════════════════ */}
            <div style={{ maxWidth: '1200px', margin: '-44px auto 0', padding: '0 24px', position: 'relative', zIndex: 10 }}>
                <div style={{
                    background: '#fff', borderRadius: '16px',
                    padding: '20px 24px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
                    display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center',
                }}>
                    {/* Search */}
                    <div style={{ flex: '1 1 260px', position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', pointerEvents: 'none' }}>🔍</span>
                        <input
                            type="text"
                            placeholder="Tìm kiếm vaccine, nhà sản xuất..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{
                                width: '100%', paddingLeft: '40px', paddingRight: '14px',
                                height: '44px', border: '1.5px solid #e2e8f0', borderRadius: '10px',
                                fontSize: '14px', outline: 'none', transition: 'border-color 0.2s',
                                boxSizing: 'border-box',
                            }}
                            onFocus={e => e.target.style.borderColor = ACCENT}
                            onBlur={e  => e.target.style.borderColor = '#e2e8f0'}
                        />
                    </div>

                    {/* Sort */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600', whiteSpace: 'nowrap' }}>Sắp xếp:</span>
                        <select
                            value={sort}
                            onChange={e => setSort(e.target.value)}
                            style={{
                                height: '44px', padding: '0 12px', border: '1.5px solid #e2e8f0',
                                borderRadius: '10px', fontSize: '14px', color: '#1e293b',
                                background: '#fff', cursor: 'pointer', outline: 'none',
                            }}
                        >
                            <option value="default">Mặc định</option>
                            <option value="name-az">Tên A → Z</option>
                            <option value="price-asc">Giá thấp → cao</option>
                            <option value="price-desc">Giá cao → thấp</option>
                        </select>
                    </div>

                    {/* Result count */}
                    <div style={{
                        background: '#f0f9ff', border: '1px solid #bae6fd',
                        borderRadius: '8px', padding: '8px 16px',
                        fontSize: '13px', color: '#0369a1', fontWeight: '700', flexShrink: 0,
                    }}>
                        {displayed.length} kết quả
                    </div>

                    {/* Clear search */}
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            style={{
                                background: 'none', border: '1px solid #e2e8f0',
                                borderRadius: '8px', padding: '8px 14px',
                                fontSize: '13px', color: '#64748b', cursor: 'pointer',
                                flexShrink: 0,
                            }}
                        >
                            ✕ Xoá lọc
                        </button>
                    )}
                </div>
            </div>

            {/* ═══════════════════════════════════
                VACCINE GRID
            ═══════════════════════════════════ */}
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px 72px' }}>

                {/* Sub-category siblings (other types under same parent) */}
                {danhMuc?.vaccineType?.vaccineTypes?.length > 1 && (
                    <div style={{ marginBottom: '28px' }}>
                        <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600', marginBottom: '10px' }}>
                            Danh mục liên quan:
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {danhMuc.vaccineType.vaccineTypes.map((sibling, i) => (
                                <a
                                    key={i}
                                    href={`/vaccine-danhmuc?danhmuc=${sibling.id}`}
                                    style={{
                                        display: 'inline-block',
                                        padding: '6px 16px',
                                        borderRadius: '20px',
                                        fontSize: '13px', fontWeight: '600',
                                        textDecoration: 'none',
                                        background: sibling.id === danhMuc.id ? PRIMARY_L : '#fff',
                                        color:      sibling.id === danhMuc.id ? '#fff'     : '#475569',
                                        border: `1.5px solid ${sibling.id === danhMuc.id ? PRIMARY_L : '#e2e8f0'}`,
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    {sibling.typeName}
                                </a>
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty state */}
                {displayed.length === 0 && (
                    <div style={{
                        textAlign: 'center', padding: '80px 24px',
                        background: '#fff', borderRadius: '20px',
                        border: '1px solid #e2e8f0',
                    }}>
                        <div style={{ fontSize: '56px', marginBottom: '20px' }}>🔍</div>
                        <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', marginBottom: '10px' }}>
                            Không tìm thấy vaccine
                        </h3>
                        <p style={{ color: '#64748b', fontSize: '15px', marginBottom: '24px' }}>
                            {search ? `Không có vaccine nào khớp với "${search}".` : 'Danh mục này chưa có vaccine nào.'}
                        </p>
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                style={{
                                    background: PRIMARY_L, color: '#fff',
                                    border: 'none', borderRadius: '10px',
                                    padding: '12px 28px', fontSize: '14px',
                                    fontWeight: '700', cursor: 'pointer',
                                }}
                            >
                                Xoá bộ lọc
                            </button>
                        )}
                    </div>
                )}

                {/* Grid */}
                {displayed.length > 0 && (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: '24px',
                    }}>
                        {displayed.map((v, i) => (
                            <VaccineCard key={v.id || i} vaccine={v}/>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════
   VaccineCard — rich card for category listing
══════════════════════════════════════════════════════ */
function VaccineCard({ vaccine }) {
    const [hover, setHover] = useState(false);

    const tags = [
        vaccine.ageGroup?.ageRange    && { icon: '👶', text: vaccine.ageGroup.ageRange },
        vaccine.manufacturer?.name    && { icon: '🏭', text: vaccine.manufacturer.name },
        vaccine.manufacturer?.country && { icon: '🌍', text: vaccine.manufacturer.country },
    ].filter(Boolean);

    return (
        <div
            style={{
                background: '#fff',
                borderRadius: '18px',
                overflow: 'hidden',
                border: hover ? `1.5px solid ${ACCENT}` : '1.5px solid #e2e8f0',
                boxShadow: hover ? '0 12px 36px rgba(14,165,233,0.15)' : '0 2px 12px rgba(0,0,0,0.06)',
                transform: hover ? 'translateY(-5px)' : 'none',
                transition: 'all 0.25s',
                display: 'flex',
                flexDirection: 'column',
            }}
            onMouseOver={() => setHover(true)}
            onMouseOut={() => setHover(false)}
        >
            {/* Image */}
            <div style={{ position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
                <img
                    src={vaccine.image || 'https://via.placeholder.com/320x180?text=Vaccine'}
                    alt={vaccine.name}
                    style={{
                        width: '100%', height: '185px', objectFit: 'cover', display: 'block',
                        transform: hover ? 'scale(1.05)' : 'scale(1)',
                        transition: 'transform 0.4s',
                    }}
                />
                {/* Price badge */}
                {vaccine.price ? (
                    <div style={{
                        position: 'absolute', top: '12px', right: '12px',
                        background: 'linear-gradient(135deg,#1e3a8a,#0284c7)',
                        color: '#fff', fontSize: '12px', fontWeight: '800',
                        padding: '4px 12px', borderRadius: '20px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                    }}>
                        {formatMoney(vaccine.price)}đ
                    </div>
                ) : (
                    <div style={{
                        position: 'absolute', top: '12px', right: '12px',
                        background: 'rgba(16,185,129,0.9)',
                        color: '#fff', fontSize: '11px', fontWeight: '700',
                        padding: '4px 12px', borderRadius: '20px',
                    }}>
                        Liên hệ
                    </div>
                )}
                {/* Dose badge */}
                {vaccine.maxDose && (
                    <div style={{
                        position: 'absolute', top: '12px', left: '12px',
                        background: 'rgba(30,58,138,0.8)',
                        backdropFilter: 'blur(4px)',
                        color: '#fff', fontSize: '11px', fontWeight: '700',
                        padding: '4px 10px', borderRadius: '20px',
                    }}>
                        💉 {vaccine.maxDose} mũi
                    </div>
                )}
            </div>

            {/* Body */}
            <div style={{ padding: '18px 18px 0', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{
                    fontSize: '15px', fontWeight: '800', color: '#0f172a',
                    lineHeight: '1.45', marginBottom: '12px',
                    display: '-webkit-box', WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    minHeight: '44px',
                }}>
                    {vaccine.name}
                </h3>

                {/* Tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                    {tags.map((tag, i) => (
                        <span key={i} style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            background: '#f1f5f9', color: '#475569',
                            borderRadius: '8px', padding: '4px 10px',
                            fontSize: '12px', fontWeight: '500',
                        }}>
                            <span style={{ fontSize: '11px' }}>{tag.icon}</span>
                            {tag.text}
                        </span>
                    ))}
                </div>

                {/* Interval info */}
                {vaccine.minIntervalMonths && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        background: '#f8fafc', borderRadius: '8px', padding: '8px 12px',
                        marginBottom: '16px',
                    }}>
                        <span style={{ fontSize: '14px' }}>⏱️</span>
                        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
                            Khoảng cách mũi: <strong style={{ color: '#334155' }}>{vaccine.minIntervalMonths} tháng</strong>
                        </span>
                    </div>
                )}
            </div>

            {/* Action buttons */}
            <div style={{ padding: '0 18px 18px', display: 'flex', gap: '10px', marginTop: 'auto' }}>
                <a
                    href={'/thong-tin-vaccine?id=' + vaccine.id}
                    style={{
                        flex: 1, textAlign: 'center', textDecoration: 'none',
                        padding: '10px 8px', borderRadius: '10px',
                        fontSize: '13px', fontWeight: '700',
                        border: `1.5px solid ${PRIMARY_L}`, color: PRIMARY_L,
                        background: hover ? `${PRIMARY_L}10` : 'transparent',
                        transition: 'background 0.2s',
                    }}
                >
                    Chi tiết
                </a>
                <a
                    href={'/dang-ky-tiem-chung?vaccine=' + vaccine.id}
                    style={{
                        flex: 1, textAlign: 'center', textDecoration: 'none',
                        padding: '10px 8px', borderRadius: '10px',
                        fontSize: '13px', fontWeight: '700',
                        background: 'linear-gradient(135deg,#1e3a8a,#0284c7)',
                        color: '#fff',
                        boxShadow: '0 4px 12px rgba(14,165,233,0.3)',
                        transition: 'opacity 0.2s',
                    }}
                    onMouseOver={e => e.currentTarget.style.opacity = '0.88'}
                    onMouseOut={e  => e.currentTarget.style.opacity = '1'}
                >
                    Đặt lịch
                </a>
            </div>
        </div>
    );
}

export default VaccineDanhMuc;
