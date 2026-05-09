import React, { useEffect, useState } from "react";
import {
  Button, Input, Modal, Pagination, Popconfirm, Select, Table, Tag, Form,
} from "antd";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSyringe } from "@fortawesome/free-solid-svg-icons";
import dayjs from "dayjs";
import { AppNotification } from "../../components/AppNotification";
import { postMethodPayload } from "../../services/request";

const { TextArea } = Input;

const statusColorMap = {
  confirmed: "green", pending: "gold", cancelled: "red",
  injected: "blue", finished: "cyan", not_injected: "orange",
};
const statusLabelMap = {
  confirmed: "Đã duyệt", pending: "Chờ duyệt", cancelled: "Đã từ chối",
  injected: "Đã tiêm", finished: "Hoàn thành", not_injected: "Chưa tiêm",
};

const NursePatients = () => {
  const [patients, setPatients] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [searchName, setSearchName] = useState("");

  // modal cập nhật tình trạng SK sau tiêm
  const [editModal, setEditModal] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [healthAfter, setHealthAfter] = useState("");
  const [saving, setSaving] = useState(false);

  const loadPatients = async (page = 1) => {
    setLoading(true);
    try {
      const res = await postMethodPayload("/api/customer-schedule/nurse/my-patients", {
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
    } catch {
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
    setHealthAfter(record.healthStatusAfter || "");
    setEditModal(true);
  };

  const handleSaveAfter = async () => {
    if (!editRecord) return;
    setSaving(true);
    try {
      const res = await postMethodPayload("/api/customer-schedule/customer/update-customer-schedule", {
        id: editRecord.id,
        healthStatusAfter: healthAfter,
      });
      if (res.ok) {
        AppNotification.success("Cập nhật tình trạng SK sau tiêm thành công");
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

  const handleConfirmInjected = async (id) => {
    try {
      const res = await postMethodPayload("/api/customer-schedule/customer/approve", {
        customerScheduleId: id,
        status: "injected",
      });
      if (res.ok) {
        AppNotification.success("Xác nhận đã tiêm thành công");
        loadPatients(currentPage);
      } else {
        const data = await res.json();
        AppNotification.error(data.defaultMessage || "Xác nhận thất bại");
      }
    } catch {
      AppNotification.error("Lỗi kết nối");
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
      render: (_, record) => (
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          {record.status !== "cancelled" && record.status !== "injected" && (
            <Button size="small" onClick={() => openEdit(record)}>
              Cập nhật SK sau tiêm
            </Button>
          )}
          {record.status === "confirmed" && (
            <Popconfirm
              title="Xác nhận khách đã tiêm xong?"
              onConfirm={() => handleConfirmInjected(record.id)}
              okText="Có"
              cancelText="Không"
            >
              <Button type="primary" size="small" style={{ backgroundColor: "#1677ff" }}>
                <FontAwesomeIcon icon={faSyringe} /> Đã tiêm
              </Button>
            </Popconfirm>
          )}
        </div>
      ),
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
        title="Cập nhật tình trạng sức khỏe sau tiêm"
        open={editModal}
        onCancel={() => setEditModal(false)}
        footer={[
          <Button key="cancel" onClick={() => setEditModal(false)}>Hủy</Button>,
          <Button key="save" type="primary" loading={saving} onClick={handleSaveAfter}>Lưu</Button>,
        ]}
      >
        <Form layout="vertical">
          <Form.Item label="Tình trạng sức khỏe sau tiêm">
            <TextArea
              rows={4}
              value={healthAfter}
              onChange={(e) => setHealthAfter(e.target.value)}
              placeholder="Nhập tình trạng sức khỏe sau khi tiêm..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </React.Fragment>
  );
};

export default NursePatients;
