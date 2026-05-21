import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Swal from 'sweetalert2';
import { getMethod, postMethod, postMethodPayload, uploadSingleFile } from '../../../services/request';
import Select from 'react-select';
import { Editor } from '@tinymce/tinymce-react';

/* ── palette ──────────────────────────────────── */
const PRIMARY = '#2A388F';
const ACCENT  = '#0ea5e9';
const SUCCESS = '#10b981';
const DANGER  = '#ef4444';
const BORDER  = '#e2e8f0';
const TEXT    = '#1e293b';
const TEXT_2  = '#64748b';
const BG_PAGE = '#f0f4f8';
const BG_CARD = '#ffffff';

/* ── Status options ───────────────────────────── */
const STATUS_OPTIONS = [
    { value: 'ACTIVE',   label: '✅ Đang kinh doanh' },
    { value: 'INACTIVE', label: '⛔ Ngừng kinh doanh' },
];

/* ── helpers ──────────────────────────────────── */
function FieldLabel({ children, required }) {
    return (
        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: TEXT_2,
            marginBottom: '6px', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
            {children}{required && <span style={{ color: DANGER, marginLeft: 3 }}>*</span>}
        </label>
    );
}

function StyledInput({ name, type = 'text', defaultValue, placeholder, min, required, onChange }) {
    const [focused, setFocused] = useState(false);
    return (
        <input
            name={name} type={type} defaultValue={defaultValue} placeholder={placeholder}
            min={min} required={required} onChange={onChange}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            style={{
                width: '100%', height: '40px', padding: '0 12px', boxSizing: 'border-box',
                borderRadius: '9px', border: `1.5px solid ${focused ? ACCENT : BORDER}`,
                fontSize: '13.5px', color: TEXT, background: '#f8fafc',
                outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.2s',
            }}
        />
    );
}

