import React, { useEffect, useState } from "react";
import {
  Button, Input, Modal, Pagination, Select, Table, Tag, Form, Input as AntInput,
} from "antd";
import dayjs from "dayjs";
import { AppNotification } from "../../components/AppNotification";
import { postMethodPayload } from "../../services/request";

const { Option } = Select;
const { TextArea } = AntInput;

const statusColorMap = {
  confirmed: "green", pending: "gold", cancelled: "red",
  injected: "blue", finished: "cyan", not_injected: "orange",
};
const statusLabelMap = {
  confirmed: "Đã duyệt", pending: "Chờ duyệt", cancelled: "Đã từ chối",
  injected: "Đã tiêm", finished: "Hoàn thành", not_injected: "Chưa tiêm",
};

const DoctorPatients = () => {
  const [patients, setPatients] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [searchName, setSearchName] = useState("");

  // modal cập nhật tình trạng SK trước tiêm
  const [editModal, setEditModal] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [healthBefore, setHealthBefore] = useState("");
  const [saving, setSaving] = useState(false);

  const loadPatients = async (page = 1) => {
    setLoading(true);
    try {
      const res = await postMethodPayload("/api/customer-schedule/doctor/my-patients", {
        page,
        limit: pageSize,
        fullName: searchName,
      });
      const data = await res.json();
      if (res.ok) {
        setPatients(
          (data.content || []).map((item, idx) => ({
            ...item,
            stt: (page - 1) * pageSize + idx + 1,
          }))
        );
        setTotal(data.totalElements || 0);
        setCurrentPage(page);
      } else {
        AppNotification.error(data.defaultMessage || "Không tải được danh sách");
      }
    } catch (e) {
      AppNotification.error("Lỗi kết nối máy chủ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchName]);

  const openEdit = (record) => {
    setEditRecord(record);
    setHealthBefore(record.healthStatusBefore || "");
    setEditModal(true);
  };

  const handleSave = async () => {
    if (!editRecord) return;
    setSaving(true);
    try {
      const res = await postMethodPayload("/api/customer-schedule/customer/update-customer-schedule", {
        id: editRecord.id,
        healthStatusBefore: healthBefore,
      });
      if (res.ok) {
        AppNotification.success("Cập nhật tình trạng SK trước tiêm thành công");
        setEditModal(false);
        loadPatients(currentPage);
      } else {
        const data = await res.json();
        AppNotification.error(data.defaultMessage || "Cập nhật thất bại");
      }
    } catch {
      AppNotification.error("Lỗi kết nối");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { title: "STT", dataIndex: "stt", key: "stt", width: 60 },
    {
      title: "Vaccine",
      key: "vaccine",
      render: (_, r) => r.vaccineScheduleTime?.vaccineSchedule?.vaccine?.name || "—",
    },
    { title: "Tên bệnh nhân", dataIndex: "fullName", key: "fullName" },
    {
      title: "Ngày tiêm",
      key: "injectDate",
      render: (_, r) =>
        r.vaccineScheduleTime?.injectDate
          ? dayjs(r.vaccineScheduleTime.injectDate).format("DD/MM/YYYY")
          : "—",
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      align: "center",
      render: (text) => (
        <Tag color={statusColorMap[text] || "default"}>{statusLabelMap[text] || text}</Tag>
      ),
    },
    {
      title: "SK trước tiêm",
      dataIndex: "healthStatusBefore",
      key: "healthStatusBefore",
      render: (text) => text || <span style={{ color: "#bbb" }}>Chưa có</span>,
    },
    {
      title: "SK sau tiêm",
      dataIndex: "healthStatusAfter",
      key: "healthStatusAfter",
      render: (text) => text || <span style={{ color: "#bbb" }}>Chưa có</span>,
    },
    {
      title: "Hành động",
      key: "action",
      align: "center",
      render: (_, record) =>
        record.status !== "cancelled" && record.status !== "injected" ? (
          <Button type="primary" size="small" onClick={() => openEdit(record)}>
            Cập nhật SK trước tiêm
          </Button>
        ) : null,
    },
  ];

  return (
    <React.Fragment>
      <h3>Bệnh nhân được phân công</h3>
      <div style={{ marginBottom: 16 }}>
        <Input
          style={{ width: 260 }}
          placeholder="Tìm theo tên bệnh nhân"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          allowClear
        />
      </div>

      <Table
        columns={columns}
        dataSource={patients}
        rowKey="id"
        pagination={false}
        loading={loading}
      />

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
        <Pagination
          current={currentPage}
          pageSize={pageSize}
          total={total}
          onChange={(page) => loadPatients(page)}
        />
      </div>

      <Modal
        title="Cập nhật tình trạng sức khỏe trước tiêm"
        open={editModal}
        onCancel={() => setEditModal(false)}
        footer={[
          <Button key="cancel" onClick={() => setEditModal(false)}>Hủy</Button>,
          <Button key="save" type="primary" loading={saving} onClick={handleSave}>Lưu</Button>,
        ]}
      >
        <Form layout="vertical">
          <Form.Item label="Tình trạng sức khỏe trước tiêm">
            <TextArea
              rows={4}
              value={healthBefore}
              onChange={(e) => setHealthBefore(e.target.value)}
              placeholder="Nhập tình trạng sức khỏe trước khi tiêm..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </React.Fragment>
  );
};

export default DoctorPatients;
