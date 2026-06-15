import React, { useEffect, useState } from "react";
import { Table, Button, Modal, Pagination, Popconfirm, InputNumber, Select } from "antd";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faRemove, faBoxOpen, faDownload, faWarehouse, faFilter } from "@fortawesome/free-solid-svg-icons";
import dayjs from "dayjs";
import { AppNotification } from "../../../components/AppNotification";
import * as XLSX from "xlsx";
import { VaccineInventoryApi } from "../../../services/staff/VaccineInventory.api";
import { VaccineApi, axios } from "../../../services/staff/Vaccine.api";

/* ── palette ─────────────────────────────────── */
const PRIMARY = "#2A388F";
const ACCENT  = "#0ea5e9";
const SUCCESS = "#10b981";
const DANGER  = "#ef4444";
const BORDER  = "#e2e8f0";
const TEXT    = "#1e293b";
const TEXT_2  = "#64748b";

/* ── helpers ─────────────────────────────────── */
function FieldLabel({ children, required }) {
  return (
    <div style={{ fontSize: "12px", fontWeight: "700", color: TEXT_2, marginBottom: "6px",
      letterSpacing: "0.4px", textTransform: "uppercase" }}>
      {children}{required && <span style={{ color: DANGER, marginLeft: "3px" }}>*</span>}
    </div>
  );
}
function ErrorMsg({ msg }) {
  if (!msg) return null;
  return <div style={{ color: DANGER, fontSize: "12px", marginTop: "4px" }}>⚠ {msg}</div>;
}

