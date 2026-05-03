import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { Modal } from "bootstrap";
import "react-toastify/dist/ReactToastify.css";
import { getMethod } from "../../services/request";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

const AdminPhanHoi = () => {
    const [items, setItems] = useState([]);
    const [filterType, setFilterType] = useState("all");
    const [selectedFeedback, setSelectedFeedback] = useState(null);
    const [detailModal, setDetailModal] = useState(null);

    useEffect(() => {
        const modal = new Modal(document.getElementById("feedbackDetailModal"));
        setDetailModal(modal);
        fetchFeedbacks();
    }, []);

    async function fetchFeedbacks() {
        const response = await getMethod("/api/feedback/admin/all");
        if (response.status < 300) {
            const result = await response.json();
            setItems(result);
        } else {
            toast.error("Không thể tải danh sách phản hồi");
        }
    }

    const filtered = filterType === "all"
        ? items
        : items.filter((i) => i.feedbackType === filterType);

    const renderStars = (rating) => {
        return Array.from({ length: 5 }, (_, i) => (
            <i
                key={i}
                className="fa fa-star"
                style={{ color: i < rating ? "#f5a623" : "#ddd", marginRight: 2 }}
            />
        ));
    };

    const handleViewDetail = (item) => {
        setSelectedFeedback(item);
        if (detailModal) detailModal.show();
    };

    return (
        <>
            <div className="row header-page-admin" style={{ margin: "20px 0", display: "flex", alignItems: "center", gap: 12 }}>
                <div className="col-sm-4">
                    <select
                        className="form-control"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                    >
                        <option value="all">Tất cả loại phản hồi</option>
                        <option value="general">Chung</option>
                        <option value="doctor">Bác sĩ</option>
                        <option value="nurse">Y tá</option>
                    </select>
                </div>
                <div className="col-sm-3">
                    <button className="btn btn-primary" onClick={fetchFeedbacks}>
                        <i className="fa fa-refresh"></i> Làm mới
                    </button>
                </div>
            </div>

            <div className="tablediv">
                <div className="headertable">
                    <span className="lbtable">Danh sách phản hồi khách hàng ({filtered.length})</span>
                </div>
                <div className="divcontenttable">
                    <table className="table table-bordered">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Khách hàng</th>
                                <th>Số điện thoại</th>
                                <th>Đánh giá</th>
                                <th>Nội dung</th>
                                <th>Bác sĩ / Y tá</th>
                                <th>Ngày tạo</th>
                                <th>Chi tiết</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="text-center">Không có phản hồi nào</td>
                                </tr>
                            )}
                            {filtered.map((item) => (
                                <tr key={item.id}>
                                    <td>{item.id}</td>
                                    <td>{item.customerSchedule?.fullName || "—"}</td>
                                    <td>{item.customerSchedule?.phone || "—"}</td>
                                    <td>{renderStars(item.rating)}</td>
                                    <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {item.content}
                                    </td>
                                    <td>
                                        {item.doctor?.fullName && <div>BS: {item.doctor.fullName}</div>}
                                        {item.nurse?.fullName && <div>YT: {item.nurse.fullName}</div>}
                                        {!item.doctor && !item.nurse && "—"}
                                    </td>
                                    <td>
                                        {item.createdDate
                                            ? new Date(item.createdDate).toLocaleDateString("vi-VN")
                                            : "—"}
                                    </td>
                                    <td>
                                        <i
                                            className="fa fa-eye iconaction"
                                            style={{ cursor: "pointer" }}
                                            onClick={() => handleViewDetail(item)}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div
                className="modal fade"
                id="feedbackDetailModal"
                tabIndex="-1"
                aria-labelledby="feedbackDetailModalLabel"
                aria-hidden="true"
            >
                <div className="modal-dialog modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title" id="feedbackDetailModalLabel">
                                Chi tiết phản hồi #{selectedFeedback?.id}
                            </h5>
                            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
                        </div>
                        <div className="modal-body">
                            {selectedFeedback && (
                                <div>
                                    <p><strong>Khách hàng:</strong> {selectedFeedback.customerSchedule?.fullName || "—"}</p>
                                    <p><strong>Số điện thoại:</strong> {selectedFeedback.customerSchedule?.phone || "—"}</p>
                                    <p><strong>Đánh giá:</strong> {renderStars(selectedFeedback.rating)} ({selectedFeedback.rating}/5)</p>
                                    <p><strong>Nội dung:</strong> {selectedFeedback.content}</p>
                                    {selectedFeedback.doctor && (
                                        <p><strong>Bác sĩ:</strong> {selectedFeedback.doctor.fullName}</p>
                                    )}
                                    {selectedFeedback.nurse && (
                                        <p><strong>Y tá:</strong> {selectedFeedback.nurse.fullName}</p>
                                    )}
                                    <p><strong>Lịch đăng ký ID:</strong> {selectedFeedback.customerSchedule?.id || "—"}</p>
                                    <p><strong>Ngày tạo:</strong> {selectedFeedback.createdDate ? new Date(selectedFeedback.createdDate).toLocaleString("vi-VN") : "—"}</p>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AdminPhanHoi;
