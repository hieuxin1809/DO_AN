import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Select from 'react-select';
import { getMethod, postMethodPayload, uploadSingleFile } from '../../services/request';

/* ── palette ──────────────────────────────────── */
const PRIMARY  = '#2A388F';
const ACCENT   = '#0ea5e9';
const TEXT     = '#1e293b';
const TEXT_2   = '#64748b';
const BORDER   = '#e2e8f0';
const BG_INPUT = '#f8fafc';

/* ── keep logic at module level (same as original) */
var avatar = '';
async function handleUpdateInfor(event) {
    event.preventDefault();
    document.getElementById('loading-bar').style.display = 'block';
    var LinkImg = await uploadSingleFile(document.getElementById('fileupload'));
    if (LinkImg != null) { avatar = LinkImg; }
    const payload = {
        fullName:  event.target.elements.fullname.value,
        gender:    event.target.elements.gender.value,
        birthdate: event.target.elements.birthdate.value,
        phone:     event.target.elements.phone.value,
        avatar,
        city:      event.target.elements.city.value,
        district:  event.target.elements.district.value,
        ward:      event.target.elements.ward.value,
        street:    event.target.elements.street.value,
    };
    const res = await postMethodPayload('/api/customer-profile/customer/update-profile', payload);
    if (res.status === 417) {
        const result = await res.json();
        toast.warning(result.defaultMessage);
    }
    if (res.status < 300) {
        toast.success('Cập nhật thông tin thành công');
        await new Promise(r => setTimeout(r, 1000));
        window.location.reload();
    }
    document.getElementById('loading-bar').style.display = 'none';
}

/* ── small helpers ───────────────────────────── */
function FieldLabel({ children, required }) {
    return (
        <label style={{
            display: 'block', fontSize: '12px', fontWeight: '700',
            color: TEXT_2, marginBottom: '7px', letterSpacing: '0.4px',
            textTransform: 'uppercase',
        }}>
            {children}{required && <span style={{ color: '#ef4444', marginLeft: '3px' }}>*</span>}
        </label>
    );
}

function StyledInput({ ...props }) {
    const [focused, setFocused] = useState(false);
    return (
        <input
            {...props}
            style={{
                width: '100%', padding: '10px 14px', borderRadius: '10px',
                border: `1.5px solid ${focused ? ACCENT : BORDER}`,
                background: BG_INPUT, fontSize: '14px', color: TEXT,
                outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
            }}
            onFocus={e => { setFocused(true); props.onFocus?.(e); }}
            onBlur={e  => { setFocused(false); props.onBlur?.(e); }}
        />
    );
}