/* ══════════════════════════════════════════════ */
const VaccineInventory = () => {

  /* ── list state ── */
  const [inventoryList, setInventoryList]     = useState([]);
  const [loading, setLoading]                 = useState(false);
  const [total, setTotal]                     = useState(0);
  const [currentPage, setCurrentPage]         = useState(1);
  const [pageSize, setPageSize]               = useState(10);
  const [filterCenterId, setFilterCenterId]   = useState(null);
  const [filterVaccineId, setFilterVaccineId] = useState(null);
  const [filterImportDate, setFilterImportDate] = useState("");

  /* ── centers ── */
  const [centers, setCenters]                 = useState([]);

  /* ── nhập kho modal ── */
  const [nhapModal, setNhapModal]             = useState(false);
  const [vaccineOptions, setVaccineOptions]   = useState([]);
  const [loadingVaccines, setLoadingVaccines] = useState(false);
  const [saving, setSaving]                   = useState(false);
  const [form, setForm]                       = useState({ vaccineId: null, centerId: null, quantity: null, expirationDate: "" });
  const [errors, setErrors]                   = useState({});

  /* ── xuất kho modal ── */
  const [xuatModal, setXuatModal]             = useState({ open: false, name: "", centerId: null, inventoryId: null });
  const [xuatQty, setXuatQty]                 = useState(null);
  const [xuatError, setXuatError]             = useState("");
  const [xuatSaving, setXuatSaving]           = useState(false);

  /* ── fetch centers and vaccines (once) ── */
  useEffect(() => {
    axios.get("/api/center/public/find-all")
      .then(res => setCenters(res.data || []))
      .catch(console.error);

    VaccineApi.vaccines({ page: 1, limit: 999 })
      .then(res => setVaccineOptions(res.data.content || []))
      .catch(console.error);
  }, []);

  /* ── fetch inventory ── */
  useEffect(() => {
    fetchInventory({
      page: currentPage,
      limit: pageSize,
      centerId: filterCenterId,
      vaccineId: filterVaccineId,
      importDate: filterImportDate
    });
  }, [currentPage, pageSize, filterCenterId, filterVaccineId, filterImportDate]); // eslint-disable-line

  const fetchInventory = async (params) => {
    setLoading(true);
    try {
      const res  = await VaccineInventoryApi.vaccineInventorys(params);
      const data = res.data;
      setTotal(data.totalElements);
      setInventoryList(
        data.content.map((item, i) => ({
          ...item,
          stt: (params.page - 1) * params.limit + i + 1,
        }))
      );
    } catch (err) { console.error(err); }
    finally { setTimeout(() => setLoading(false), 300); }
  };

  /* ── fetch vaccines for dropdown ── */
  const fetchVaccines = async () => {
    setLoadingVaccines(true);
    try {
      const res = await VaccineApi.vaccines({ page: 1, limit: 999 });
      setVaccineOptions(res.data.content || []);
    } catch (err) { console.error(err); }
    finally { setLoadingVaccines(false); }
  };

  /* ── open nhập kho modal ── */
  const openNhapModal = () => {
    setForm({ vaccineId: null, centerId: null, quantity: null, expirationDate: "" });
    setErrors({});
    fetchVaccines();
    setNhapModal(true);
  };

  /* ── validate ── */
  const validate = () => {
    const e = {};
    if (!form.vaccineId)                      e.vaccineId      = "Vui lòng chọn vaccine";
    if (!form.centerId)                        e.centerId       = "Vui lòng chọn trung tâm";
    if (!form.quantity || form.quantity < 1)   e.quantity       = "Số lượng phải lớn hơn 0";
    if (form.quantity > 100000)                e.quantity       = "Số lượng không vượt quá 100.000";
    if (!form.expirationDate)                  e.expirationDate = "Vui lòng chọn ngày hết hạn";
    else if (dayjs(form.expirationDate).isBefore(dayjs(), "day"))
                                               e.expirationDate = "Ngày hết hạn phải sau hôm nay";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ── submit nhập kho ── */
  const handleNhapKho = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await VaccineInventoryApi.createVaccineInventory({
        vaccineId:      form.vaccineId,
        centerId:       form.centerId,
        quantity:       form.quantity,
        expirationDate: form.expirationDate,
      });
      AppNotification.success("Nhập kho thành công!");
      setNhapModal(false);
      fetchInventory({ page: currentPage, limit: pageSize, centerId: filterCenterId });
    } catch (err) {
      AppNotification.error(err?.response?.data?.defaultMessage || "Nhập kho thất bại");
    } finally { setSaving(false); }
  };

  /* ── xuất kho ── */
  const handleXuatKho = async () => {
    if (!xuatQty || xuatQty < 1) { setXuatError("Số lượng phải lớn hơn 0"); return; }
    setXuatError("");
    setXuatSaving(true);
    try {
      await VaccineApi.plusVaccine({ name: xuatModal.name, quantity: xuatQty, centerId: xuatModal.centerId });
      AppNotification.success("Xuất kho thành công!");
      setXuatModal({ open: false, name: "", centerId: null, inventoryId: null });
      setXuatQty(null);
      fetchInventory({ page: currentPage, limit: pageSize, centerId: filterCenterId });
    } catch (err) {
      AppNotification.error(err?.response?.data?.defaultMessage || "Xuất kho thất bại");
    } finally { setXuatSaving(false); }
  };

  /* ── delete ── */
  const handleDelete = async (id) => {
    try {
      await VaccineInventoryApi.deleteVaccineInventory({ id });
      AppNotification.success("Xóa thành công");
      fetchInventory({ page: currentPage, limit: pageSize, centerId: filterCenterId });
    } catch (err) {
      AppNotification.error(err?.response?.data?.defaultMessage || "Xóa thất bại");
    }
  };

  /* ── export excel ── */
  const handleExport = () => {
    try {
      const rows = inventoryList.map((item, i) => ({
        STT:                    i + 1,
        "Tên Vaccine":          item?.vaccine?.nameVaccine || item?.vaccine?.name,
        "Trung tâm":            item?.center?.centerName || "—",
        "Tồn kho vật lý":      item?.quantity,
        "Sẵn sàng lên lịch":   item?.exportedQuantity ?? 0,
        "Ngày nhập":            item?.createdDate ? dayjs(item.createdDate).format("DD/MM/YYYY") : "",
        "Ngày hết hạn":         item?.expirationDate ? dayjs(item.expirationDate).format("DD/MM/YYYY") : "",
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "KhoVaccine");
      XLSX.writeFile(wb, "kho_vaccine.xlsx");
      AppNotification.success("Xuất file thành công");
    } catch { AppNotification.error("Xuất file thất bại"); }
  };

  /* ── today for date min ── */
  const todayStr = dayjs().add(1, "day").format("YYYY-MM-DD");

  /* ── table columns ── */
  const columns = [
    {
      title: "#", dataIndex: "stt", key: "stt", width: 55,
      render: (v) => <span style={{ color: TEXT_2, fontWeight: 600 }}>{v}</span>,
    },
    {
      title: "Vaccine", key: "vaccine",
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 700, color: TEXT }}>{r?.vaccine?.nameVaccine || r?.vaccine?.name}</div>
          <div style={{ fontSize: 12, color: TEXT_2, marginTop: 2 }}>{r?.vaccine?.vaccineType?.typeName}</div>
        </div>
      ),
    },
    {
      title: "Trung tâm", key: "center",
      render: (_, r) => r?.center ? (
        <div>
          <div style={{ fontWeight: 600, color: PRIMARY }}>{r.center.centerName}</div>
          <div style={{ fontSize: 12, color: TEXT_2, marginTop: 2 }}>
            📍 {[r.center.street, r.center.ward, r.center.district].filter(Boolean).join(", ")}
          </div>
        </div>
      ) : <span style={{ color: TEXT_2 }}>—</span>,
    },
    {
      title: "Tổng nhập lúc đầu", key: "totalImported", align: "center",
      render: (_, r) => {
        const qty = r?.quantity ?? 0;
        const exp = r?.exportedQuantity ?? 0;
        return (
          <div>
            <span style={{ fontWeight: 700, fontSize: 15, color: TEXT }}>{qty + exp}</span>
            <div style={{ fontSize: 11, color: TEXT_2, marginTop: 2 }}>nhập kho</div>
          </div>
        );
      }
    },
    {
      title: "Tồn kho vật lý", dataIndex: "quantity", key: "quantity", align: "center",
      sorter: (a, b) => a.quantity - b.quantity,
      render: (qty) => {
        const color = qty <= 10 ? DANGER : qty <= 50 ? "#f59e0b" : SUCCESS;
        return (
          <div>
            <span style={{ fontWeight: 800, fontSize: 15, color }}>{qty}</span>
            <div style={{ fontSize: 11, color: TEXT_2, marginTop: 2 }}>trong kho</div>
          </div>
        );
      },
    },
    {
      title: "Sẵn sàng lên lịch", key: "readyToSchedule", align: "center",
      sorter: (a, b) => (a?.exportedQuantity ?? 0) - (b?.exportedQuantity ?? 0),
      render: (_, r) => {
        const qty   = r?.exportedQuantity ?? 0;
        const color = qty === 0 ? DANGER : qty <= 20 ? "#f59e0b" : SUCCESS;
        return (
          <div>
            <span style={{ fontWeight: 800, fontSize: 15, color }}>{qty}</span>
            <div style={{ fontSize: 11, color: TEXT_2, marginTop: 2 }}>đã xuất kho</div>
            {qty === 0 && (
              <div style={{
                marginTop: 4, fontSize: 11, color: "#fff",
                background: DANGER, borderRadius: 4, padding: "1px 6px", display: "inline-block",
              }}>Chưa xuất</div>
            )}
          </div>
        );
      },
    },
    {
      title: "Ngày nhập", dataIndex: "createdDate", key: "createdDate", align: "center",
      render: (d) => <span style={{ color: TEXT_2 }}>{d ? dayjs(d).format("DD/MM/YYYY") : "—"}</span>,
    },
    {
      title: "Ngày hết hạn", dataIndex: "expirationDate", key: "expirationDate", align: "center",
      render: (d) => {
        if (!d) return <span style={{ color: TEXT_2 }}>—</span>;
        const expired = dayjs(d).isBefore(dayjs(), "day");
        const soon    = !expired && dayjs(d).diff(dayjs(), "day") <= 30;
        return (
          <span style={{ fontWeight: 600, color: expired ? DANGER : soon ? "#f59e0b" : SUCCESS }}>
            {expired && "⚠ "}{soon && !expired && "⏰ "}{dayjs(d).format("DD/MM/YYYY")}
          </span>
        );
      },
    },
    {
      title: "Hành động", key: "action", align: "center", width: 180,
      render: (_, record) => {
        const expired = record.expirationDate ? dayjs(record.expirationDate).isBefore(dayjs(), "day") : false;
        return (
          <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
            <Button
              title={expired ? "Lô vaccine đã hết hạn" : "Xuất kho"}
              disabled={expired}
              style={{
                borderColor: expired ? BORDER : SUCCESS,
                color: expired ? TEXT_2 : SUCCESS,
                fontWeight: 600,
                cursor: expired ? "not-allowed" : "pointer"
              }}
              onClick={() => {
                setXuatQty(null); setXuatError("");
                setXuatModal({
                  open: true,
                  name: record.vaccine?.nameVaccine || record.vaccine?.name,
                  centerId: record.center?.id || null,
                  inventoryId: record.id,
                });
              }}
            >
              <FontAwesomeIcon icon={faPlus} style={{ marginRight: 5 }} />Xuất
            </Button>
            <Popconfirm
              title="Xóa lô vaccine này?" description="Hành động này không thể hoàn tác."
              onConfirm={() => handleDelete(record.id)} okText="Xóa" cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Button danger title="Xóa"><FontAwesomeIcon icon={faRemove} /></Button>
            </Popconfirm>
          </div>
        );
      }
    },
  ];

  return (
    <React.Fragment>

      {/* ── Header bar ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10,
            background: `linear-gradient(135deg, ${PRIMARY}, ${ACCENT})`,
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            <FontAwesomeIcon icon={faWarehouse} style={{ color: "#fff", fontSize: 16 }} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: TEXT }}>Kho Vaccine</h3>
            <div style={{ fontSize: 12, color: TEXT_2 }}>Quản lý tồn kho theo từng trung tâm</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handleExport} style={{
            display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 9,
            cursor: "pointer", fontSize: 13.5, fontWeight: 600,
            background: "transparent", border: `1.5px solid ${BORDER}`, color: TEXT_2,
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.color = ACCENT; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = TEXT_2; }}
          >
            <FontAwesomeIcon icon={faDownload} /> Xuất Excel
          </button>
          <button onClick={openNhapModal} style={{
            display: "flex", alignItems: "center", gap: 7, padding: "9px 20px", borderRadius: 9,
            cursor: "pointer", fontSize: 13.5, fontWeight: 700, border: "none", color: "#fff",
            background: `linear-gradient(135deg, ${PRIMARY}, ${ACCENT})`,
            boxShadow: `0 4px 14px rgba(42,56,143,0.35)`,
          }}>
            <FontAwesomeIcon icon={faBoxOpen} /> Nhập kho
          </button>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div style={{ background: "#fff", borderRadius: 12, padding: "14px 18px", marginBottom: 16,
        border: `1px solid ${BORDER}`, boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
        display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FontAwesomeIcon icon={faFilter} style={{ color: TEXT_2, fontSize: 13 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: TEXT_2, textTransform: "uppercase",
            letterSpacing: "0.4px" }}>Bộ lọc:</span>
        </div>

        {/* center filter */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13, color: TEXT_2, whiteSpace: "nowrap" }}>Trung tâm:</span>
          <Select
            allowClear
            placeholder="Tất cả trung tâm"
            value={filterCenterId}
            onChange={(val) => { setFilterCenterId(val || null); setCurrentPage(1); }}
            style={{ width: 200 }}
            options={centers.map(c => ({ value: c.id, label: c.centerName }))}
          />
        </div>

        {/* vaccine filter */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13, color: TEXT_2, whiteSpace: "nowrap" }}>Vaccine:</span>
          <Select
            allowClear
            showSearch
            placeholder="Tất cả vaccine"
            value={filterVaccineId}
            onChange={(val) => { setFilterVaccineId(val || null); setCurrentPage(1); }}
            optionFilterProp="label"
            style={{ width: 220 }}
            options={vaccineOptions.map(v => ({ value: v.id, label: v.nameVaccine || v.name }))}
          />
        </div>

        {/* import date filter */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13, color: TEXT_2, whiteSpace: "nowrap" }}>Ngày nhập:</span>
          <input
            type="date"
            value={filterImportDate}
            onChange={(e) => { setFilterImportDate(e.target.value || ""); setCurrentPage(1); }}
            style={{
              height: 32, padding: "0 10px", borderRadius: 6, border: `1.5px solid ${BORDER}`,
              fontSize: 13, color: TEXT, outline: "none", background: "#fff"
            }}
          />
        </div>

        {(filterCenterId || filterVaccineId || filterImportDate) && (
          <button onClick={() => { setFilterCenterId(null); setFilterVaccineId(null); setFilterImportDate(""); setCurrentPage(1); }} style={{
            padding: "5px 14px", borderRadius: 8, border: `1px solid ${BORDER}`,
            background: "#fff", color: TEXT_2, fontSize: 13, cursor: "pointer",
          }}>
            ✕ Xóa bộ lọc
          </button>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: 10, flexWrap: "wrap" }}>
          <StatChip label="Tổng lô" value={total} color={PRIMARY} />
          <StatChip label="Tồn kho thấp (≤10)" value={inventoryList.filter(i => i.quantity <= 10).length} color={DANGER} />
          <StatChip label="Sắp hết hạn (≤30 ngày)" value={inventoryList.filter(i => {
            if (!i.expirationDate) return false;
            const d = dayjs(i.expirationDate).diff(dayjs(), "day");
            return d >= 0 && d <= 30;
          }).length} color="#f59e0b" />
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden",
        border: `1px solid ${BORDER}`, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
        <Table
          columns={columns} dataSource={inventoryList} rowKey="id"
          pagination={false} loading={loading} style={{ fontSize: 13.5 }}
        />
      </div>

      {/* ── Pagination ── */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20, marginBottom: 30 }}>
        <Pagination
          current={currentPage} pageSize={pageSize} total={total}
          showSizeChanger showTotal={(t) => `Tổng ${t} lô`}
          onChange={(p, s) => { setCurrentPage(p); setPageSize(s); }}
        />
      </div>

      {/* ══ Modal NHẬP KHO ══ */}
      <Modal open={nhapModal} onCancel={() => setNhapModal(false)}
        footer={null} width={540} destroyOnClose centered styles={{ body: { padding: 0 } }}>

        {/* header */}
        <div style={{ background: `linear-gradient(135deg, ${PRIMARY}, ${ACCENT})`,
          padding: "18px 24px", borderRadius: "8px 8px 0 0",
          display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: "rgba(255,255,255,0.18)",
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            <FontAwesomeIcon icon={faBoxOpen} style={{ color: "#fff", fontSize: 16 }} />
          </div>
          <div>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>Nhập kho vaccine</div>
            <div style={{ color: "rgba(255,255,255,0.72)", fontSize: 12 }}>Thêm lô vaccine mới vào kho của trung tâm</div>
          </div>
        </div>

        {/* body */}
        <div style={{ padding: "24px 28px" }}>

          {/* Vaccine */}
          <div style={{ marginBottom: 16 }}>
            <FieldLabel required>Vaccine</FieldLabel>
            <Select
              showSearch placeholder="Tìm và chọn vaccine..."
              loading={loadingVaccines}
              value={form.vaccineId}
              onChange={(val) => { setForm(f => ({ ...f, vaccineId: val })); setErrors(e => ({ ...e, vaccineId: "" })); }}
              optionFilterProp="label"
              style={{ width: "100%" }}
              options={vaccineOptions.map(v => ({ value: v.id, label: v.nameVaccine || v.name }))}
              notFoundContent={loadingVaccines ? "Đang tải..." : "Không có vaccine"}
            />
            <ErrorMsg msg={errors.vaccineId} />
          </div>

          {/* Trung tâm */}
          <div style={{ marginBottom: 16 }}>
            <FieldLabel required>Trung tâm</FieldLabel>
            <Select
              showSearch placeholder="Chọn trung tâm..."
              value={form.centerId}
              onChange={(val) => { setForm(f => ({ ...f, centerId: val })); setErrors(e => ({ ...e, centerId: "" })); }}
              optionFilterProp="label"
              style={{ width: "100%" }}
              options={centers.map(c => ({ value: c.id, label: c.centerName }))}
              notFoundContent="Không có trung tâm"
            />
            <ErrorMsg msg={errors.centerId} />
          </div>

          {/* Số lượng + Ngày hết hạn */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 4 }}>
            <div>
              <FieldLabel required>Số lượng nhập</FieldLabel>
              <InputNumber
                min={1} max={100000} placeholder="VD: 100"
                value={form.quantity}
                onChange={(val) => { setForm(f => ({ ...f, quantity: val })); setErrors(e => ({ ...e, quantity: "" })); }}
                style={{ width: "100%", borderRadius: 9, height: 40 }}
              />
              <ErrorMsg msg={errors.quantity} />
            </div>
            <div>
              <FieldLabel required>Ngày hết hạn</FieldLabel>
              <input
                type="date" min={todayStr} value={form.expirationDate}
                onChange={(e) => { setForm(f => ({ ...f, expirationDate: e.target.value })); setErrors(er => ({ ...er, expirationDate: "" })); }}
                style={{
                  width: "100%", height: 40, padding: "0 12px", boxSizing: "border-box",
                  borderRadius: 9, border: `1.5px solid ${errors.expirationDate ? DANGER : BORDER}`,
                  fontSize: 13.5, color: TEXT, background: "#f8fafc", fontFamily: "inherit", outline: "none",
                }}
                onFocus={e => e.target.style.borderColor = ACCENT}
                onBlur={e  => e.target.style.borderColor = errors.expirationDate ? DANGER : BORDER}
              />
              <ErrorMsg msg={errors.expirationDate} />
            </div>
          </div>

          {/* Note */}
          <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: 9,
            background: "rgba(14,165,233,0.06)", border: "1px solid rgba(14,165,233,0.2)",
            fontSize: 12.5, color: "#0369a1", lineHeight: 1.6 }}>
            💡 Nếu trung tâm đã có lô vaccine này, số lượng sẽ được <strong>cộng thêm</strong> vào tồn kho hiện tại.
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
            <button onClick={() => setNhapModal(false)} style={{
              padding: "9px 20px", borderRadius: 9, border: `1.5px solid ${BORDER}`,
              background: "#fff", color: TEXT_2, fontSize: 13.5, fontWeight: 600, cursor: "pointer",
            }}>Hủy</button>
            <button onClick={handleNhapKho} disabled={saving} style={{
              padding: "9px 24px", borderRadius: 9, border: "none", color: "#fff",
              background: saving ? "#94a3b8" : `linear-gradient(135deg, ${PRIMARY}, ${ACCENT})`,
              fontSize: 13.5, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
              boxShadow: saving ? "none" : `0 4px 14px rgba(42,56,143,0.3)`,
            }}>
              {saving ? "Đang lưu..." : "✓ Xác nhận nhập kho"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ══ Modal XUẤT KHO ══ */}
      <Modal open={xuatModal.open} onCancel={() => setXuatModal({ open: false, name: "", centerId: null, inventoryId: null })}
        footer={null} width={420} destroyOnClose centered styles={{ body: { padding: 0 } }}>

        <div style={{ background: `linear-gradient(135deg, #065f46, ${SUCCESS})`,
          padding: "18px 24px", borderRadius: "8px 8px 0 0",
          display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: "rgba(255,255,255,0.18)",
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            <FontAwesomeIcon icon={faPlus} style={{ color: "#fff", fontSize: 16 }} />
          </div>
          <div>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>Xuất kho vaccine</div>
            <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 12 }}>{xuatModal.name}</div>
            {xuatModal.centerId && (
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, marginTop: 2 }}>
                📍 {centers.find(c => c.id === xuatModal.centerId)?.centerName || ""}
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: "24px 28px" }}>
          <div style={{ marginBottom: 18 }}>
            <FieldLabel required>Số lượng xuất</FieldLabel>
            <InputNumber
              min={1} placeholder="Nhập số lượng cần xuất..."
              value={xuatQty}
              onChange={(val) => { setXuatQty(val); setXuatError(""); }}
              style={{ width: "100%", borderRadius: 9, height: 40 }}
            />
            <ErrorMsg msg={xuatError} />
          </div>
          <div style={{ padding: "10px 14px", borderRadius: 9, marginBottom: 20,
            background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)",
            fontSize: 12.5, color: "#065f46" }}>
            📦 Số lượng xuất sẽ được trừ trực tiếp khỏi tồn kho hiện tại.
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button onClick={() => setXuatModal({ open: false, name: "", centerId: null, inventoryId: null })} style={{
              padding: "9px 20px", borderRadius: 9, border: `1.5px solid ${BORDER}`,
              background: "#fff", color: TEXT_2, fontSize: 13.5, fontWeight: 600, cursor: "pointer",
            }}>Hủy</button>
            <button onClick={handleXuatKho} disabled={xuatSaving} style={{
              padding: "9px 24px", borderRadius: 9, border: "none", color: "#fff",
              background: xuatSaving ? "#94a3b8" : `linear-gradient(135deg, #065f46, ${SUCCESS})`,
              fontSize: 13.5, fontWeight: 700, cursor: xuatSaving ? "not-allowed" : "pointer",
            }}>
              {xuatSaving ? "Đang xử lý..." : "✓ Xác nhận xuất kho"}
            </button>
          </div>
        </div>
      </Modal>

    </React.Fragment>
  );
};

/* ── StatChip ─────────────────────────────────── */
function StatChip({ label, value, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 14px",
      background: "#f8fafc", borderRadius: 8, border: `1px solid ${BORDER}` }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 13, fontWeight: 700, color }}>{value}</span>
      <span style={{ fontSize: 12, color: TEXT_2 }}>{label}</span>
    </div>
  );
}

export default VaccineInventory;
