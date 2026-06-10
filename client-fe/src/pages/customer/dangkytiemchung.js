import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Select from 'react-select';
import { getMethod } from '../../services/request';
import { DatePicker } from 'antd';
import dayjs from 'dayjs';

/* ── palette ──────────────────────────────────── */
const PRIMARY  = '#2A388F';
const ACCENT   = '#0ea5e9';
const SUCCESS  = '#10b981';
const DANGER   = '#ef4444';
const TEXT     = '#1e293b';
const TEXT_2   = '#64748b';
const BORDER   = '#e2e8f0';
const BG_PAGE  = '#f0f4f8';
const BG_CARD  = '#ffffff';
const BG_INPUT = '#f8fafc';

/* ── shared Select styles ─────────────────────── */
const selectStyles = {
    control: (base, state) => ({
        ...base,
        borderRadius:'12px',
        border: `1.5px solid ${state.isFocused ? ACCENT : BORDER}`,
        boxShadow: state.isFocused
            ? `0 0 0 4px rgba(14,165,233,0.12), 0 2px 8px rgba(0,0,0,0.04)`
            : '0 1px 3px rgba(0,0,0,0.03)',
        background:'#fff', minHeight:'46px',
        paddingLeft:'4px',
        transition:'all 0.18s',
        cursor:'pointer',
        '&:hover': { borderColor: ACCENT },
    }),
    valueContainer: (base) => ({ ...base, padding:'2px 10px' }),
    placeholder: (base) => ({ ...base, color:'#94a3b8', fontSize:'14px' }),
    singleValue: (base) => ({ ...base, color:TEXT, fontWeight:'600', fontSize:'14px' }),
    input: (base) => ({ ...base, color:TEXT, fontSize:'14px' }),
    indicatorSeparator: () => ({ display:'none' }),
    dropdownIndicator: (base, state) => ({
        ...base,
        color: state.isFocused ? ACCENT : '#94a3b8',
        transition:'transform 0.18s, color 0.18s',
        transform: state.selectProps.menuIsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
        '&:hover': { color: ACCENT },
    }),
    menu: (base) => ({
        ...base,
        borderRadius:'12px',
        border:`1px solid ${BORDER}`,
        boxShadow:'0 12px 32px rgba(0,0,0,0.12)',
        overflow:'hidden',
        zIndex: 99999,
        marginTop:'6px',
    }),
    menuList: (base) => ({ ...base, padding:'6px' }),
    menuPortal: (base) => ({ ...base, zIndex: 99999 }),
    option: (base, state) => ({
        ...base,
        background: state.isSelected
            ? `linear-gradient(135deg, ${PRIMARY}, ${ACCENT})`
            : state.isFocused
                ? 'rgba(14,165,233,0.10)'
                : '#fff',
        color: state.isSelected ? '#fff' : TEXT,
        fontSize:'14px',
        fontWeight: state.isSelected ? '700' : '500',
        borderRadius:'8px',
        padding:'10px 12px',
        cursor:'pointer',
        transition:'background 0.12s',
    }),
    noOptionsMessage: (base) => ({ ...base, color: TEXT_2, fontSize:'13.5px', padding:'14px' }),
};

/* ── SectionCard ──────────────────────────────── */
function SectionCard({ step, title, icon, children }) {
    return (
        <div style={{
            background: BG_CARD, borderRadius:'16px', marginBottom:'20px',
            boxShadow:'0 2px 12px rgba(0,0,0,0.07)', border:`1px solid ${BORDER}`,
        }}>
            <div style={{
                display:'flex', alignItems:'center', gap:'12px',
                padding:'16px 24px', borderBottom:`1px solid ${BORDER}`,
                background:`linear-gradient(90deg, rgba(42,56,143,0.04) 0%, transparent 100%)`,
            }}>
                <div style={{
                    width:'32px', height:'32px', borderRadius:'50%', flexShrink:0,
                    background:`linear-gradient(135deg, ${PRIMARY}, ${ACCENT})`,
                    color:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:'13px', fontWeight:'800',
                }}>
                    {step}
                </div>
                <span style={{ fontSize:'16px' }}>{icon}</span>
                <h3 style={{ margin:0, fontSize:'15px', fontWeight:'800', color:PRIMARY, letterSpacing:'0.3px', textTransform:'uppercase' }}>
                    {title}
                </h3>
            </div>
            <div style={{ padding:'22px 24px' }}>
                {children}
            </div>
        </div>
    );
}

/* ── FieldLabel ───────────────────────────────── */
function FieldLabel({ children }) {
    return (
        <label style={{ display:'block', fontSize:'12px', fontWeight:'700', color:TEXT_2, marginBottom:'7px', letterSpacing:'0.4px', textTransform:'uppercase' }}>
            {children} <span style={{ color: DANGER }}>*</span>
        </label>
    );
}

/* ── Age parsing helpers ──────────────────────── */
/**
 * Parse string ageRange của vaccine → {minMonths, maxMonths}
 * Hỗ trợ các pattern phổ biến tiếng Việt:
 *   "6 tháng - 5 tuổi"  → {6, 60}
 *   "0 - 6 tháng"        → {0, 6}
 *   "12 tháng - 24 tháng"→ {12, 24}
 *   "18 tuổi trở lên"    → {216, Infinity}
 *   "18+"                → {216, Infinity}
 *   "trên 18 tuổi"       → {217, Infinity}
 *   "dưới 6 tháng"       → {0, 5}
 *   "trẻ em" / không rõ  → {0, Infinity, unknown:true}
 */