function SectionCard({ title, icon, children }) {
    return (
        <div style={{ background: BG_CARD, borderRadius: '14px', marginBottom: '20px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.06)', border: `1px solid ${BORDER}` }}>
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${BORDER}`,
                background: 'linear-gradient(90deg, rgba(42,56,143,0.05) 0%, transparent 100%)',
                display: 'flex', alignItems: 'center', gap: 10, borderRadius: '14px 14px 0 0' }}>
                <span style={{ fontSize: 16 }}>{icon}</span>
                <span style={{ fontWeight: 800, fontSize: '14px', color: PRIMARY, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{title}</span>
            </div>
            <div style={{ padding: '20px' }}>
                {children}
            </div>
        </div>
    );
}

/* ── module-level vars (same pattern as original) ── */
var linkbanner = '';
var description = '';

/* ══════════════════════════════════════════════ */
const StaffAddVaccine = () => {
    const [item,               setItem]               = useState(null);
    const [type,               setType]               = useState([]);
    const [manufacturer,       setManufacturer]       = useState([]);
    const [ageGroup,           setAgeGroup]           = useState([]);
    const [typeSelect,         settypeSelect]         = useState(null);
    const [manufacturerSelect, setmanufacturerSelect] = useState(null);
    const [ageGroupSelect,     setageGroupSelect]     = useState(null);
    const [statusSelect,       setStatusSelect]       = useState(STATUS_OPTIONS[0]);
    const [imagePreview,       setImagePreview]       = useState('');
    const [textButton,         setTextbutton]         = useState('Thêm vaccine');
    const editorRef = useRef(null);

    /* ── manufacturer mini modal ── */
    const [mfModal,         setMfModal]         = useState(false);
    const [mfName,          setMfName]          = useState('');
    const [mfCountry,       setMfCountry]       = useState('');
    const [mfSaving,        setMfSaving]        = useState(false);
    const [mfErrors,        setMfErrors]        = useState({});

    useEffect(() => {
        const getData = async () => {
            const uls = new URL(document.URL);
            const id  = uls.searchParams.get('id');
            if (id != null) {
                setTextbutton('Cập nhật vaccine');
                const response = await getMethod('/api/vaccine/public/find-by-id?id=' + id);
                const result   = await response.json();
                setItem(result);
                description  = result.description;
                linkbanner   = result.image;
                setImagePreview(result.image);
                settypeSelect(result.vaccineType);
                setmanufacturerSelect(result.manufacturer);
                setageGroupSelect(result.ageGroup);
                const found = STATUS_OPTIONS.find(o => o.value === result.status);
                if (found) setStatusSelect(found);
            }
        };
        getData();

        const getSelect = async () => {
            const [r1, r2, r3] = await Promise.all([
                getMethod('/api/vaccine-type/find-all'),
                postMethod('/api/manufacturer/find-all'),
                postMethod('/api/age-group/find-all'),
            ]);
            setType(await r1.json());
            setManufacturer(await r2.json());
            setAgeGroup(await r3.json());
        };
        getSelect();
    }, []);

    function handleEditorChange(content) {
        description = content;
    }

    function onchangeFile(e) {
        const file = e.target.files[0];
        if (file) setImagePreview(URL.createObjectURL(file));
    }

    /* ── add new manufacturer ── */
    async function handleAddManufacturer() {
        const errs = {};
        if (!mfName.trim())    errs.name    = 'Không được để trống';
        if (!mfCountry.trim()) errs.country = 'Không được để trống';
        setMfErrors(errs);
        if (Object.keys(errs).length > 0) return;

        setMfSaving(true);
        try {
            const res = await fetch('http://localhost:8080/api/manufacturer/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token') },
                body: JSON.stringify({ name: mfName.trim(), country: mfCountry.trim() }),
            });
            if (res.ok) {
                const created = await res.json();
                const updated = [...manufacturer, created];
                setManufacturer(updated);
                setmanufacturerSelect(created);
                setMfModal(false);
                setMfName(''); setMfCountry(''); setMfErrors({});
                toast.success(`Đã thêm nhà sản xuất "${created.name}" thành công!`);
            } else {
                const err = await res.json();
                toast.error(err.defaultMessage || 'Thêm nhà sản xuất thất bại');
            }
        } catch {
            toast.error('Lỗi kết nối server');
        } finally {
            setMfSaving(false);
        }
    }

    /* ── submit vaccine ── */
    async function addVaccine(event) {
        event.preventDefault();
        const uls  = new URL(document.URL);
        const id   = uls.searchParams.get('id');
        const el   = event.target.elements;

        const vaccineName        = el.vaccineName.value.trim();
        const price              = el.price.value;
        const maxDose            = el.maxDose.value;
        const minIntervalMonths  = el.minIntervalMonths.value;

        if (!vaccineName)         { toast.warning('Vui lòng nhập tên vaccine!'); return; }
        if (!typeSelect)          { toast.warning('Vui lòng chọn danh mục vaccine!'); return; }
        if (!manufacturerSelect)  { toast.warning('Vui lòng chọn nhà sản xuất!'); return; }
        if (!ageGroupSelect)      { toast.warning('Vui lòng chọn nhóm tuổi!'); return; }
        if (id == null && !document.getElementById('fileimage').files[0]) {
            toast.warning('Vui lòng tải lên ảnh cho vaccine mới!'); return;
        }
        if (maxDose && Number(maxDose) <= 0)             { toast.warning('Số mũi tối đa phải > 0!'); return; }
        if (minIntervalMonths && Number(minIntervalMonths) <= 0) { toast.warning('Khoảng cách tiêm phải > 0!'); return; }

        const linktam = await uploadSingleFile(document.getElementById('fileimage'));
        if (linktam != null) linkbanner = linktam;

        const payload = {
            id, name: vaccineName, description, image: linkbanner,
            price, inventory: 0, quantity: 0,
            vaccineTypeId: typeSelect.id, manufacturerId: manufacturerSelect.id, ageGroupId: ageGroupSelect.id,
            status: statusSelect?.value || 'ACTIVE',
            maxDose: maxDose ? parseInt(maxDose) : null,
            minIntervalMonths: minIntervalMonths ? parseInt(minIntervalMonths) : null,
        };

        const res = id == null
            ? await postMethodPayload('/api/vaccine/create', payload)
            : await postMethodPayload('/api/vaccine/update', payload);

        if (res.status < 300) {
            Swal.fire({ title: 'Thông báo', text: 'Thành công!', preConfirm: () => { window.location.href = 'vaccine'; } });
        } else if (res.status === 417) {
            const result = await res.json();
            toast.warning(result.defaultMessage);
        } else {
            toast.error('Thêm/sửa thất bại');
        }
    }

    /* ── shared select styles ── */
    const selectStyles = {
        control: (base, state) => ({
            ...base, borderRadius: '9px', minHeight: '40px',
            border: `1.5px solid ${state.isFocused ? ACCENT : BORDER}`,
            boxShadow: 'none', background: '#f8fafc', '&:hover': { borderColor: ACCENT },
        }),
        option: (base, state) => ({
            ...base, background: state.isFocused ? 'rgba(14,165,233,0.08)' : '#fff',
            color: TEXT, fontSize: '13.5px',
        }),
    };

    return (
        <div style={{ background: BG_PAGE, minHeight: '100vh', padding: '24px 20px 60px' }}>

            {/* ── Page header ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <a href="vaccine" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 36, height: 36, borderRadius: 9, border: `1.5px solid ${BORDER}`,
                    background: '#fff', color: TEXT_2, textDecoration: 'none', fontSize: 16 }}>←</a>
                <div style={{ width: 40, height: 40, borderRadius: 10,
                    background: `linear-gradient(135deg, ${PRIMARY}, ${ACCENT})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 18 }}>💉</span>
                </div>
                <div>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: TEXT }}>{textButton}</h2>
                    <div style={{ fontSize: 12, color: TEXT_2 }}>Điền đầy đủ thông tin vaccine bên dưới</div>
                </div>
            </div>

            <form onSubmit={addVaccine} method="post">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>

                    {/* ════ CỘT TRÁI ════ */}
                    <div>

                        {/* Thông tin cơ bản */}
                        <SectionCard title="Thông tin cơ bản" icon="📋">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 16px' }}>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <FieldLabel required>Tên vaccine</FieldLabel>
                                    <StyledInput name="vaccineName" defaultValue={item?.name} placeholder="VD: Vắc-xin phòng sởi" required />
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <FieldLabel required>Giá tiền (VNĐ)</FieldLabel>
                                    <StyledInput name="price" type="number" min="0" defaultValue={item?.price} placeholder="VD: 250000" required />
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <FieldLabel required>Trạng thái</FieldLabel>
                                    <Select
                                        options={STATUS_OPTIONS}
                                        value={statusSelect}
                                        onChange={setStatusSelect}
                                        styles={selectStyles}
                                        isSearchable={false}
                                        placeholder="Chọn trạng thái"
                                    />
                                    <div style={{ marginTop: 6, padding: '7px 12px', borderRadius: 8,
                                        background: statusSelect?.value === 'ACTIVE' ? 'rgba(16,185,129,0.07)' : 'rgba(239,68,68,0.07)',
                                        fontSize: 12, color: statusSelect?.value === 'ACTIVE' ? '#065f46' : '#991b1b' }}>
                                        {statusSelect?.value === 'ACTIVE'
                                            ? '✅ Vaccine sẽ hiển thị và cho phép đặt lịch tiêm'
                                            : '⛔ Vaccine sẽ bị ẩn, khách hàng không thể đặt lịch'}
                                    </div>
                                </div>
                            </div>
                        </SectionCard>

                        {/* Phân loại */}
                        <SectionCard title="Phân loại" icon="🏷️">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div>
                                    <FieldLabel required>Danh mục vaccine</FieldLabel>
                                    <Select
                                        options={type} value={typeSelect} onChange={settypeSelect}
                                        getOptionLabel={o => o.typeName} getOptionValue={o => o.id}
                                        styles={selectStyles} placeholder="Chọn danh mục..."
                                        noOptionsMessage={() => 'Không có danh mục'}
                                    />
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <FieldLabel required>Nhà sản xuất</FieldLabel>
                                        <button type="button" onClick={() => { setMfModal(true); setMfName(''); setMfCountry(''); setMfErrors({}); }}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 5,
                                                padding: '4px 11px', borderRadius: 7, border: `1.5px solid ${ACCENT}`,
                                                background: 'rgba(14,165,233,0.07)', color: ACCENT,
                                                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                                            }}>
                                            ➕ Thêm mới
                                        </button>
                                    </div>
                                    <Select
                                        options={manufacturer} value={manufacturerSelect} onChange={setmanufacturerSelect}
                                        getOptionLabel={o => `${o.name} (${o.country})`} getOptionValue={o => o.id}
                                        styles={selectStyles} placeholder="Chọn nhà sản xuất..."
                                        noOptionsMessage={() => 'Chưa có — hãy thêm mới bên trên'}
                                    />
                                </div>
                                <div>
                                    <FieldLabel required>Nhóm tuổi</FieldLabel>
                                    <Select
                                        options={ageGroup} value={ageGroupSelect} onChange={setageGroupSelect}
                                        getOptionLabel={o => o.ageRange} getOptionValue={o => o.id}
                                        styles={selectStyles} placeholder="Chọn nhóm tuổi..."
                                        noOptionsMessage={() => 'Không có nhóm tuổi'}
                                    />
                                </div>
                            </div>
                        </SectionCard>

                        {/* Liều tiêm */}
                        <SectionCard title="Thông tin liều tiêm" icon="💊">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 16px' }}>
                                <div>
                                    <FieldLabel>Số mũi tối đa</FieldLabel>
                                    <StyledInput name="maxDose" type="number" min="1"
                                        defaultValue={item?.maxDose} placeholder="Để trống = không giới hạn" />
                                    <div style={{ fontSize: 11.5, color: TEXT_2, marginTop: 4 }}>VD: vaccine COVID = 2 mũi</div>
                                </div>
                                <div>
                                    <FieldLabel>Khoảng cách tiêm (tháng)</FieldLabel>
                                    <StyledInput name="minIntervalMonths" type="number" min="1"
                                        defaultValue={item?.minIntervalMonths} placeholder="Để trống = không yêu cầu" />
                                    <div style={{ fontSize: 11.5, color: TEXT_2, marginTop: 4 }}>VD: 2 tháng giữa 2 mũi</div>
                                </div>
                            </div>
                        </SectionCard>

                        {/* Ảnh */}
                        <SectionCard title="Hình ảnh vaccine" icon="🖼️">
                            <input onChange={onchangeFile} id="fileimage" type="file" accept="image/*"
                                style={{ display: 'block', width: '100%', marginBottom: 12,
                                    padding: '8px', borderRadius: 9,
                                    border: `1.5px dashed ${BORDER}`, fontSize: 13, cursor: 'pointer' }} />
                            {imagePreview && (
                                <div style={{ borderRadius: 10, overflow: 'hidden', border: `1px solid ${BORDER}`, maxWidth: 200 }}>
                                    <img id="imgpreview" src={imagePreview} alt="Preview"
                                        style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} />
                                </div>
                            )}
                            {!imagePreview && (
                                <div style={{ border: `2px dashed ${BORDER}`, borderRadius: 10, padding: '32px 20px',
                                    textAlign: 'center', color: TEXT_2, fontSize: 13 }}>
                                    🖼️ Chưa có ảnh — hãy chọn file bên trên
                                </div>
                            )}
                        </SectionCard>
                    </div>

                    {/* ════ CỘT PHẢI ════ */}
                    <div>
                        <SectionCard title="Mô tả vaccine" icon="📝">
                            <div style={{ fontSize: 12.5, color: TEXT_2, marginBottom: 12, lineHeight: 1.6 }}>
                                Mô tả chi tiết về công dụng, đối tượng sử dụng, tác dụng phụ... Sẽ hiển thị trên trang thông tin vaccine công khai.
                            </div>
                            <Editor
                                name="editor"
                                tinymceScriptSrc="https://cdn.tiny.cloud/1/mcvdwnvee5gbrtksfafzj5cvgml51to5o3u7pfvnjhjtd2v1/tinymce/6/tinymce.min.js"
                                onInit={(evt, editor) => { editorRef.current = editor; }}
                                initialValue={item == null ? '' : item.description}
                                onEditorChange={handleEditorChange}
                                init={{
                                    height: 420,
                                    menubar: false,
                                    plugins: ['lists', 'link', 'image', 'charmap', 'preview', 'wordcount'],
                                    toolbar: 'undo redo | formatselect | bold italic underline | alignleft aligncenter alignright | bullist numlist | removeformat',
                                    content_style: 'body { font-family: Inter, sans-serif; font-size: 14px; color: #1e293b; }',
                                }}
                            />
                        </SectionCard>

                        {/* Submit */}
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                            <a href="vaccine" style={{
                                padding: '11px 24px', borderRadius: 10, border: `1.5px solid ${BORDER}`,
                                background: '#fff', color: TEXT_2, fontSize: 14, fontWeight: 600,
                                textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
                            }}>Hủy bỏ</a>
                            <button type="submit" style={{
                                padding: '11px 32px', borderRadius: 10, border: 'none', cursor: 'pointer',
                                background: `linear-gradient(135deg, ${PRIMARY}, ${ACCENT})`,
                                color: '#fff', fontSize: 14, fontWeight: 700,
                                boxShadow: `0 4px 16px rgba(42,56,143,0.35)`,
                            }}>
                                💾 {textButton}
                            </button>
                        </div>
                    </div>
                </div>
            </form>

            {/* ══════════════════════════════════════════
                Modal thêm nhà sản xuất
            ══════════════════════════════════════════ */}
            {mfModal && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: 'rgba(0,0,0,0.45)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 20,
                }}
                    onClick={e => { if (e.target === e.currentTarget) setMfModal(false); }}>
                    <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 440,
                        overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>

                        {/* header */}
                        <div style={{ background: `linear-gradient(135deg, ${PRIMARY}, ${ACCENT})`,
                            padding: '16px 22px', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 34, height: 34, borderRadius: 8,
                                background: 'rgba(255,255,255,0.18)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🏭</div>
                            <div>
                                <div style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>Thêm nhà sản xuất mới</div>
                                <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: 12 }}>Thông tin sẽ được lưu vào hệ thống</div>
                            </div>
                            <button type="button" onClick={() => setMfModal(false)} style={{
                                marginLeft: 'auto', background: 'rgba(255,255,255,0.15)',
                                border: 'none', borderRadius: 8, width: 30, height: 30,
                                color: '#fff', fontSize: 16, cursor: 'pointer', display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                            }}>✕</button>
                        </div>

                        {/* body */}
                        <div style={{ padding: '22px 24px' }}>
                            <div style={{ marginBottom: 16 }}>
                                <FieldLabel required>Tên nhà sản xuất</FieldLabel>
                                <input
                                    value={mfName} onChange={e => { setMfName(e.target.value); setMfErrors(er => ({ ...er, name: '' })); }}
                                    placeholder="VD: Sanofi, Pfizer, AstraZeneca..."
                                    style={{
                                        width: '100%', height: 40, padding: '0 12px', boxSizing: 'border-box',
                                        borderRadius: 9, border: `1.5px solid ${mfErrors.name ? DANGER : BORDER}`,
                                        fontSize: 13.5, color: TEXT, background: '#f8fafc',
                                        outline: 'none', fontFamily: 'inherit',
                                    }}
                                    onFocus={e => e.target.style.borderColor = ACCENT}
                                    onBlur={e  => e.target.style.borderColor = mfErrors.name ? DANGER : BORDER}
                                />
                                {mfErrors.name && <div style={{ color: DANGER, fontSize: 12, marginTop: 4 }}>⚠ {mfErrors.name}</div>}
                            </div>
                            <div style={{ marginBottom: 20 }}>
                                <FieldLabel required>Quốc gia</FieldLabel>
                                <input
                                    value={mfCountry} onChange={e => { setMfCountry(e.target.value); setMfErrors(er => ({ ...er, country: '' })); }}
                                    placeholder="VD: Pháp, Mỹ, Việt Nam..."
                                    style={{
                                        width: '100%', height: 40, padding: '0 12px', boxSizing: 'border-box',
                                        borderRadius: 9, border: `1.5px solid ${mfErrors.country ? DANGER : BORDER}`,
                                        fontSize: 13.5, color: TEXT, background: '#f8fafc',
                                        outline: 'none', fontFamily: 'inherit',
                                    }}
                                    onFocus={e => e.target.style.borderColor = ACCENT}
                                    onBlur={e  => e.target.style.borderColor = mfErrors.country ? DANGER : BORDER}
                                />
                                {mfErrors.country && <div style={{ color: DANGER, fontSize: 12, marginTop: 4 }}>⚠ {mfErrors.country}</div>}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                                <button type="button" onClick={() => setMfModal(false)} style={{
                                    padding: '9px 20px', borderRadius: 9, border: `1.5px solid ${BORDER}`,
                                    background: '#fff', color: TEXT_2, fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                                }}>Hủy</button>
                                <button type="button" onClick={handleAddManufacturer} disabled={mfSaving} style={{
                                    padding: '9px 22px', borderRadius: 9, border: 'none', color: '#fff',
                                    background: mfSaving ? '#94a3b8' : `linear-gradient(135deg, ${PRIMARY}, ${ACCENT})`,
                                    fontSize: 13.5, fontWeight: 700, cursor: mfSaving ? 'not-allowed' : 'pointer',
                                }}>
                                    {mfSaving ? 'Đang lưu...' : '✓ Xác nhận thêm'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StaffAddVaccine;