function StyledSelect({ children, ...props }) {
    const [focused, setFocused] = useState(false);
    return (
        <select
            {...props}
            style={{
                width: '100%', padding: '10px 14px', borderRadius: '10px',
                border: `1.5px solid ${focused ? ACCENT : BORDER}`,
                background: BG_INPUT, fontSize: '14px', color: TEXT,
                outline: 'none', boxSizing: 'border-box',
                appearance: 'auto',
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
        >
            {children}
        </select>
    );
}

/* ══════════════════════════════════════════════ */
function CapNhatThongTin() {
    const [address,    setAddress]    = useState([]);
    const [huyen,      setHuyen]      = useState([]);
    const [profile,    setProfile]    = useState({});
    const [isLoading,  setIsLoading]  = useState(true);
    const [tinh,       setTinh]       = useState(null);
    const [huyencs,    setHuyenCs]    = useState(null);
    const [previewSrc, setPreviewSrc] = useState('');

    useEffect(() => {
        const getAddress = async () => {
            const res = await fetch('https://provinces.open-api.vn/api/?depth=2');
            setAddress(await res.json());
        };
        const getCustomer = async () => {
            const response = await getMethod('/api/customer-profile/customer/find-by-user');
            if (response.status === 200) {
                const text = await response.text();
                if (text) {
                    const result = JSON.parse(text);
                    setProfile(result);
                    setTinh(result.city);
                    avatar = result.avatar;
                    setPreviewSrc(result.avatar || '');
                    setHuyenCs(result.district);
                }
            }
            setIsLoading(false);
        };
        getAddress();
        getCustomer();
    }, []);

    const loadHuyen = (option) => {
        for (let i = 0; i < address.length; i++) {
            if (address[i].name === option.value) {
                setHuyen(address[i].districts);
                break;
            }
        }
        setTinh(option.value);
    };

    const clickChooseFile = () => document.getElementById('fileupload').click();

    const preImage = () => {
        const [file] = document.getElementById('fileupload').files;
        if (file) {
            const src = URL.createObjectURL(file);
            document.getElementById('imgpreview').src = src;
            setPreviewSrc(src);
        }
    };

    if (isLoading) {
        return (
            <div style={{ textAlign: 'center', padding: '60px 0', color: TEXT_2 }}>
                <div style={{
                    width: '36px', height: '36px', margin: '0 auto 16px',
                    border: `3px solid ${ACCENT}`, borderTopColor: 'transparent',
                    borderRadius: '50%',
                }} className="spin-anim" />
                Đang tải dữ liệu...
            </div>
        );
    }

    const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.fullName || 'U')}&background=2A388F&color=fff&size=100`;

    return (
        <form onSubmit={handleUpdateInfor}>
            <div style={{ display: 'flex', gap: '36px', flexWrap: 'wrap', alignItems: 'flex-start' }}>

                {/* ── Avatar column ── */}
                <div style={{ flexShrink: 0, textAlign: 'center', paddingTop: '8px' }}>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                        <img
                            id="imgpreview"
                            src={previewSrc || fallbackAvatar}
                            alt="avatar"
                            style={{
                                width: '110px', height: '110px', borderRadius: '50%',
                                objectFit: 'cover', display: 'block',
                                border: `3px solid ${ACCENT}`,
                                boxShadow: '0 4px 16px rgba(14,165,233,0.25)',
                            }}
                        />
                        <button
                            type="button"
                            onClick={clickChooseFile}
                            title="Đổi ảnh đại diện"
                            style={{
                                position: 'absolute', bottom: '4px', right: '4px',
                                width: '32px', height: '32px', borderRadius: '50%',
                                background: ACCENT, border: '2.5px solid #fff',
                                color: '#fff', cursor: 'pointer', fontSize: '13px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                        >
                            ✏️
                        </button>
                    </div>
                    <input
                        onChange={preImage}
                        type="file"
                        id="fileupload"
                        name="fileupload"
                        accept="image/*"
                        style={{ display: 'none' }}
                    />
                    <p style={{ fontSize: '11px', color: TEXT_2, marginTop: '10px', maxWidth: '120px' }}>
                        Nhấn ✏️ để đổi ảnh
                    </p>
                </div>

                {/* ── Fields grid ── */}
                <div style={{ flex: 1, minWidth: '280px' }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: '18px 24px',
                    }}>

                        {/* Họ tên — full width */}
                        <div style={{ gridColumn: '1 / -1' }}>
                            <FieldLabel required>Họ và tên</FieldLabel>
                            <StyledInput name="fullname" defaultValue={profile.fullName || ''} required />
                        </div>

                        <div>
                            <FieldLabel required>Số điện thoại</FieldLabel>
                            <StyledInput name="phone" defaultValue={profile.phone || ''} required />
                        </div>

                        <div>
                            <FieldLabel required>Ngày sinh</FieldLabel>
                            <StyledInput name="birthdate" type="date" defaultValue={profile.birthdate || ''} required />
                        </div>

                        <div>
                            <FieldLabel required>Giới tính</FieldLabel>
                            <StyledSelect name="gender" defaultValue={profile.gender || 'Male'}>
                                <option value="Male">Nam</option>
                                <option value="Female">Nữ</option>
                                <option value="Other">Khác</option>
                            </StyledSelect>
                        </div>

                        <div>
                            <FieldLabel>Tỉnh / Thành phố</FieldLabel>
                            <Select
                                options={address.map(a => ({ label: a.name, value: a.name }))}
                                onChange={loadHuyen}
                                placeholder="Chọn tỉnh / thành phố"
                                name="city"
                                value={tinh ? { label: tinh, value: tinh } : null}
                                isSearchable
                                styles={{
                                    control: (base, state) => ({
                                        ...base,
                                        borderRadius: '10px',
                                        border: `1.5px solid ${state.isFocused ? ACCENT : BORDER}`,
                                        boxShadow: 'none',
                                        background: BG_INPUT,
                                        minHeight: '42px',
                                        '&:hover': { borderColor: ACCENT },
                                    }),
                                    option: (base, state) => ({
                                        ...base,
                                        background: state.isFocused ? 'rgba(14,165,233,0.08)' : '#fff',
                                        color: TEXT,
                                        fontSize: '14px',
                                    }),
                                }}
                            />
                        </div>

                        <div>
                            <FieldLabel>Quận / Huyện</FieldLabel>
                            <StyledSelect name="district" id="district" defaultValue={huyencs || ''}>
                                {huyen.map(h => (
                                    <option key={h.name} value={h.name}>{h.name}</option>
                                ))}
                            </StyledSelect>
                        </div>

                        <div>
                            <FieldLabel>Phường / Xã</FieldLabel>
                            <StyledInput name="ward" defaultValue={profile.ward || ''} />
                        </div>

                        <div>
                            <FieldLabel>Tên đường, số nhà</FieldLabel>
                            <StyledInput name="street" defaultValue={profile.street || ''} />
                        </div>

                    </div>

                    {/* loading bar (kept for upload indication) */}
                    <div id="loading-bar" style={{ display: 'none', marginTop: '16px' }}>
                        <div className="bar1 bar"></div>
                    </div>

                    <div style={{ marginTop: '28px', display: 'flex', gap: '12px' }}>
                        <button
                            type="submit"
                            style={{
                                padding: '11px 36px',
                                background: `linear-gradient(135deg, ${PRIMARY} 0%, ${ACCENT} 100%)`,
                                color: '#fff', border: 'none', borderRadius: '10px',
                                fontWeight: '700', fontSize: '14px', cursor: 'pointer',
                                letterSpacing: '0.4px', boxShadow: `0 4px 14px rgba(14,165,233,0.35)`,
                                transition: 'opacity 0.2s',
                            }}
                            onMouseOver={e => e.currentTarget.style.opacity = '0.88'}
                            onMouseOut={e  => e.currentTarget.style.opacity = '1'}
                        >
                            💾 Lưu thay đổi
                        </button>
                    </div>
                </div>

            </div>
        </form>
    );
}

export default CapNhatThongTin;
