import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { CustomerScheduleApi } from "../../../../services/staff/CustomerSchedule.api";
import { VaccineScheduleApi } from "../../../../services/staff/VaccineSchedule.api";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faArrowLeft, faSearch, faUsers, faMoneyBillWave, faSyringe, faBan,
    faExternalLinkAlt, faFilter, faCalendarDays,
} from "@fortawesome/free-solid-svg-icons";

/* ── palette đồng bộ với các trang admin khác ── */
const PRIMARY = "#2A388F";
const ACCENT  = "#0ea5e9";
const SUCCESS = "#10b981";
const DANGER  = "#ef4444";
const WARNING = "#f59e0b";
const PURPLE  = "#8b5cf6";
const BORDER  = "#e2e8f0";
const TEXT    = "#1e293b";
const TEXT_2  = "#64748b";
const BG_ROW  = "#f8fafc";

/* ── parser cho health status JSON (đồng bộ với lichdadangky.js) ── */
const SCREENING_LABELS = {
    hasFever:                  "Sốt",
    hasAllergy:                "Dị ứng vaccine/thuốc",
    isPregnant:                "Mang thai",
    isOnImmunosuppressant:     "Đang dùng thuốc ức chế MD",
    hasSevereChronicCondition: "Bệnh nền nghiêm trọng",
    hadReactionLastDose:       "Phản ứng mũi trước",
    hasInfectionLast14Days:    "Nhiễm trùng 14 ngày qua",
};
const SYMPTOM_LABELS = {
    painAtSite:           "Đau, sưng tại chỗ tiêm",
    redness:              "Đỏ tại chỗ tiêm",
    mildFever:            "Sốt nhẹ (<38.5°C)",
    highFever:            "Sốt cao (≥38.5°C)",
    fatigue:              "Mệt mỏi, đau cơ",
    rash:                 "Phát ban",
    difficultyBreathing:  "Khó thở",
    severeReaction:       "Phản ứng nặng",
};

function parseHealth(text) {
    if (!text) return null;
    const trimmed = String(text).trim();
    if (!trimmed.startsWith("{")) return { isText: true, text: trimmed };
    try {
        return { isText: false, data: JSON.parse(trimmed) };
    } catch { return { isText: true, text: trimmed }; }
}

/** Trả label tóm tắt + style từ JSON */
function renderHealthCell(text) {
    if (!text) return <span style={{ color: "#bbb" }}>—</span>;
    const parsed = parseHealth(text);
    if (parsed.isText) {
        const t = parsed.text;
        return <span style={{ fontSize: 12.5, color: TEXT_2 }}>{t.length > 50 ? t.slice(0, 50) + "…" : t}</span>;
    }
    const d = parsed.data || {};
    const isFollowup = d.symptoms && typeof d.symptoms === "object";
    if (isFollowup) {
        const dangers = Object.keys(SYMPTOM_LABELS).filter(k => d.symptoms[k] === true);
        if (dangers.length === 0) {
            return (
                <span style={{ fontSize: 12.5, color: SUCCESS, fontWeight: 600 }}>
                    ✓ Ổn định
                    {d.observedTemperature && <span style={{ color: TEXT_2, fontWeight: 400 }}> · {d.observedTemperature}°C</span>}
                </span>
            );
        }
        return <span style={{ fontSize: 12.5, color: DANGER, fontWeight: 600 }}>⚠ {dangers.length} triệu chứng</span>;
    }
    const dangers = Object.keys(SCREENING_LABELS).filter(k => d[k] === true);
    if (dangers.length === 0) {
        return (
            <span style={{ fontSize: 12.5, color: SUCCESS, fontWeight: 600 }}>
                ✓ Đủ điều kiện
                {d.temperature && <span style={{ color: TEXT_2, fontWeight: 400 }}> · {d.temperature}°C</span>}
            </span>
        );
    }
    return <span style={{ fontSize: 12.5, color: WARNING, fontWeight: 600 }}>⚠ {dangers.length} cảnh báo</span>;
}

