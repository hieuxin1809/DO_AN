import React, {useEffect, useRef, useState} from "react";
import {Button, Form, Input, Modal, Pagination, Popconfirm, Select, Table, Tag,} from "antd";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faCheck, faRemove, faSyringe, faUserPlus} from "@fortawesome/free-solid-svg-icons";
import dayjs from "dayjs";
import {AppNotification} from "../../../components/AppNotification";
import {CustomerScheduleApi} from "../../../services/staff/CustomerSchedule.api";
import {VaccineScheduleApi} from "../../../services/staff/VaccineSchedule.api";
import { getMethod, postMethodPayload } from "../../../services/request";

const { Option } = Select;

const CustomerSchedule = () => {
  const [modalHandle, setModalHandle] = useState(false);
  const [formHandle, setFormHandle] = useState({});
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [customerSchedules, setCustomerSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [formSearch, setFormSearch] = useState({
    fullName: "",
    status: "",
    page: 1,
    limit: 10,
  });

  // States cho phân công bác sĩ / y tá
  const [assignModal, setAssignModal] = useState(false);
  const [assignRecord, setAssignRecord] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [nurses, setNurses] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState(null);
  const [selectedNurseId, setSelectedNurseId] = useState(null);
  const [assignLoading, setAssignLoading] = useState(false);

  // States cho form đăng ký
  const [vaccineSchedules, setVaccineSchedules] = useState([]);
  const [availableDates, setAvailableDates] = useState([]);
  const [availableTimes, setAvailableTimes] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  const closeModal = () => {
    setModalHandle(false);
    setFormHandle({});
    setFormErrors({});
    setSelectedSchedule(null);
    setSelectedDate(null);
    setSelectedTime(null);
    setAvailableDates([]);
    setAvailableTimes([]);
  };

  useEffect(() => {
    if (modalHandle) {
      loadVaccineSchedules();
    }
  }, [modalHandle]);

  useEffect(() => {
    handleCustomerSchedules(formSearch);
  }, [formSearch]);

  useEffect(() => {
    handleCustomerSchedules({ ...formSearch, page: currentPage, limit: pageSize });
  }, [currentPage, pageSize]);

  const loadVaccineSchedules = async () => {
    setLoadingSchedules(true);
    try {
      const [active, upcoming] = await Promise.all([
        VaccineScheduleApi.findByFilters({ status: "ACTIVE", size: 100, page: 1 }),
        VaccineScheduleApi.findByFilters({ status: "UPCOMING", size: 100, page: 1 }),
      ]);
      const combined = [...(active.content || []), ...(upcoming.content || [])];
      setVaccineSchedules(combined);
    } catch (err) {
      AppNotification.error("Không tải được danh sách lịch tiêm");
    } finally {
      setLoadingSchedules(false);
    }
  };

  const handleSelectSchedule = async (scheduleId) => {
    const schedule = vaccineSchedules.find(s => s.id === scheduleId);
    setSelectedSchedule(schedule);
    setSelectedDate(null);
    setSelectedTime(null);
    setAvailableDates([]);
    setAvailableTimes([]);
    handleInputChange("vaccineScheduleId", scheduleId);
    handleInputChange("vaccineScheduleTimeId", null);

    const res = await getMethod(`/api/vaccine-schedule-time/public/find-date-by-vaccine-schedule?idSchedule=${scheduleId}`);
    const dates = await res.json();
    setAvailableDates(dates);
    if (dates.length === 0) {
      AppNotification.warning("Lịch này chưa có ngày tiêm nào");
    }
  };

  const handleSelectDate = async (date) => {
    setSelectedDate(date);
    setSelectedTime(null);
    setAvailableTimes([]);
    handleInputChange("vaccineScheduleTimeId", null);

    const res = await getMethod(
      `/api/vaccine-schedule-time/public/find-time-by-vaccine-schedule?date=${date}&idSchedule=${selectedSchedule.id}`
    );
    const times = await res.json();
    setAvailableTimes(times);
    if (times.length === 0) {
      AppNotification.warning("Không có giờ tiêm nào trong ngày này");
    }
  };

  const handleSelectTime = (timeId) => {
    const time = availableTimes.find(t => t.id === timeId);
    setSelectedTime(time);
    handleInputChange("vaccineScheduleTimeId", timeId);
  };

  const handleCustomerSchedules = async (formSearch) => {
    setLoading(true);
    await CustomerScheduleApi.customerSchedules(formSearch)
      .then((res) => {
        setTotal(res.data.totalElements);
        setCurrentPage(res.data.pageable.pageNumber + 1);
        setPageSize(res.data.size);
        setCustomerSchedules(updatedList(res.data.content, formSearch.page, formSearch.limit));
        setTimeout(() => setLoading(false), 500);
      })
      .catch((err) => console.log(err));
  };

  const updatedList = (data, currentPage, pageSize) =>
    data.map((item, index) => ({ ...item, stt: (currentPage - 1) * pageSize + index + 1 }));

  const handleApprove = (id, status) => {
    CustomerScheduleApi.approveCustomerSchedule({ customerScheduleId: id, status })
      .then(() => {
        handleCustomerSchedules(formSearch);
        if (status === "confirmed") AppNotification.success("Duyệt thành công");
        else if (status === "injected") AppNotification.success("Đã xác nhận tiêm xong");
        else AppNotification.success("Từ chối thành công");
      })
      .catch((err) => {
        const msg = err.response?.data?.defaultMessage;
        if (msg) AppNotification.error(msg);
      });
  };

  const onPageChange = (page, pageSize) => {
    setCurrentPage(page);
    setPageSize(pageSize);
  };

  const validateForm = () => {
    const errors = {};
    if (!formHandle.fullName?.trim()) errors.fullName = "Vui lòng nhập họ tên";
    if (!formHandle.email?.trim()) errors.email = "Vui lòng nhập email";
    else if (!/\S+@\S+\.\S+/.test(formHandle.email)) errors.email = "Email không hợp lệ";
    if (!formHandle.phone?.trim()) errors.phone = "Vui lòng nhập số điện thoại";
    else if (!/^[0-9]{9,11}$/.test(formHandle.phone)) errors.phone = "Số điện thoại không hợp lệ";
    if (!formHandle.address?.trim()) errors.address = "Vui lòng nhập địa chỉ";
    if (!formHandle.vaccineScheduleId) errors.vaccineScheduleId = "Vui lòng chọn lịch tiêm";
    if (!formHandle.vaccineScheduleTimeId) errors.vaccineScheduleTimeId = "Vui lòng chọn giờ tiêm";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    CustomerScheduleApi.createCustomerSchedule(formHandle)
      .then(() => {
        AppNotification.success("Đăng ký thành công");
        handleCustomerSchedules(formSearch);
        closeModal();
      })
      .catch((err) => {
        const msg = err.response?.data?.defaultMessage;
        AppNotification.error(msg || "Đăng ký thất bại");
      });
  };

  const handleInputChange = (name, value) => {
    setFormHandle((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const openAssignModal = async (record) => {
    setAssignRecord(record);
    setSelectedDoctorId(record.doctor?.id || null);
    setSelectedNurseId(record.nurse?.id || null);
    // load doctors & nurses if not loaded
    if (doctors.length === 0) {
      try {
        const [dRes, nRes] = await Promise.all([
          getMethod("/api/doctor/public/find-all"),
          getMethod("/api/nurse/public/find-all"),
        ]);
        const dData = await dRes.json();
        const nData = await nRes.json();
        setDoctors(Array.isArray(dData) ? dData : []);
        setNurses(Array.isArray(nData) ? nData : []);
      } catch {
        AppNotification.error("Không tải được danh sách bác sĩ / y tá");
      }
    }
    setAssignModal(true);
  };

  const handleAssign = async () => {
    if (!assignRecord) return;
    setAssignLoading(true);
    try {
      const res = await postMethodPayload("/api/customer-schedule/staff/assign-doctor-nurse", {
        customerScheduleId: assignRecord.id,
        doctorId: selectedDoctorId || null,
        nurseId: selectedNurseId || null,
      });
      if (res.ok) {
        AppNotification.success("Phân công thành công");
        setAssignModal(false);
        handleCustomerSchedules(formSearch);
      } else {
        const data = await res.json();
        AppNotification.error(data.defaultMessage || "Phân công thất bại");
      }
    } catch {
      AppNotification.error("Lỗi kết nối");
    } finally {
      setAssignLoading(false);
    }
  };

  const statusColorMap = {
    confirmed: "green", pending: "gold", cancelled: "red",
    injected: "blue", finished: "cyan", not_injected: "orange",
  };
  const statusLabelMap = {
    confirmed: "Đã duyệt", pending: "Chờ duyệt", cancelled: "Đã từ chối",
    injected: "Đã tiêm", finished: "Hoàn thành", not_injected: "Chưa tiêm",
  };

  const columns = [
    { title: "STT", dataIndex: "stt", key: "stt" },
    {
      title: "Tên Vaccine", dataIndex: "vaccineSchedule", key: "vaccineSchedule",
      render: (_, record) => record.vaccineScheduleTime?.vaccineSchedule?.vaccine?.name,
    },
    { title: "Tên khách hàng", dataIndex: "fullName", key: "fullName" },
    {
      title: "Thanh toán", dataIndex: "payStatus", key: "payStatus", align: "center",
      render: (_, record) => <div>{record?.payStatus ? "Đã thanh toán" : "Chưa thanh toán"}</div>,
    },
    {
      title: "Ngày tạo", dataIndex: "createdDate", key: "createdDate", align: "center",
      render: (date) => dayjs(date).format("HH:mm DD-MM-YYYY"),
    },
    {
      title: "Thời gian kết thúc", dataIndex: "completedDate", key: "completedDate", align: "center",
      render: (date) => date ? dayjs(date).format("HH:mm DD-MM-YYYY") : <span style={{ color: "#bbb" }}>—</span>,
    },
    {
      title: "Trạng Thái", dataIndex: "status", key: "status", align: "center",
      render: (text) => (
        <Tag color={statusColorMap[text] || "default"}>{statusLabelMap[text] || text}</Tag>
      ),
    },
    {
      title: "Bác sĩ",
      key: "doctor",
      align: "center",
      render: (_, record) => record.doctor ? (
        <span style={{ color: "#1677ff" }}>{record.doctor.fullName}</span>
      ) : <span style={{ color: "#bbb" }}>Chưa phân công</span>,
    },
    {
      title: "Y tá",
      key: "nurse",
      align: "center",
      render: (_, record) => record.nurse ? (
        <span style={{ color: "#52c41a" }}>{record.nurse.fullName}</span>
      ) : <span style={{ color: "#bbb" }}>Chưa phân công</span>,
    },
    {
      title: "Hành động", dataIndex: "hanhDong", key: "hanhDong", align: "center",
      render: (text, record) => (
        <div style={{ display: "flex", justifyContent: "center", gap: "8px", flexWrap: "wrap" }}>
          {record.status === "pending" && (
            <>
              <Popconfirm
                title="Thông báo" description="Bạn có chắc chắn muốn từ chối không ?"
                onConfirm={() => handleApprove(record.id, "cancelled")} okText="Có" cancelText="Không"
              >
                <Button type="primary" title="Từ chối" style={{ backgroundColor: "red", borderColor: "red" }}>
                  <FontAwesomeIcon icon={faRemove} />
                </Button>
              </Popconfirm>
              <Popconfirm
                title="Thông báo" description="Bạn có chắc chắn muốn duyệt không ?"
                onConfirm={() => handleApprove(record.id, "confirmed")} okText="Có" cancelText="Không"
              >
                <Button type="primary" title="Duyệt" style={{ backgroundColor: "green", borderColor: "green" }}>
                  <FontAwesomeIcon icon={faCheck} />
                </Button>
              </Popconfirm>
            </>
          )}
          {record.status === "confirmed" && (
            <Popconfirm
              title="Thông báo" description="Xác nhận khách hàng đã tiêm xong?"
              onConfirm={() => handleApprove(record.id, "injected")} okText="Có" cancelText="Không"
            >
              <Button type="primary" style={{ backgroundColor: "#1677ff", borderColor: "#1677ff" }}>
                <FontAwesomeIcon icon={faSyringe} /> Đã tiêm
              </Button>
            </Popconfirm>
          )}
          {record.status !== "cancelled" && record.status !== "injected" && (
            <Button
              title="Phân công bác sĩ / y tá"
              onClick={() => openAssignModal(record)}
              style={{ borderColor: "#722ed1", color: "#722ed1" }}
            >
              <FontAwesomeIcon icon={faUserPlus} /> Phân công
            </Button>
          )}
        </div>
      ),
    },
  ];

  const statusOptions = [
    { label: "Tất cả", value: "" },
    { label: "Chờ duyệt", value: "pending" },
    { label: "Đã duyệt", value: "confirmed" },
    { label: "Từ chối", value: "cancelled" },
    { label: "Đã tiêm", value: "injected" },
  ];

  return (
    <React.Fragment>
      <h3>Danh sách đăng ký</h3>
      <Button
        style={{ marginRight: 50, height: 40, marginTop: 20 }}
        onClick={() => setModalHandle(true)}
      >
        Đăng ký cho khách
      </Button>
      <div style={{ marginTop: 20, marginBottom: 20, display: "flex", alignItems: "center" }}>
        <Input
          style={{ width: "20%" }}
          placeholder="Tìm theo tên"
          onChange={(e) => setFormSearch({ ...formSearch, fullName: e.target.value })}
        />
        <Select
          showSearch
          style={{ width: 170, marginLeft: "auto", marginRight: 30 }}
          optionFilterProp="children"
          onChange={(value) => setFormSearch({ ...formSearch, status: value })}
          filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}
          value={formSearch?.status}
        >
          {statusOptions.map((s) => (
            <Option key={s.value} value={s.value}>{s.label}</Option>
          ))}
        </Select>
      </div>
      <Table columns={columns} dataSource={customerSchedules || []} pagination={false} loading={loading} />
      <div style={{ display: "flex", width: "100%", marginTop: 30, marginBottom: 30 }}>
        <Pagination
          current={currentPage} pageSize={pageSize} total={total}
          showSizeChanger onChange={onPageChange} style={{ marginLeft: "auto" }}
        />
      </div>

      {/* Modal phân công bác sĩ / y tá */}
      <Modal
        title="Phân công bác sĩ / y tá"
        open={assignModal}
        onCancel={() => setAssignModal(false)}
        footer={[
          <Button key="cancel" onClick={() => setAssignModal(false)}>Hủy</Button>,
          <Button key="save" type="primary" loading={assignLoading} onClick={handleAssign}>Lưu phân công</Button>,
        ]}
      >
        <Form layout="vertical">
          <Form.Item label="Bác sĩ phụ trách">
            <Select
              allowClear
              showSearch
              placeholder="Chọn bác sĩ"
              value={selectedDoctorId || undefined}
              onChange={(val) => setSelectedDoctorId(val || null)}
              optionFilterProp="label"
              style={{ width: "100%" }}
              options={doctors.map((d) => ({ value: d.id, label: d.fullName || `Bác sĩ #${d.id}` }))}
            />
          </Form.Item>
          <Form.Item label="Y tá phụ trách">
            <Select
              allowClear
              showSearch
              placeholder="Chọn y tá"
              value={selectedNurseId || undefined}
              onChange={(val) => setSelectedNurseId(val || null)}
              optionFilterProp="label"
              style={{ width: "100%" }}
              options={nurses.map((n) => ({ value: n.id, label: n.fullName || `Y tá #${n.id}` }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Đăng ký tiêm cho khách"
        open={modalHandle}
        onCancel={closeModal}
        width={600}
        footer={[
          <Button key="cancel" onClick={closeModal}>Hủy</Button>,
          <Popconfirm
            key="submit"
            title="Xác nhận đăng ký tiêm cho khách?"
            onConfirm={handleSubmit}
            okText="Có"
            cancelText="Không"
          >
            <Button type="primary">Đăng ký</Button>
          </Popconfirm>,
        ]}
      >
        <Form layout="vertical" autoComplete="off">
          <Form.Item
            label="Họ tên khách hàng"
            validateStatus={formErrors.fullName ? "error" : ""}
            help={formErrors.fullName}
            required
          >
            <Input
              placeholder="Nhập họ tên"
              value={formHandle.fullName || ""}
              onChange={(e) => handleInputChange("fullName", e.target.value)}
            />
          </Form.Item>

          <Form.Item
            label="Email"
            validateStatus={formErrors.email ? "error" : ""}
            help={formErrors.email}
            required
          >
            <Input
              placeholder="Nhập email"
              value={formHandle.email || ""}
              onChange={(e) => handleInputChange("email", e.target.value)}
            />
          </Form.Item>

          <Form.Item
            label="Số điện thoại"
            validateStatus={formErrors.phone ? "error" : ""}
            help={formErrors.phone}
            required
          >
            <Input
              placeholder="Nhập số điện thoại"
              value={formHandle.phone || ""}
              onChange={(e) => handleInputChange("phone", e.target.value)}
            />
          </Form.Item>

          <Form.Item
            label="Địa chỉ"
            validateStatus={formErrors.address ? "error" : ""}
            help={formErrors.address}
            required
          >
            <Input
              placeholder="Nhập địa chỉ"
              value={formHandle.address || ""}
              onChange={(e) => handleInputChange("address", e.target.value)}
            />
          </Form.Item>

          <Form.Item
            label="Lịch tiêm vaccine"
            validateStatus={formErrors.vaccineScheduleId ? "error" : ""}
            help={formErrors.vaccineScheduleId}
            required
          >
            <Select
              showSearch
              placeholder={loadingSchedules ? "Đang tải..." : "Chọn lịch tiêm"}
              loading={loadingSchedules}
              value={formHandle.vaccineScheduleId || undefined}
              optionFilterProp="label"
              onChange={handleSelectSchedule}
              style={{ width: "100%" }}
              options={vaccineSchedules.map((s) => ({
                value: s.id,
                label: `${s.vaccine?.name || "?"} — ${s.center?.centerName || "?"} (${dayjs(s.startDate).format("DD/MM/YYYY")} - ${dayjs(s.endDate).format("DD/MM/YYYY")})`,
              }))}
            />
          </Form.Item>

          {availableDates.length > 0 && (
            <Form.Item
              label="Ngày tiêm"
              validateStatus={formErrors.vaccineScheduleTimeId && !selectedDate ? "error" : ""}
              required
            >
              <Select
                placeholder="Chọn ngày tiêm"
                value={selectedDate || undefined}
                onChange={handleSelectDate}
                style={{ width: "100%" }}
                options={availableDates.map((d) => ({
                  value: d,
                  label: dayjs(d).format("DD/MM/YYYY"),
                }))}
              />
            </Form.Item>
          )}

          {availableTimes.length > 0 && (
            <Form.Item
              label="Giờ tiêm"
              validateStatus={formErrors.vaccineScheduleTimeId ? "error" : ""}
              help={formErrors.vaccineScheduleTimeId}
              required
            >
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {availableTimes.map((t) => {
                  const isFull = t.quantity >= t.limitPeople;
                  const isSelected = selectedTime?.id === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => !isFull && handleSelectTime(t.id)}
                      style={{
                        padding: "6px 12px",
                        border: `2px solid ${isSelected ? "#1677ff" : isFull ? "#d9d9d9" : "#d9d9d9"}`,
                        borderRadius: 6,
                        cursor: isFull ? "not-allowed" : "pointer",
                        backgroundColor: isSelected ? "#e6f4ff" : isFull ? "#f5f5f5" : "#fff",
                        color: isFull ? "#bbb" : "#333",
                        fontSize: 13,
                        userSelect: "none",
                      }}
                    >
                      {t.start?.slice(0, 5)} - {t.end?.slice(0, 5)}<br />
                      <span style={{ fontSize: 11, color: isFull ? "#f5222d" : "#52c41a" }}>
                        {t.quantity}/{t.limitPeople} chỗ
                      </span>
                    </div>
                  );
                })}
              </div>
            </Form.Item>
          )}
        </Form>
      </Modal>
    </React.Fragment>
  );
};

export default CustomerSchedule;
