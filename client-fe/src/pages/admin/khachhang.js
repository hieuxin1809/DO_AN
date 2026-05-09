import { useState, useEffect } from "react";
import ReactPaginate from "react-paginate";
import { toast } from "react-toastify";
import { Modal } from "bootstrap";
import "react-toastify/dist/ReactToastify.css";
import {
  getMethod,
  deleteMethod,
  putMethod,
  uploadSingleFile,
} from "../../services/request";
import "./khachhang.scss";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

var size = 10;
const AdminKhachHang = () => {
  const [items, setItems] = useState([]);
  const [pageCount, setpageCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editCustomer, setEditCustomer] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [errors, setErrors] = useState({});

  // Address
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [selectedProvinceCode, setSelectedProvinceCode] = useState("");
  const [selectedDistrictCode, setSelectedDistrictCode] = useState("");
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);

  useEffect(() => {
    const modal = new Modal(document.getElementById("editCustomerModal"));
    setEditModal(modal);
    fetch("https://provinces.open-api.vn/api/p/")
      .then((res) => res.json())
      .then((data) => setProvinces(data))
      .catch((err) => console.error("Error loading provinces:", err));
  }, []);

  useEffect(() => {
    const getKhachHang = async () => {
      var response = await getMethod(
        "/api/customer-profile/admin/list-customer?page=0&size=" +
          size +
          "&sort=id,asc" +
          (searchTerm ? "&q=" + searchTerm : ""),
      );
      var result = await response.json();
      setItems(result.content);
      setpageCount(result.totalPages);
    };
    getKhachHang();
  }, [searchTerm]);

  async function getAllKhachHang(page) {
    var url =
      "/api/customer-profile/admin/list-customer?page=" +
      page +
      "&size=" +
      size +
      "&sort=id,asc";
    if (searchTerm) url += "&q=" + searchTerm;
    var response = await getMethod(url);
    var result = await response.json();
    setItems(result.content);
    setpageCount(result.totalPages);
  }

  const handlePageClick = async (data) => {
    await getAllKhachHang(data.selected);
  };

  async function deleteKhachHang(id) {
    var con = window.confirm("Bạn chắc chắn muốn xóa khách hàng này?");
    if (!con) return;
    var url = `/api/customer-profile/admin/delete/${id}`;
    const response = await deleteMethod(url);
    if (response.status < 300) {
      toast.success("Xóa thành công!");
      getAllKhachHang(0);
    }
    if (response.status === 417) {
      var result = await response.json();
      toast.warning(result.defaultMessage);
    }
  }

  const handleEditClick = async (item) => {
    setEditCustomer({ ...item });
    setErrors({});
    setDistricts([]);
    setWards([]);
    setSelectedProvinceCode("");
    setSelectedDistrictCode("");

    if (editModal) editModal.show();

    // Pre-select address từ dữ liệu hiện có
    if (item.city && provinces.length > 0) {
      const province = provinces.find((p) => p.name === item.city);
      if (province) {
        setSelectedProvinceCode(String(province.code));
        try {
          setLoadingDistricts(true);
          const res = await fetch(
            `https://provinces.open-api.vn/api/p/${province.code}?depth=2`,
          );
          const data = await res.json();
          const distList = data.districts || [];
          setDistricts(distList);
          setLoadingDistricts(false);

          if (item.district) {
            const dist = distList.find((d) => d.name === item.district);
            if (dist) {
              setSelectedDistrictCode(String(dist.code));
              setLoadingWards(true);
              const res2 = await fetch(
                `https://provinces.open-api.vn/api/d/${dist.code}?depth=2`,
              );
              const data2 = await res2.json();
              setWards(data2.wards || []);
              setLoadingWards(false);
            }
          }
        } catch (err) {
          console.error("Error pre-loading address:", err);
          setLoadingDistricts(false);
          setLoadingWards(false);
        }
      }
    }
  };

  const handleProvinceChange = async (e) => {
    const code = e.target.value;
    const name = provinces.find((p) => String(p.code) === code)?.name || "";
    setSelectedProvinceCode(code);
    setSelectedDistrictCode("");
    setDistricts([]);
    setWards([]);
    setEditCustomer((prev) => ({ ...prev, city: name, district: "", ward: "" }));
    if (errors.city) setErrors((prev) => ({ ...prev, city: null }));

    if (code) {
      try {
        setLoadingDistricts(true);
        const res = await fetch(
          `https://provinces.open-api.vn/api/p/${code}?depth=2`,
        );
        const data = await res.json();
        setDistricts(data.districts || []);
      } catch (err) {
        console.error("Error loading districts:", err);
      } finally {
        setLoadingDistricts(false);
      }
    }
  };

  const handleDistrictChange = async (e) => {
    const code = e.target.value;
    const name = districts.find((d) => String(d.code) === code)?.name || "";
    setSelectedDistrictCode(code);
    setWards([]);
    setEditCustomer((prev) => ({ ...prev, district: name, ward: "" }));
    if (errors.district) setErrors((prev) => ({ ...prev, district: null }));

    if (code) {
      try {
        setLoadingWards(true);
        const res = await fetch(
          `https://provinces.open-api.vn/api/d/${code}?depth=2`,
        );
        const data = await res.json();
        setWards(data.wards || []);
      } catch (err) {
        console.error("Error loading wards:", err);
      } finally {
        setLoadingWards(false);
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const phoneRegex = /^[0-9]{9,11}$/;

    if (!editCustomer.fullName || editCustomer.fullName.trim() === "") {
      newErrors.fullName = "Họ tên không được để trống";
    }
    if (!editCustomer.birthdate) {
      newErrors.birthdate = "Ngày sinh không được để trống";
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (new Date(editCustomer.birthdate) >= today) {
        newErrors.birthdate = "Ngày sinh phải là ngày trong quá khứ";
      }
    }
    if (!editCustomer.phone || editCustomer.phone.trim() === "") {
      newErrors.phone = "Số điện thoại không được để trống";
    } else if (!phoneRegex.test(editCustomer.phone.trim())) {
      newErrors.phone = "Số điện thoại phải từ 9-11 chữ số";
    }
    if (!editCustomer.street || editCustomer.street.trim() === "") {
      newErrors.street = "Đường/Số nhà không được để trống";
    }
    if (!editCustomer.city) newErrors.city = "Vui lòng chọn tỉnh/thành phố";
    if (!editCustomer.district) newErrors.district = "Vui lòng chọn quận/huyện";
    if (!editCustomer.ward) newErrors.ward = "Vui lòng chọn phường/xã";

    if (editCustomer.contactPhone && editCustomer.contactPhone.trim() !== "") {
      if (!phoneRegex.test(editCustomer.contactPhone.trim())) {
        newErrors.contactPhone = "SĐT người liên hệ phải từ 9-11 chữ số";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  async function updateKhachHang() {
    if (!editCustomer) return;
    if (!validateForm()) {
      toast.warning("Vui lòng kiểm tra lại thông tin!");
      return;
    }

    const fileInput = document.getElementById("avatarUpload");
    if (fileInput.files.length > 0) {
      const avatarUrl = await uploadSingleFile(fileInput);
      if (avatarUrl) editCustomer.avatar = avatarUrl;
    }

    const response = await putMethod(
      `/api/customer-profile/admin/update/${editCustomer.id}`,
      editCustomer,
    );
    if (response.status < 300) {
      toast.success("Cập nhật thành công!");
      getAllKhachHang(0);
      if (editModal) {
        editModal.hide();
        document.body.classList.remove("modal-open");
        document.body.style.overflow = "";
        document.body.style.paddingRight = "";
        const backdrop = document.querySelector(".modal-backdrop");
        if (backdrop) backdrop.remove();
      }
      setEditCustomer(null);
      setErrors({});
    } else {
      const result = await response.json();
      toast.error(result.defaultMessage || "Có lỗi xảy ra");
    }
  }

  return (
    <>
      <div className="row header-page-admin">
        <div className="col-sm-9">
          <input
            type="text"
            className="form-control"
            placeholder="Tìm kiếm theo tên, số điện thoại, email của khách hàng"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="col-sm-3">
          <button
            className="btn btn-primary"
            onClick={() => getAllKhachHang(0)}
          >
            <i className="fa fa-search"></i> Tìm kiếm
          </button>
        </div>
      </div>

      <div className="tablediv">
        <div className="headertable">
          <span className="lbtable">Danh sách khách hàng</span>
        </div>
        <div className="divcontenttable">
          <table id="example" className="table table-bordered">
            <thead>
              <tr>
                <th>ID</th>
                <th>Họ tên khách hàng</th>
                <th>Giới tính</th>
                <th>Ngày sinh</th>
                <th>Số điện thoại</th>
                <th>Người liên hệ</th>
                <th>Chức năng</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.fullName}</td>
                  <td>{item.gender === "Male" ? "Nam" : "Nữ"}</td>
                  <td>{item.birthdate}</td>
                  <td>{item.phone}</td>
                  <td>{item.contactName}</td>
                  <td>
                    <i
                      onClick={() => setSelectedCustomer(item)}
                      data-bs-toggle="modal"
                      data-bs-target="#customerDetailModal"
                      className="fa fa-eye iconaction"
                    ></i>
                    <i
                      onClick={() => handleEditClick(item)}
                      className="fa fa-edit iconaction"
                    ></i>
                    <i
                      onClick={() => deleteKhachHang(item.id)}
                      className="fa fa-trash iconaction"
                    ></i>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <ReactPaginate
            marginPagesDisplayed={2}
            pageCount={pageCount}
            onPageChange={handlePageClick}
            containerClassName={"pagination"}
            pageClassName={"page-item"}
            pageLinkClassName={"page-link"}
            previousClassName={"page-item"}
            previousLinkClassName={"page-link"}
            nextClassName={"page-item"}
            nextLinkClassName={"page-link"}
            breakClassName={"page-item"}
            breakLinkClassName={"page-link"}
            previousLabel={"Trang trước"}
            nextLabel={"Trang sau"}
            activeClassName={"active"}
          />
        </div>
      </div>

      {/* Modal xem chi tiết */}
      <div
        className="modal fade"
        id="customerDetailModal"
        tabIndex="-1"
        aria-labelledby="customerDetailModalLabel"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="customerDetailModalLabel">
                Thông tin chi tiết khách hàng
              </h5>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              ></button>
            </div>
            <div className="modal-body">
              {selectedCustomer && (
                <div>
                  <p><strong>Họ tên:</strong> {selectedCustomer.fullName}</p>
                  <p><strong>Giới tính:</strong> {selectedCustomer.gender === "Male" ? "Nam" : "Nữ"}</p>
                  <p><strong>Ngày sinh:</strong> {selectedCustomer.birthdate}</p>
                  <p><strong>Số điện thoại:</strong> {selectedCustomer.phone}</p>
                  <p>
                    <strong>Địa chỉ:</strong> {selectedCustomer.street},{" "}
                    {selectedCustomer.ward}, {selectedCustomer.district},{" "}
                    {selectedCustomer.city}
                  </p>
                  <p><strong>Người liên hệ:</strong> {selectedCustomer.contactName}</p>
                  <p><strong>Mối quan hệ:</strong> {selectedCustomer.contactRelationship}</p>
                  <p><strong>SĐT người liên hệ:</strong> {selectedCustomer.contactPhone}</p>
                  <p>
                    <strong>Ngày tạo:</strong>{" "}
                    {new Date(selectedCustomer.createdDate).toLocaleDateString("vi-VN")}
                  </p>
                  {selectedCustomer.avatar && (
                    <img
                      src={selectedCustomer.avatar}
                      style={{ maxWidth: "200px", marginTop: "10px" }}
                      alt="Avatar"
                    />
                  )}
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

      {/* Modal cập nhật */}
      <div
        className="modal fade"
        id="editCustomerModal"
        tabIndex="-1"
        aria-labelledby="editCustomerModalLabel"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="editCustomerModalLabel">
                Cập nhật thông tin khách hàng
              </h5>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              ></button>
            </div>
            <div className="modal-body">
              {editCustomer && (
                <div>
                  {/* Họ tên */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Họ tên <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control ${errors.fullName ? "is-invalid" : ""}`}
                      value={editCustomer.fullName || ""}
                      onChange={(e) => {
                        setEditCustomer({ ...editCustomer, fullName: e.target.value });
                        if (errors.fullName) setErrors({ ...errors, fullName: null });
                      }}
                    />
                    {errors.fullName && <div className="invalid-feedback">{errors.fullName}</div>}
                  </div>

                  {/* Giới tính */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Giới tính</label>
                    <select
                      className="form-control"
                      value={editCustomer.gender}
                      onChange={(e) =>
                        setEditCustomer({ ...editCustomer, gender: e.target.value })
                      }
                    >
                      <option value="Male">Nam</option>
                      <option value="Female">Nữ</option>
                    </select>
                  </div>

                  {/* Ngày sinh */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Ngày sinh <span className="text-danger">*</span>
                    </label>
                    <input
                      type="date"
                      className={`form-control ${errors.birthdate ? "is-invalid" : ""}`}
                      value={editCustomer.birthdate || ""}
                      onChange={(e) => {
                        setEditCustomer({ ...editCustomer, birthdate: e.target.value });
                        if (errors.birthdate) setErrors({ ...errors, birthdate: null });
                      }}
                    />
                    {errors.birthdate && <div className="invalid-feedback">{errors.birthdate}</div>}
                  </div>

                  {/* Số điện thoại */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Số điện thoại <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control ${errors.phone ? "is-invalid" : ""}`}
                      value={editCustomer.phone || ""}
                      onChange={(e) => {
                        setEditCustomer({ ...editCustomer, phone: e.target.value });
                        if (errors.phone) setErrors({ ...errors, phone: null });
                      }}
                    />
                    {errors.phone && <div className="invalid-feedback">{errors.phone}</div>}
                  </div>

                  {/* Địa chỉ */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Địa chỉ <span className="text-danger">*</span>
                    </label>

                    {/* Tỉnh/Thành phố */}
                    <select
                      className={`form-control mb-2 ${errors.city ? "is-invalid" : ""}`}
                      value={selectedProvinceCode}
                      onChange={handleProvinceChange}
                    >
                      <option value="">-- Chọn Tỉnh/Thành phố --</option>
                      {provinces.map((p) => (
                        <option key={p.code} value={String(p.code)}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    {errors.city && (
                      <div className="invalid-feedback d-block mb-1">{errors.city}</div>
                    )}

                    {/* Quận/Huyện */}
                    <select
                      className={`form-control mb-2 ${errors.district ? "is-invalid" : ""}`}
                      value={selectedDistrictCode}
                      onChange={handleDistrictChange}
                      disabled={!selectedProvinceCode || loadingDistricts}
                    >
                      <option value="">
                        {loadingDistricts ? "Đang tải..." : "-- Chọn Quận/Huyện --"}
                      </option>
                      {districts.map((d) => (
                        <option key={d.code} value={String(d.code)}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                    {errors.district && (
                      <div className="invalid-feedback d-block mb-1">{errors.district}</div>
                    )}

                    {/* Phường/Xã */}
                    <select
                      className={`form-control mb-2 ${errors.ward ? "is-invalid" : ""}`}
                      value={editCustomer.ward || ""}
                      onChange={(e) => {
                        setEditCustomer({ ...editCustomer, ward: e.target.value });
                        if (errors.ward) setErrors({ ...errors, ward: null });
                      }}
                      disabled={!selectedDistrictCode || loadingWards}
                    >
                      <option value="">
                        {loadingWards ? "Đang tải..." : "-- Chọn Phường/Xã --"}
                      </option>
                      {wards.map((w) => (
                        <option key={w.code} value={w.name}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                    {errors.ward && (
                      <div className="invalid-feedback d-block mb-1">{errors.ward}</div>
                    )}

                    {/* Đường/Số nhà */}
                    <input
                      type="text"
                      className={`form-control ${errors.street ? "is-invalid" : ""}`}
                      placeholder="Số nhà, tên đường"
                      value={editCustomer.street || ""}
                      onChange={(e) => {
                        setEditCustomer({ ...editCustomer, street: e.target.value });
                        if (errors.street) setErrors({ ...errors, street: null });
                      }}
                    />
                    {errors.street && <div className="invalid-feedback">{errors.street}</div>}
                  </div>

                  {/* Người liên hệ */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Người liên hệ</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editCustomer.contactName || ""}
                      onChange={(e) =>
                        setEditCustomer({ ...editCustomer, contactName: e.target.value })
                      }
                    />
                  </div>

                  {/* Mối quan hệ */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Mối quan hệ</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editCustomer.contactRelationship || ""}
                      onChange={(e) =>
                        setEditCustomer({
                          ...editCustomer,
                          contactRelationship: e.target.value,
                        })
                      }
                    />
                  </div>

                  {/* SĐT người liên hệ */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">SĐT người liên hệ</label>
                    <input
                      type="text"
                      className={`form-control ${errors.contactPhone ? "is-invalid" : ""}`}
                      value={editCustomer.contactPhone || ""}
                      onChange={(e) => {
                        setEditCustomer({ ...editCustomer, contactPhone: e.target.value });
                        if (errors.contactPhone)
                          setErrors({ ...errors, contactPhone: null });
                      }}
                    />
                    {errors.contactPhone && (
                      <div className="invalid-feedback">{errors.contactPhone}</div>
                    )}
                  </div>

                  {/* Ảnh đại diện */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Ảnh đại diện</label>
                    <input
                      type="file"
                      className="form-control"
                      id="avatarUpload"
                      accept="image/*"
                    />
                    {editCustomer.avatar && (
                      <img
                        src={editCustomer.avatar}
                        style={{ maxWidth: "200px", marginTop: "10px" }}
                        alt="Current Avatar"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                data-bs-dismiss="modal"
              >
                Đóng
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={updateKhachHang}
              >
                Cập nhật
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminKhachHang;