/* ── status badge ── */
const STATUS_CONFIG = {
    pending:      { label: "Chờ duyệt",  bg: "#fef3c7", color: "#92400e", dot: WARNING },
    confirmed:    { label: "Đã duyệt",   bg: "#d1fae5", color: "#065f46", dot: SUCCESS },
    cancelled:    { label: "Đã hủy",     bg: "#fee2e2", color: "#991b1b", dot: DANGER  },
    injected:     { label: "Đã tiêm",    bg: "#dbeafe", color: "#1e40af", dot: "#3b82f6" },
    finished:     { label: "Hoàn thành", bg: "#e0e7ff", color: "#3730a3", dot: PURPLE  },
    not_injected: { label: "Chưa tiêm",  bg: "#f3f4f6", color: "#6b7280", dot: "#9ca3af" },
};
function StatusBadge({ status }) {
    const cfg = STATUS_CONFIG[status] || { label: status || "—", bg: "#f3f4f6", color: "#6b7280", dot: "#9ca3af" };
    return (
        <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            background: cfg.bg, color: cfg.color,
            padding: "3px 10px", borderRadius: 16,
            fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap",
        }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot }} />
            {cfg.label}
        </span>
    );
}

function PayBadge({ paid }) {
    return paid ? (
        <span style={{
            background: "#d1fae5", color: "#065f46", padding: "3px 10px",
            borderRadius: 16, fontSize: 11.5, fontWeight: 700,
        }}>✓ Đã thanh toán</span>
    ) : (
        <span style={{
            background: "#fef3c7", color: "#92400e", padding: "3px 10px",
            borderRadius: 16, fontSize: 11.5, fontWeight: 700,
        }}>⏳ Chưa thanh toán</span>
    );
}