function parseAgeRange(text) {
    if (!text) return { minMonths: 0, maxMonths: Infinity, unknown: true };
    const t = String(text).toLowerCase().trim();
    const toMonths = (val, unit) => (unit && unit.indexOf('tháng') >= 0) ? val : val * 12;

    // "X trở lên" / "X+"
    let m = t.match(/(\d+)\s*(tháng|tuổi|năm)\s*(trở lên|trở đi)/);
    if (m) return { minMonths: toMonths(+m[1], m[2]), maxMonths: Infinity };
    m = t.match(/^(\d+)\s*\+\s*(tháng|tuổi|năm)?/);
    if (m) return { minMonths: toMonths(+m[1], m[2] || 'tuổi'), maxMonths: Infinity };

    // "trên X"
    m = t.match(/trên\s+(\d+)\s*(tháng|tuổi|năm)/);
    if (m) return { minMonths: toMonths(+m[1], m[2]) + 1, maxMonths: Infinity };

    // "dưới X"
    m = t.match(/dưới\s+(\d+)\s*(tháng|tuổi|năm)/);
    if (m) return { minMonths: 0, maxMonths: toMonths(+m[1], m[2]) - 1 };

    // "X tháng/tuổi - Y tháng/tuổi" (unit của min có thể vắng → dùng unit của max)
    m = t.match(/(\d+)\s*(tháng|tuổi|năm)?\s*[-–—]\s*(\d+)\s*(tháng|tuổi|năm)/);
    if (m) {
        const maxUnit = m[4];
        const minUnit = m[2] || maxUnit;
        return { minMonths: toMonths(+m[1], minUnit), maxMonths: toMonths(+m[3], maxUnit) };
    }

    return { minMonths: 0, maxMonths: Infinity, unknown: true };
}

/** Tính tuổi tính theo tháng từ DOB string (yyyy-MM-dd). */
function ageInMonths(dobStr) {
    if (!dobStr) return null;
    const d = new Date(dobStr);
    if (isNaN(d.getTime())) return null;
    const t = new Date();
    let m = (t.getFullYear() - d.getFullYear()) * 12 + (t.getMonth() - d.getMonth());
    if (t.getDate() < d.getDate()) m--;
    return Math.max(m, 0);
}

/** Format số tháng → "X năm Y tháng" hoặc "Y tháng" / "Z tuổi" */
function formatMonths(months) {
    if (months == null) return '';
    if (months < 12) return `${months} tháng`;
    const years = Math.floor(months / 12);
    const rest  = months % 12;
    if (rest === 0) return `${years} tuổi`;
    return `${years} tuổi ${rest} tháng`;
}

/* ══════════════════════════════════════════════ */
function DangKyTiem() {
    const [vacxinType,           setVacxinType]           = useState([]);
    const [vacxin,               setVacxin]               = useState([]);
    const [vacxinScheduleTime,   setVacxinScheduleTime]   = useState([]);
    const [dateScheduleTime,     setDateScheduleTime]     = useState([]);
    const [activeIndex,          setActiveIndex]          = useState(null);
    const [customer,             setCustomer]             = useState(null);
    const [currentDate,          setCurrentDate]          = useState(null);
    const [center,               setCenter]               = useState([]);
    const [currentVaccine,       setCurrentVaccine]       = useState(null);
    const [indexSchedule,        setIndexSchedule]        = useState(null);
    const [indexTime,            setIndexTime]            = useState(null);
    const [selectedSchedule,     setSelectedSchedule]     = useState(null);
    const [selectedTime,         setSelectedTime]         = useState(null);
    const [selectedType,         setSelectedType]         = useState(null);
    const [personalization,      setPersonalization]      = useState(null);
    const [personalizationLoading, setPersonalizationLoading] = useState(false);
    const [noCenter,             setNoCenter]             = useState(false);
    const [noDate,               setNoDate]               = useState(false);
    const [selectedDate,         setSelectedDate]         = useState(null);
    const [wantedDate,           setWantedDate]           = useState(null); // ngày user đã chọn ở step 2
    const [bookingFor,           setBookingFor]           = useState('self'); // 'self' | 'other'

    // Patient info — người được tiêm
    const [patientName,    setPatientName]    = useState('');
    const [patientDob,     setPatientDob]     = useState('');
    const [patientPhone,   setPatientPhone]   = useState('');
    const [patientAddress, setPatientAddress] = useState('');
    const [patientIdCard,  setPatientIdCard]  = useState('');
    const [profileLoaded,  setProfileLoaded]  = useState(false); // đã load profile của user login chưa
    const [startDateString, setStartDateString] = useState('');

    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        setCurrentDate(today);
        setStartDateString(today);
        const fetchData = async () => {
            const res    = await getMethod('/api/vaccine-type/find-all');
            const result = await res.json();
            setVacxinType(result);

            const uls     = new URL(document.URL);
            const vaccine = uls.searchParams.get('vaccine');
            if (vaccine != null) {
                const r2  = await getMethod('/api/vaccine/public/find-by-id?id=' + vaccine);
                const v   = await r2.json();
                setSelectedType(v.vaccineType);
                handleChonLoai(v.vaccineType);
                setCurrentVaccine(v);
                await checkPersonalization(v.id);
            }
        };
        fetchData();
    }, []);

    // Load profile user → auto-fill khi đặt cho chính mình
    useEffect(() => {
        const loadProfile = async () => {
            if (!localStorage.getItem('token')) return;
            try {
                const res = await getMethod('/api/customer-profile/customer/find-by-user');
                if (res.status !== 200) return;
                const p = await res.json();
                if (!p) return;
                setProfileLoaded(true);
                if (bookingFor === 'self') {
                    setPatientName(p.fullName || '');
                    setPatientDob(p.birthdate ? String(p.birthdate).split('T')[0] : '');
                    setPatientPhone(p.phone || '');
                    setPatientIdCard(p.idCard || '');
                    const addr = [p.street, p.ward, p.district, p.city].filter(Boolean).join(', ');
                    setPatientAddress(addr);
                }
            } catch (e) { /* ignore */ }
        };
        loadProfile();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Toggle 'self' ↔ 'other' → reset hoặc auto-fill
    useEffect(() => {
        if (bookingFor === 'other') {
            // Clear để user nhập info người khác
            setPatientName('');
            setPatientDob('');
            setPatientPhone('');
            setPatientAddress('');
            setPatientIdCard('');
        } else if (profileLoaded) {
            // Re-fill từ profile khi quay lại 'self'
            (async () => {
                try {
                    const res = await getMethod('/api/customer-profile/customer/find-by-user');
                    if (res.status !== 200) return;
                    const p = await res.json();
                    if (!p) return;
                    setPatientName(p.fullName || '');
                    setPatientDob(p.birthdate ? String(p.birthdate).split('T')[0] : '');
                    setPatientPhone(p.phone || '');
                    setPatientIdCard(p.idCard || '');
                    const addr = [p.street, p.ward, p.district, p.city].filter(Boolean).join(', ');
                    setPatientAddress(addr);
                } catch (e) {}
            })();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bookingFor]);

    // So sánh tuổi patient (theo tháng) với ageRange vaccine.
    // Trả về: { status: 'match'|'too_young'|'too_old'|'unknown'|'no_dob'|'no_vaccine', message, vaccineRange, patientMonths }
    function getAgeMatchStatus() {
        if (!currentVaccine) return { status: 'no_vaccine' };
        if (!patientDob)     return { status: 'no_dob' };
        const months = ageInMonths(patientDob);
        if (months == null) return { status: 'no_dob' };

        const ageRangeText = currentVaccine?.ageGroup?.ageRange || '';
        const range = parseAgeRange(ageRangeText);
        if (range.unknown) {
            return { status: 'unknown', vaccineRange: ageRangeText, patientMonths: months };
        }
        if (months < range.minMonths) {
            return {
                status: 'too_young',
                vaccineRange: ageRangeText,
                patientMonths: months,
                message: `Người được tiêm (${formatMonths(months)}) chưa đủ tuổi. Vaccine yêu cầu từ ${formatMonths(range.minMonths)}.`,
            };
        }
        if (months > range.maxMonths) {
            return {
                status: 'too_old',
                vaccineRange: ageRangeText,
                patientMonths: months,
                message: `Người được tiêm (${formatMonths(months)}) đã quá tuổi. Vaccine dành cho đến ${formatMonths(range.maxMonths)}.`,
            };
        }
        return { status: 'match', vaccineRange: ageRangeText, patientMonths: months };
    }

    // Validate patient info
    function validatePatient() {
        if (!patientName || patientName.trim().length < 2) {
            toast.error('Vui lòng nhập họ tên người được tiêm');
            return false;
        }
        if (!patientDob) {
            toast.error('Vui lòng nhập ngày sinh người được tiêm');
            return false;
        }
        const dobDate = new Date(patientDob);
        const today   = new Date();
        if (isNaN(dobDate.getTime())) {
            toast.error('Ngày sinh không hợp lệ');
            return false;
        }
        if (dobDate > today) {
            toast.error('Ngày sinh phải nhỏ hơn ngày hiện tại');
            return false;
        }
        let age = today.getFullYear() - dobDate.getFullYear();
        const md = today.getMonth() - dobDate.getMonth();
        const dd = today.getDate()  - dobDate.getDate();
        if (md < 0 || (md === 0 && dd < 0)) age--;
        if (age < 0 || age > 120) {
            toast.error('Tuổi không hợp lệ');
            return false;
        }
        if (!patientPhone || !/^[0-9+\-\s()]{8,15}$/.test(patientPhone.trim())) {
            toast.error('Số điện thoại không hợp lệ');
            return false;
        }
        if (!patientIdCard || !/^\d{9}$|^\d{12}$/.test(patientIdCard.trim())) {
            toast.error('Số CMND (9 chữ số) hoặc CCCD (12 chữ số) không hợp lệ');
            return false;
        }
        if (!patientAddress || patientAddress.trim().length < 3) {
            toast.error('Vui lòng nhập địa chỉ');
            return false;
        }
        // Check tuổi vs vaccine ageGroup
        if (currentVaccine) {
            const ageMatch = getAgeMatchStatus();
            if (ageMatch.status === 'too_young' || ageMatch.status === 'too_old') {
                toast.error(ageMatch.message);
                return false;
            }
        }
        return true;
    }

    const checkPersonalization = async (vaccineId) => {
        const token = localStorage.getItem('token');
        if (!token) { setPersonalization(null); return; }
        setPersonalizationLoading(true);
        try {
            const res = await getMethod(`/api/vaccine/customer/personalization/${vaccineId}`);
            if (res.status === 200) setPersonalization(await res.json());
            else setPersonalization(null);
        } catch (e) { setPersonalization(null); }
        finally { setPersonalizationLoading(false); }
    };

    const handleChonLoai = async (option) => {
        setSelectedType(option);
        const response = await getMethod(`/api/vaccine/all/find-by-type?typeId=${option.id}`);
        setVacxin(await response.json());
        setVacxinChoose(null);
    };

    const handleChonVaccine = async (item) => {
        setCurrentVaccine(item);
        setPersonalization(null);
        // Chỉ check personalization khi đặt cho chính mình
        if (item && bookingFor === 'self') await checkPersonalization(item.id);
    };

    const setVacxinChoose = (item, index) => {
        setActiveIndex(index);
    };

    async function getCenter() {
        const start = document.getElementById('start').value;
        if (!validatePatient()) return;
        if (currentVaccine == null) { toast.warning('Hãy chọn vaccine'); return; }
        if (!start) { toast.warning('Hãy chọn ngày tiêm'); return; }
        // Chỉ chặn theo personalization khi đặt cho chính mình
        if (bookingFor === 'self' && personalization && !personalization.canBook) {
            toast.error(personalization.reason); return;
        }
        const response = await getMethod(`/api/vaccine-schedule/public/get-center?start=${start}&vaccineId=${currentVaccine.id}`);
        const result   = await response.json();
        if (response.status === 417) { toast.error(result.defaultMessage); return; }
        setWantedDate(start);
        setCenter(result);
        setNoCenter(result.length === 0);
        setIndexTime(null);
        setVacxinScheduleTime([]);
        setSelectedTime(null);
        setDateScheduleTime([]);
        setIndexSchedule(null);
        setSelectedSchedule(null);
        setSelectedDate(null);
    }

    async function loadDateScheduleTime(schedule, index) {
        setIndexSchedule(index);
        setSelectedSchedule(schedule);
        setIndexTime(null);
        setVacxinScheduleTime([]);
        setSelectedTime(null);
        setSelectedDate(null);

        const response = await getMethod(`/api/vaccine-schedule-time/public/find-date-by-vaccine-schedule?idSchedule=${schedule.id}`);
        const result   = await response.json();
        setDateScheduleTime(result);
        setNoDate(result.length === 0);

        if (!Array.isArray(result) || result.length === 0) return;

        // Chỉ load giờ tiêm nếu ngày user chọn ở step 2 có trong danh sách.
        // KHÔNG auto-swap sang ngày khác để tránh user hiểu nhầm.
        if (result.includes(wantedDate)) {
            await loadScheduleTimeByDate(wantedDate, schedule.id);
        }
    }

    async function loadScheduleTimeByDate(date, scheduleId) {
        const response = await getMethod(`/api/vaccine-schedule-time/public/find-time-by-vaccine-schedule?date=${date}&idSchedule=${scheduleId}`);
        setVacxinScheduleTime(await response.json());
        setSelectedDate(date);
    }

    function setTimeChoose(item, index) {
        setIndexTime(index);
        setSelectedTime(item);
    }

    function formatTime(time) {
        const parts = time.split(':');
        return `${parts[0]}:${parts[1]}`;
    }

    function chuyenTrangDangky() {
        if (!selectedTime) return;
        if (!validatePatient()) return;

        // Lưu patient info để xacnhandangky đọc
        const patientInfo = {
            fullName: patientName.trim(),
            dob:      patientDob,
            phone:    patientPhone.trim(),
            idCard:   patientIdCard.trim(),
            address:  patientAddress.trim(),
            bookingForOther: bookingFor === 'other',
        };
        try {
            sessionStorage.setItem('patientInfo_' + selectedTime.id, JSON.stringify(patientInfo));
        } catch (e) { /* ignore */ }

        const forParam = bookingFor === 'other' ? '&for=other' : '';
        window.open('xac-nhan-dang-ky?time=' + selectedTime.id + forParam, '_blank');
    }

    /* ── personalization banner ───────────────── */
    const PersonalizationBanner = () => {
        if (!personalization && !personalizationLoading) return null;
        if (personalizationLoading) return (
            <div style={{ padding:'12px 16px', borderRadius:'10px', background:'rgba(14,165,233,0.07)', border:`1px solid rgba(14,165,233,0.2)`, color:ACCENT, fontSize:'14px', display:'flex', alignItems:'center', gap:'10px' }}>
                <span style={{ fontSize:'18px' }}>⏳</span> Đang kiểm tra thông tin tiêm chủng của bạn...
            </div>
        );
        if (!personalization) return null;

        if (!personalization.canBook) return (
            <div style={{ padding:'14px 16px', borderRadius:'10px', background:'#fff2f0', border:'1px solid #ffccc7', color:'#cf1322', fontSize:'14px', lineHeight:'1.6' }}>
                <div style={{ fontWeight:'700', marginBottom:'6px', display:'flex', alignItems:'center', gap:'8px' }}>
                    <span>🚫</span> Không thể đặt lịch tiêm
                </div>
                <div>{personalization.reason}</div>
                {personalization.earliestNextDate && (
                    <div style={{ marginTop:'6px', color:'#8b0000' }}>
                        📅 Ngày sớm nhất có thể tiêm mũi {personalization.nextDoseNumber}: <strong>{personalization.earliestNextDate}</strong>
                    </div>
                )}
            </div>
        );

        return (
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                <div style={{ padding:'12px 16px', borderRadius:'10px', background:'#f0fdf4', border:'1px solid #bbf7d0', color:'#166534', fontSize:'14px', display:'flex', alignItems:'center', gap:'10px' }}>
                    <span>✅</span>
                    {personalization.completedDoses === 0
                        ? 'Bạn chưa tiêm mũi nào. Hãy đặt lịch tiêm mũi đầu tiên!'
                        : `Bạn đã tiêm ${personalization.completedDoses} mũi. Đề xuất tiêm mũi ${personalization.nextDoseNumber} tiếp theo.`}
                    {personalization.maxDose && (
                        <span style={{ color:'#64748b', fontSize:'13px' }}>({personalization.completedDoses}/{personalization.maxDose} mũi)</span>
                    )}
                </div>
                {personalization.hasReminder && (
                    <div style={{ padding:'12px 16px', borderRadius:'10px', background:'#fffbeb', border:'1px solid #fde68a', color:'#92400e', fontSize:'14px', display:'flex', alignItems:'center', gap:'10px' }}>
                        <span>🔔</span> {personalization.reminderMessage}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div style={{ background: BG_PAGE, minHeight: '80vh' }}>

            {/* ── Hero ──────────────────────────────────── */}
            <div style={{
                background: `linear-gradient(135deg, #0d1b3e 0%, ${PRIMARY} 55%, ${ACCENT} 100%)`,
                padding: '40px 24px 56px', position:'relative', overflow:'hidden',
            }}>
                <div style={{ position:'absolute', top:'-30px', right:'-30px', width:'200px', height:'200px', borderRadius:'50%', background:'rgba(255,255,255,0.04)', pointerEvents:'none' }}/>
                <div style={{ maxWidth:'900px', margin:'0 auto', textAlign:'center', position:'relative', zIndex:1 }}>
                    <div style={{ marginBottom:'12px', fontSize:'13px', color:'rgba(255,255,255,0.65)' }}>
                        <a href="/" style={{ color:'rgba(255,255,255,0.65)', textDecoration:'none' }}>Trang chủ</a>
                        <span style={{ margin:'0 8px' }}>›</span>
                        <span style={{ color:'#fff' }}>Đăng ký tiêm chủng</span>
                    </div>
                    <h1 style={{ color:'#fff', fontSize:'28px', fontWeight:'800', margin:'0 0 10px', letterSpacing:'-0.5px' }}>
                        💉 Đăng Ký Tiêm Chủng
                    </h1>
                    <p style={{ color:'rgba(255,255,255,0.78)', fontSize:'15px', margin:0 }}>
                        Chọn vaccine, chọn lịch tiêm và đặt hẹn chỉ trong vài bước đơn giản
                    </p>
                </div>
            </div>

            {/* ── Main content ──────────────────────────── */}
            <div style={{ maxWidth:'960px', margin:'-24px auto 0', padding:'0 20px 60px', position:'relative', zIndex:2 }}>

                {/* Step 1: Chọn vaccine */}
                <SectionCard step="1" icon="🧬" title="Thông tin dịch vụ">
                    {/* Đăng ký cho ai? */}
                    <div style={{ marginBottom:'22px' }}>
                        <div style={{ fontSize:'12px', fontWeight:'700', color:TEXT_2, letterSpacing:'0.4px', textTransform:'uppercase', marginBottom:'10px' }}>
                            Đăng ký cho ai? <span style={{ color: DANGER }}>*</span>
                        </div>
                        <div style={{ display:'flex', gap:'12px', flexWrap:'wrap' }}>
                            {[
                                { value:'self',  icon:'🧍', label:'Tôi',         desc:'Kiểm tra lịch sử tiêm của tôi để gợi ý' },
                                { value:'other', icon:'👶', label:'Người khác', desc:'Đặt giúp người thân, không dùng lịch sử của tôi' },
                            ].map(opt => {
                                const active = bookingFor === opt.value;
                                return (
                                    <label
                                        key={opt.value}
                                        onClick={() => {
                                            setBookingFor(opt.value);
                                            if (opt.value === 'other') setPersonalization(null);
                                            else if (currentVaccine) checkPersonalization(currentVaccine.id);
                                        }}
                                        style={{
                                            flex:'1 1 240px', cursor:'pointer',
                                            display:'flex', alignItems:'center', gap:'12px',
                                            padding:'12px 14px', borderRadius:'12px',
                                            border:`2px solid ${active ? ACCENT : BORDER}`,
                                            background: active ? 'rgba(14,165,233,0.06)' : '#fff',
                                            transition:'all 0.18s',
                                        }}
                                        onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = ACCENT; }}
                                        onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = BORDER; }}
                                    >
                                        <input
                                            type="radio" name="bookingFor" value={opt.value}
                                            checked={active} onChange={() => {}}
                                            style={{ accentColor: ACCENT, transform:'scale(1.2)' }}
                                        />
                                        <div style={{ fontSize:'22px' }}>{opt.icon}</div>
                                        <div style={{ flex:1, minWidth:0 }}>
                                            <div style={{ fontWeight:'700', fontSize:'14px', color: active ? PRIMARY : TEXT }}>
                                                {opt.label}
                                            </div>
                                            <div style={{ fontSize:'12px', color:TEXT_2, marginTop:'2px' }}>
                                                {opt.desc}
                                            </div>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Thông tin người được tiêm ── */}
                    <div style={{ marginBottom: '22px' }}>
                        <div style={{ fontSize:'12px', fontWeight:'700', color:TEXT_2, letterSpacing:'0.4px', textTransform:'uppercase', marginBottom:'10px', display:'flex', alignItems:'center', gap:'8px' }}>
                            <span>👤 Thông tin người được tiêm</span>
                            {bookingFor === 'self' && profileLoaded && (
                                <span style={{ fontSize:'10.5px', padding:'2px 8px', borderRadius:'20px', background:'rgba(16,185,129,0.1)', color:SUCCESS, fontWeight:'600', textTransform:'none', letterSpacing:0 }}>
                                    ✓ Đã tự điền từ hồ sơ
                                </span>
                            )}
                        </div>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px 18px' }}>
                            <div>
                                <FieldLabel>Họ tên</FieldLabel>
                                <input
                                    type="text" value={patientName} onChange={e => setPatientName(e.target.value)}
                                    placeholder={bookingFor === 'other' ? 'Họ tên người được tiêm' : 'Họ tên của bạn'}
                                    style={{
                                        width:'100%', padding:'12px 14px', borderRadius:'12px',
                                        border:`1.5px solid ${BORDER}`, background:'#fff',
                                        fontSize:'14px', color:TEXT, outline:'none', boxSizing:'border-box',
                                    }}
                                    onFocus={e => e.target.style.borderColor = ACCENT}
                                    onBlur={e  => e.target.style.borderColor = BORDER}
                                />
                            </div>
                            <div>
                                <FieldLabel>Ngày sinh</FieldLabel>
                                <DatePicker
                                    value={patientDob ? dayjs(patientDob) : null}
                                    onChange={(date, dateString) => setPatientDob(dateString)}
                                    disabledDate={(current) => current && current > dayjs().endOf('day')}
                                    format="YYYY-MM-DD"
                                    placeholder="Chọn ngày sinh"
                                    style={{
                                        width:'100%', padding:'12px 14px', borderRadius:'12px',
                                        border:`1.5px solid ${BORDER}`, background:'#fff',
                                        fontSize:'14px', color:TEXT, outline:'none', boxSizing:'border-box',
                                        height: '46px'
                                    }}
                                />
                                {patientDob && (() => {
                                    const d = new Date(patientDob);
                                    if (isNaN(d.getTime())) return null;
                                    const t = new Date();
                                    let age = t.getFullYear() - d.getFullYear();
                                    const md = t.getMonth() - d.getMonth();
                                    const dd = t.getDate() - d.getDate();
                                    if (md < 0 || (md === 0 && dd < 0)) age--;
                                    if (age < 0) return null;
                                    let label;
                                    if (age === 0) {
                                        const months = (t.getFullYear() - d.getFullYear()) * 12 + (t.getMonth() - d.getMonth()) - (t.getDate() < d.getDate() ? 1 : 0);
                                        label = `${Math.max(months, 0)} tháng tuổi`;
                                    } else {
                                        label = `${age} tuổi`;
                                    }
                                    return (
                                        <div style={{ fontSize:'12px', color:ACCENT, marginTop:'5px', fontWeight:'600' }}>
                                            🎂 {label}
                                        </div>
                                    );
                                })()}
                            </div>
                            <div>
                                <FieldLabel>Số điện thoại</FieldLabel>
                                <input
                                    type="tel" value={patientPhone} onChange={e => setPatientPhone(e.target.value)}
                                    placeholder="0123456789"
                                    style={{
                                        width:'100%', padding:'12px 14px', borderRadius:'12px',
                                        border:`1.5px solid ${BORDER}`, background:'#fff',
                                        fontSize:'14px', color:TEXT, outline:'none', boxSizing:'border-box',
                                    }}
                                    onFocus={e => e.target.style.borderColor = ACCENT}
                                    onBlur={e  => e.target.style.borderColor = BORDER}
                                />
                            </div>
                            <div>
                                <FieldLabel>Số CMND / CCCD</FieldLabel>
                                <input
                                    type="text" value={patientIdCard}
                                    onChange={e => setPatientIdCard(e.target.value.replace(/\D/g, ''))}
                                    placeholder="9 hoặc 12 chữ số"
                                    maxLength={12}
                                    inputMode="numeric"
                                    style={{
                                        width:'100%', padding:'12px 14px', borderRadius:'12px',
                                        border:`1.5px solid ${BORDER}`, background:'#fff',
                                        fontSize:'14px', color:TEXT, outline:'none', boxSizing:'border-box',
                                    }}
                                    onFocus={e => e.target.style.borderColor = ACCENT}
                                    onBlur={e  => e.target.style.borderColor = BORDER}
                                />
                            </div>
                            <div>
                                <FieldLabel>Địa chỉ</FieldLabel>
                                <input
                                    type="text" value={patientAddress} onChange={e => setPatientAddress(e.target.value)}
                                    placeholder="Số nhà, đường, phường, quận, tỉnh"
                                    style={{
                                        width:'100%', padding:'12px 14px', borderRadius:'12px',
                                        border:`1.5px solid ${BORDER}`, background:'#fff',
                                        fontSize:'14px', color:TEXT, outline:'none', boxSizing:'border-box',
                                    }}
                                    onFocus={e => e.target.style.borderColor = ACCENT}
                                    onBlur={e  => e.target.style.borderColor = BORDER}
                                />
                            </div>
                        </div>
                        {bookingFor === 'other' && (
                            <div style={{
                                marginTop:'12px', padding:'10px 14px', borderRadius:'10px',
                                background:'#fffbeb', border:'1px solid #fde68a', color:'#92400e',
                                fontSize:'13px', display:'flex', alignItems:'flex-start', gap:'8px',
                            }}>
                                <span>ℹ️</span>
                                <span>Điền thông tin của <strong>người được tiêm</strong></span>
                            </div>
                        )}
                    </div>

                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'18px 24px' }}>
                        <div>
                            <FieldLabel>Loại vắc xin</FieldLabel>
                            <Select
                                options={vacxinType}
                                getOptionLabel={o => o.typeName}
                                getOptionValue={o => o.id}
                                value={selectedType}
                                onChange={handleChonLoai}
                                placeholder="🔍 Gõ hoặc chọn loại vaccine..."
                                noOptionsMessage={() => 'Không có loại vaccine khớp'}
                                isSearchable
                                styles={selectStyles}
                                menuPortalTarget={document.body}
                                menuPosition="fixed"
                            />
                        </div>
                        <div>
                            <FieldLabel>Tên vaccine</FieldLabel>
                            <Select
                                options={vacxin}
                                getOptionLabel={o => o.name}
                                getOptionValue={o => o.id}
                                onChange={handleChonVaccine}
                                value={currentVaccine}
                                placeholder={vacxin.length === 0 ? 'Chọn loại vaccine trước...' : `🔍 Gõ tên hoặc chọn (${vacxin.length} vaccine)...`}
                                noOptionsMessage={() => 'Không tìm thấy vaccine khớp'}
                                isDisabled={vacxin.length === 0}
                                isSearchable
                                styles={selectStyles}
                                menuPortalTarget={document.body}
                                menuPosition="fixed"
                            />
                        </div>
                    </div>

                    {/* personalization banner — chỉ hiện khi đặt cho chính mình */}
                    {bookingFor === 'self' && (personalization || personalizationLoading) && (
                        <div style={{ marginTop:'16px' }}>
                            <PersonalizationBanner />
                        </div>
                    )}

                    {/* Age match banner — hiện khi đã chọn vaccine + có DOB */}
                    {currentVaccine && patientDob && (() => {
                        const m = getAgeMatchStatus();
                        const vaccineRange = currentVaccine?.ageGroup?.ageRange || 'Không xác định';
                        const patientText = m.patientMonths != null ? formatMonths(m.patientMonths) : '—';

                        if (m.status === 'match') {
                            return (
                                <div style={{
                                    marginTop:'14px', padding:'12px 14px', borderRadius:'10px',
                                    background:'#f0fdf4', border:'1px solid #bbf7d0', color:'#166534',
                                    fontSize:'13.5px', display:'flex', alignItems:'center', gap:'10px',
                                }}>
                                    <span style={{ fontSize:'16px' }}>✅</span>
                                    <span>
                                        Tuổi <strong>{patientText}</strong> phù hợp với vaccine (yêu cầu: <strong>{vaccineRange}</strong>)
                                    </span>
                                </div>
                            );
                        }
                        if (m.status === 'too_young' || m.status === 'too_old') {
                            return (
                                <div style={{
                                    marginTop:'14px', padding:'14px 16px', borderRadius:'10px',
                                    background:'#fff2f0', border:'1px solid #ffccc7', color:'#cf1322',
                                    fontSize:'14px', lineHeight:'1.5',
                                }}>
                                    <div style={{ fontWeight:'700', marginBottom:'4px', display:'flex', alignItems:'center', gap:'8px' }}>
                                        <span>🚫</span> Không đủ điều kiện về tuổi
                                    </div>
                                    <div>{m.message}</div>
                                    <div style={{ fontSize:'12.5px', color:'#7a1118', marginTop:'4px' }}>
                                        Vui lòng chọn vaccine khác
                                    </div>
                                </div>
                            );
                        }
                        if (m.status === 'unknown') {
                            return (
                                <div style={{
                                    marginTop:'14px', padding:'12px 14px', borderRadius:'10px',
                                    background:'#fffbeb', border:'1px solid #fde68a', color:'#92400e',
                                    fontSize:'13px', display:'flex', alignItems:'center', gap:'10px',
                                }}>
                                    <span>ℹ️</span>
                                    <span>
                                        Vaccine khuyến nghị cho: <strong>{vaccineRange}</strong>. Tuổi người được tiêm: <strong>{patientText}</strong>. Vui lòng tự đảm bảo phù hợp.
                                    </span>
                                </div>
                            );
                        }
                        return null;
                    })()}
                </SectionCard>

                {/* Step 2: Thời gian & địa điểm */}
                <SectionCard step="2" icon="📅" title="Chọn ngày & địa điểm tiêm">
                    {/* date + search */}
                    <div style={{ display:'flex', gap:'14px', flexWrap:'wrap', alignItems:'flex-end', marginBottom:'24px' }}>
                        <div style={{ flex:'0 0 260px' }}>
                            <FieldLabel>Ngày tiêm</FieldLabel>
                            <DatePicker
                                value={startDateString ? dayjs(startDateString) : null}
                                onChange={(date, dateString) => setStartDateString(dateString)}
                                disabledDate={(current) => current && current < dayjs().startOf('day')}
                                format="YYYY-MM-DD"
                                placeholder="Chọn ngày tiêm"
                                style={{
                                    width:'100%', padding:'12px 14px', borderRadius:'12px',
                                    border:`1.5px solid ${BORDER}`, background:'#fff',
                                    fontSize:'14px', fontWeight:'600', color:TEXT, outline:'none',
                                    boxSizing:'border-box',
                                    height: '46px'
                                }}
                            />
                            <input id="start" type="hidden" value={startDateString} />
                        </div>
                        <button
                            onClick={getCenter}
                            style={{
                                padding:'12px 28px', borderRadius:'12px',
                                background:`linear-gradient(135deg, ${PRIMARY}, ${ACCENT})`,
                                color:'#fff', border:'none', fontWeight:'700',
                                fontSize:'14px', cursor:'pointer',
                                boxShadow:'0 4px 14px rgba(14,165,233,0.3)',
                                height:'46px',
                                display:'flex', alignItems:'center', gap:'8px',
                                transition:'transform 0.18s, box-shadow 0.18s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 6px 18px rgba(14,165,233,0.4)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 4px 14px rgba(14,165,233,0.3)'; }}
                        >
                            🔍 Tìm lịch tiêm
                        </button>
                    </div>

                    {/* center cards */}
                    {noCenter && (
                        <div style={{ textAlign:'center', padding:'32px', color:TEXT_2 }}>
                            <div style={{ fontSize:'36px', marginBottom:'10px' }}>😔</div>
                            Xin lỗi! Không tìm thấy lịch tiêm nào với vaccine này vào ngày đã chọn.
                        </div>
                    )}

                    {center.length > 0 && (
                        <>
                            <div style={{ fontSize:'13px', fontWeight:'700', color:TEXT_2, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'14px' }}>
                                📍 Chọn địa điểm tiêm ({center.length} trung tâm)
                            </div>
                            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:'14px' }}>
                                {center.map((it, index) => {
                                    const selected = indexSchedule === index;
                                    return (
                                        <div
                                            key={it.id}
                                            onClick={() => loadDateScheduleTime(it, index)}
                                            style={{
                                                borderRadius:'12px', padding:'16px',
                                                border: `2px solid ${selected ? ACCENT : BORDER}`,
                                                background: selected ? 'rgba(14,165,233,0.06)' : BG_CARD,
                                                cursor:'pointer', position:'relative',
                                                transition:'all 0.18s',
                                                boxShadow: selected ? `0 4px 14px rgba(14,165,233,0.2)` : '0 2px 8px rgba(0,0,0,0.05)',
                                            }}
                                            onMouseEnter={e => { if (!selected) e.currentTarget.style.borderColor = ACCENT; }}
                                            onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = BORDER; }}
                                        >
                                            {selected && (
                                                <div style={{
                                                    position:'absolute', top:'10px', right:'10px',
                                                    width:'22px', height:'22px', borderRadius:'50%',
                                                    background:ACCENT, color:'#fff',
                                                    display:'flex', alignItems:'center', justifyContent:'center',
                                                    fontSize:'11px', fontWeight:'800',
                                                }}>✓</div>
                                            )}
                                            <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px' }}>
                                                <div style={{ width:'38px', height:'38px', borderRadius:'10px', background: selected ? ACCENT : 'rgba(42,56,143,0.08)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', flexShrink:0 }}>
                                                    🏥
                                                </div>
                                                <div style={{ fontWeight:'700', fontSize:'14px', color: selected ? PRIMARY : TEXT, lineHeight:'1.3' }}>
                                                    {it.center.centerName}
                                                </div>
                                            </div>
                                            <div style={{ fontSize:'12.5px', color:TEXT_2, marginBottom:'5px' }}>
                                                📍 {it.center.street}, {it.center.ward}, {it.center.district}
                                            </div>
                                            <div style={{ fontSize:'12px', color:TEXT_2 }}>
                                                🗓 {it.startDate} → {it.endDate}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </SectionCard>

                {/* Step 3: Chọn giờ tiêm */}
                {(dateScheduleTime.length > 0 || noDate || vacxinScheduleTime.length > 0) && (
                    <SectionCard step="3" icon="⏰" title="Chọn giờ tiêm">

                        {noDate && (
                            <div style={{ textAlign:'center', padding:'24px', color:TEXT_2 }}>
                                <div style={{ fontSize:'32px', marginBottom:'10px' }}>😔</div>
                                Không tìm thấy ngày tiêm nào với trung tâm này.
                            </div>
                        )}

                        {/* Banner ngày tiêm hợp lệ */}
                        {selectedDate && (
                            <div style={{
                                marginBottom:'18px', padding:'10px 14px', borderRadius:'10px',
                                background:'rgba(14,165,233,0.07)', border:`1px solid rgba(14,165,233,0.25)`,
                                color:PRIMARY, fontSize:'14px', display:'flex', alignItems:'center', gap:'8px',
                            }}>
                                <span style={{ fontSize:'16px' }}>📅</span>
                                <span>Lịch tiêm ngày <strong>{selectedDate}</strong></span>
                            </div>
                        )}

                        {/* Warning: trung tâm không có lịch vào ngày đã chọn — không cho đăng ký */}
                        {!selectedDate && dateScheduleTime.length > 0 && (
                            <div style={{
                                padding:'14px 16px', borderRadius:'10px',
                                background:'#fff2f0', border:'1px solid #ffccc7', color:'#cf1322',
                                fontSize:'14px', lineHeight:'1.6',
                            }}>
                                <div style={{ fontWeight:'700', marginBottom:'6px', display:'flex', alignItems:'center', gap:'8px' }}>
                                    <span>🚫</span> Không có lịch tiêm vào ngày {wantedDate}
                                </div>
                                <div style={{ marginBottom:'8px' }}>
                                    Trung tâm này không phục vụ ngày bạn chọn. Vui lòng <strong>đổi ngày ở bước 2</strong> hoặc <strong>chọn trung tâm khác</strong>.
                                </div>
                                <div style={{ fontSize:'13px', color:'#7a1118' }}>
                                    📌 Các ngày có lịch tiêm tại trung tâm này: <strong>{dateScheduleTime.slice(0, 6).join(', ')}{dateScheduleTime.length > 6 ? '...' : ''}</strong>
                                </div>
                            </div>
                        )}

                        {vacxinScheduleTime.length > 0 && (
                            <>
                                <div style={{ fontSize:'12px', fontWeight:'700', color:TEXT_2, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'12px' }}>
                                    Chọn giờ tiêm
                                </div>
                                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:'10px' }}>
                                    {vacxinScheduleTime.map((it, index) => {
                                        const available = it.quantity !== it.limitPeople;
                                        const selected  = selectedTime === it;
                                        return (
                                            <div
                                                key={it.id}
                                                onClick={() => available && setTimeChoose(it, index)}
                                                style={{
                                                    borderRadius:'10px', padding:'12px 10px', textAlign:'center',
                                                    border: `2px solid ${selected ? ACCENT : available ? BORDER : '#fca5a5'}`,
                                                    background: selected ? `linear-gradient(135deg, ${PRIMARY}, ${ACCENT})` : available ? BG_CARD : '#fff5f5',
                                                    color: selected ? '#fff' : available ? TEXT : '#dc2626',
                                                    cursor: available ? 'pointer' : 'not-allowed',
                                                    opacity: available ? 1 : 0.65,
                                                    transition:'all 0.15s',
                                                    boxShadow: selected ? `0 4px 14px rgba(14,165,233,0.3)` : 'none',
                                                }}
                                            >
                                                <div style={{ fontWeight:'700', fontSize:'14px', marginBottom:'5px' }}>
                                                    {formatTime(it.start)} – {formatTime(it.end)}
                                                </div>
                                                <div style={{ fontSize:'12px', opacity:0.85 }}>
                                                    {available ? `Còn ${it.limitPeople - it.quantity} chỗ` : 'Đã hết'}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </SectionCard>
                )}

                {/* Confirm button */}
                {selectedTime && (
                    <div style={{ display:'flex', justifyContent:'center', marginTop:'8px' }}>
                        <button
                            id="btndangkytiem"
                            onClick={chuyenTrangDangky}
                            style={{
                                padding:'14px 48px',
                                background:`linear-gradient(135deg, ${SUCCESS} 0%, #059669 100%)`,
                                color:'#fff', border:'none', borderRadius:'50px',
                                fontWeight:'800', fontSize:'16px', cursor:'pointer',
                                boxShadow:'0 6px 20px rgba(16,185,129,0.4)',
                                display:'flex', alignItems:'center', gap:'10px',
                                letterSpacing:'0.3px', transition:'all 0.2s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(16,185,129,0.5)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 6px 20px rgba(16,185,129,0.4)'; }}
                        >
                            <span>✅</span> Xác nhận đăng ký
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default DangKyTiem;