/* ── stat card ── */
function StatCard({ icon, label, value, color, bg }) {
    return (
        <div style={{
            flex: 1, minWidth: 160, background: "#fff", borderRadius: 14,
            border: `1px solid ${BORDER}`, padding: "16px 18px",
            display: "flex", alignItems: "center", gap: 14,
            transition: "all 0.15s",
        }}>
            <div style={{
                width: 44, height: 44, borderRadius: 12, background: bg,
                color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19,
            }}>
                <FontAwesomeIcon icon={icon} />
            </div>
            <div>
                <div style={{ fontSize: 11.5, color: TEXT_2, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>
                    {label}
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: TEXT, lineHeight: 1.2, marginTop: 2 }}>
                    {value}
                </div>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════ */
export const CustomerScheduleViewDetail = () => {
    const nav = useNavigate();
    const { state } = useLocation();              // state = vaccineScheduleId
    const vaccineScheduleId = state;

    const [loading, setLoading] = useState(false);
    const [items, setItems]     = useState([]);
    const [total, setTotal]     = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize]       = useState(10);

    /* filter */
    const [fullName, setFullName] = useState("");
    const [status,   setStatus]   = useState("");
    const [from, setFrom] = useState("");
    const [to,   setTo]   = useState("");

    /* meta */
    const [campaign, setCampaign] = useState(null);

    /* load detail meta của đợt */
    useEffect(() => {
        if (!vaccineScheduleId) return;
        VaccineScheduleApi.vaccineSchedules().then(res => {
            const found = res.data.find(item => item.id === vaccineScheduleId);
            if (found) setCampaign(found);
        }).catch(() => {});
    }, [vaccineScheduleId]);

    /* load danh sách */
    const load = async () => {
        if (!vaccineScheduleId) return;
        setLoading(true);
        try {
            const res = await CustomerScheduleApi.customerSchedules({
                vaccineScheduleId, fullName, status, page: currentPage, limit: pageSize,
                startDate: from || null, endDate: to || null,
            });
            const data = res.data;
            setItems((data.content || []).map((x, i) => ({
                ...x, stt: (currentPage - 1) * pageSize + i + 1,
            })));
            setTotal(data.totalElements || 0);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); /* eslint-disable-next-line */ }, [vaccineScheduleId, fullName, status, from, to, currentPage, pageSize]);

    /* ── stats nhanh từ data đang hiển thị (chỉ trang hiện tại — TODO: API riêng nếu cần chuẩn) ── */
    const stats = useMemo(() => {
        const total = items.length;
        let paid = 0, injected = 0, cancelled = 0;
        for (const it of items) {
            if (it.payStatus) paid++;
            if (it.status === "injected" || it.status === "finished") injected++;
            if (it.status === "cancelled") cancelled++;
        }
        return { total, paid, injected, cancelled };
    }, [items]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const isAdmin = typeof window !== "undefined" && window.location.pathname.startsWith("/admin/");

    /* ── render ── */
    return (
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "8px 0 40px" }}>

            {/* breadcrumb + back */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                <button onClick={() => nav(-1)} style={{
                    display: "flex", alignItems: "center", gap: 7,
                    padding: "7px 14px", borderRadius: 9,
                    background: "#fff", border: `1.5px solid ${BORDER}`,
                    color: TEXT_2, fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}>
                    <FontAwesomeIcon icon={faArrowLeft} /> Quay lại
                </button>
                <span style={{ color: TEXT_2, fontSize: 13 }}>
                    {isAdmin ? "Quản lý đợt tiêm" : "Quản lý đợt tiêm"} /{" "}
                    <strong style={{ color: TEXT }}>Chi tiết đợt #{vaccineScheduleId || "—"}</strong>
                </span>
            </div>

            {/* hero card — thông tin đợt */}
            <div style={{
                background: `linear-gradient(135deg, ${PRIMARY}, ${ACCENT})`,
                borderRadius: 18, padding: "22px 26px", color: "#fff",
                marginBottom: 20, display: "flex", flexWrap: "wrap", gap: 22, alignItems: "center",
                boxShadow: "0 8px 28px rgba(42,56,143,.25)",
            }}>
                <div style={{
                    width: 56, height: 56, borderRadius: 14,
                    background: "rgba(255,255,255,0.16)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
                }}>
                    <FontAwesomeIcon icon={faSyringe} />
                </div>
                <div style={{ flex: 1, minWidth: 260 }}>
                    <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>
                        Vaccine
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, marginTop: 2 }}>
                        {campaign?.vaccine?.name || "—"}
                    </div>
                    <div style={{ fontSize: 13, opacity: 0.92, marginTop: 4 }}>
                        🏥 {campaign?.center?.centerName || "—"}
                        {campaign?.startDate && (
                            <> · <FontAwesomeIcon icon={faCalendarDays} style={{ marginRight: 4 }} />
                                {dayjs(campaign.startDate).format("DD/MM/YYYY")}
                                {campaign?.endDate && " → " + dayjs(campaign.endDate).format("DD/MM/YYYY")}
                            </>
                        )}
                    </div>
                </div>

                {/* CTA: chuyển sang trang quản lý chính */}
                {isAdmin && (
                    <button
                        onClick={() => nav("/admin/registrations")}
                        style={{
                            background: "rgba(255,255,255,0.92)", color: PRIMARY,
                            border: "none", padding: "10px 18px", borderRadius: 11,
                            fontWeight: 700, fontSize: 13, cursor: "pointer",
                            display: "flex", alignItems: "center", gap: 8,
                            boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
                        }}
                    >
                        <FontAwesomeIcon icon={faExternalLinkAlt} />
                        Quản lý đăng ký
                    </button>
                )}
            </div>

            {/* stats — chỉ tính trên trang hiện tại + total all */}
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 18 }}>
                <StatCard icon={faUsers}          label="Tổng đăng ký (toàn đợt)" value={total}            color={PRIMARY} bg={"#eff6ff"} />
                <StatCard icon={faMoneyBillWave} label="Đã thanh toán (trang)"   value={stats.paid}       color={SUCCESS} bg={"#d1fae5"} />
                <StatCard icon={faSyringe}        label="Đã tiêm (trang)"          value={stats.injected}   color={ACCENT}  bg={"#dbeafe"} />
                <StatCard icon={faBan}            label="Đã hủy (trang)"           value={stats.cancelled}  color={DANGER}  bg={"#fee2e2"} />
            </div>

            {/* filter */}
            <div style={{
                background: "#fff", borderRadius: 14, padding: "14px 18px",
                border: `1px solid ${BORDER}`, marginBottom: 14,
                display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center",
            }}>
                <FontAwesomeIcon icon={faFilter} style={{ color: TEXT_2, fontSize: 12 }} />
                <span style={{ fontSize: 12, color: TEXT_2, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>
                    Bộ lọc
                </span>

                <div style={{
                    flex: "1 1 200px", display: "flex", alignItems: "center", gap: 7,
                    border: `1.5px solid ${BORDER}`, borderRadius: 9, padding: "7px 12px",
                }}>
                    <FontAwesomeIcon icon={faSearch} style={{ color: TEXT_2, fontSize: 12 }} />
                    <input
                        placeholder="Tên khách hàng..."
                        value={fullName}
                        onChange={e => { setFullName(e.target.value); setCurrentPage(1); }}
                        style={{ border: "none", outline: "none", flex: 1, fontSize: 13, color: TEXT, background: "transparent" }}
                    />
                </div>

                <input type="date" value={from} onChange={e => { setFrom(e.target.value); setCurrentPage(1); }}
                    style={{ border: `1.5px solid ${BORDER}`, borderRadius: 9, padding: "7px 10px", fontSize: 13, color: TEXT, outline: "none" }} />
                <span style={{ fontSize: 13, color: TEXT_2 }}>→</span>
                <input type="date" value={to} onChange={e => { setTo(e.target.value); setCurrentPage(1); }}
                    style={{ border: `1.5px solid ${BORDER}`, borderRadius: 9, padding: "7px 10px", fontSize: 13, color: TEXT, outline: "none" }} />

                <select value={status} onChange={e => { setStatus(e.target.value); setCurrentPage(1); }}
                    style={{ border: `1.5px solid ${BORDER}`, borderRadius: 9, padding: "8px 12px", fontSize: 13, color: TEXT, outline: "none", background: "#fff" }}>
                    <option value="">Tất cả trạng thái</option>
                    <option value="pending">Chờ duyệt</option>
                    <option value="confirmed">Đã duyệt</option>
                    <option value="injected">Đã tiêm</option>
                    <option value="finished">Hoàn thành</option>
                    <option value="cancelled">Đã hủy</option>
                </select>

                <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                    style={{ border: `1.5px solid ${BORDER}`, borderRadius: 9, padding: "8px 12px", fontSize: 13, color: TEXT, outline: "none", background: "#fff" }}>
                    {[10, 20, 50, 100].map(s => <option key={s} value={s}>{s} / trang</option>)}
                </select>
            </div>

            {/* table */}
            <div style={{
                background: "#fff", borderRadius: 16, overflow: "hidden",
                border: `1px solid ${BORDER}`, boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
            }}>
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
                        <thead>
                            <tr style={{ background: BG_ROW }}>
                                {["#", "Khách hàng", "Ngày tiêm", "Thanh toán", "Trạng thái", "Bác sĩ", "SK trước tiêm", "SK sau tiêm"].map(h => (
                                    <th key={h} style={{
                                        padding: "12px 14px", textAlign: "left", fontSize: 11.5,
                                        fontWeight: 700, color: TEXT_2, textTransform: "uppercase",
                                        letterSpacing: 0.4, borderBottom: `1px solid ${BORDER}`, whiteSpace: "nowrap",
                                    }}>
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={8} style={{ padding: 52, textAlign: "center", color: TEXT_2 }}>Đang tải...</td></tr>
                            ) : items.length === 0 ? (
                                <tr><td colSpan={8} style={{ padding: 52, textAlign: "center", color: TEXT_2 }}>
                                    <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
                                    Chưa có đăng ký nào trong đợt này
                                </td></tr>
                            ) : items.map(item => (
                                <tr key={item.id} style={{ borderBottom: `1px solid ${BORDER}`, transition: "background 0.15s" }}
                                    onMouseEnter={e => e.currentTarget.style.background = BG_ROW}
                                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                    <td style={{ padding: "12px 14px", color: TEXT_2, fontWeight: 600, fontSize: 13 }}>
                                        {item.stt}
                                    </td>
                                    <td style={{ padding: "12px 14px" }}>
                                        <div style={{ fontWeight: 700, color: TEXT }}>{item.fullName || "—"}</div>
                                        <div style={{ fontSize: 12, color: TEXT_2 }}>{item.phone || ""}</div>
                                    </td>
                                    <td style={{ padding: "12px 14px", color: TEXT_2, fontSize: 13, whiteSpace: "nowrap" }}>
                                        {item.vaccineScheduleTime?.injectDate
                                            ? dayjs(item.vaccineScheduleTime.injectDate).format("DD/MM/YYYY")
                                            : "—"}
                                    </td>
                                    <td style={{ padding: "12px 14px" }}>
                                        <PayBadge paid={!!item.payStatus} />
                                    </td>
                                    <td style={{ padding: "12px 14px" }}>
                                        <StatusBadge status={item.status} />
                                    </td>
                                    <td style={{ padding: "12px 14px", fontSize: 13, color: TEXT }}>
                                        {item.doctor?.fullName
                                            ? <span style={{ color: TEXT }}>{item.doctor.fullName}</span>
                                            : <span style={{ color: "#bbb" }}>Chưa gán</span>}
                                    </td>
                                    <td style={{ padding: "12px 14px", minWidth: 160 }}>
                                        {renderHealthCell(item.healthStatusBefore)}
                                    </td>
                                    <td style={{ padding: "12px 14px", minWidth: 160 }}>
                                        {renderHealthCell(item.healthStatusAfter)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* pagination */}
                {total > 0 && (
                    <div style={{
                        padding: "14px 18px", borderTop: `1px solid ${BORDER}`,
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        flexWrap: "wrap", gap: 12,
                    }}>
                        <span style={{ fontSize: 13, color: TEXT_2 }}>
                            Trang {currentPage} / {totalPages} · Tổng {total} đăng ký
                        </span>
                        <div style={{ display: "flex", gap: 6 }}>
                            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}
                                style={pgBtnStyle(currentPage === 1, false)}>← Trước</button>
                            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                                const page = totalPages <= 7
                                    ? i + 1
                                    : currentPage <= 4
                                        ? i + 1
                                        : currentPage >= totalPages - 3
                                            ? totalPages - 6 + i
                                            : currentPage - 3 + i;
                                return <button key={page} onClick={() => setCurrentPage(page)}
                                    style={pgBtnStyle(false, currentPage === page)}>{page}</button>;
                            })}
                            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}
                                style={pgBtnStyle(currentPage === totalPages, false)}>Sau →</button>
                        </div>
                    </div>
                )}
            </div>

            {/* hint */}
        </div>
    );
};

/* ─── pagination button style helper ─── */
function pgBtnStyle(disabled, active) {
    return {
        minWidth: 34, height: 34, padding: "0 10px", borderRadius: 8,
        border: `1.5px solid ${active ? PRIMARY : BORDER}`,
        background: active
            ? `linear-gradient(135deg, ${PRIMARY}, ${ACCENT})`
            : disabled ? "#f1f5f9" : "#fff",
        color: active ? "#fff" : disabled ? "#cbd5e1" : TEXT_2,
        fontSize: 13, fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.15s",
    };
}
