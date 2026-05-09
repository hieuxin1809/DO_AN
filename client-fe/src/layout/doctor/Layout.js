import avatar from "../../assest/images/user.svg";
import { useEffect, useState } from "react";

function DoctorLayout({ children }) {
  const [isCssLoaded, setCssLoaded] = useState(false);

  useEffect(() => {
    if (!isCssLoaded) {
      import("../staff/layout.scss").then(() => setCssLoaded(true));
    }
  }, [isCssLoaded]);

  const user = (() => { try { return JSON.parse(localStorage.getItem("user")) || {}; } catch { return {}; } })();

  return (
    <>
      <div className="navleft">
        <div className="divroot">
          <img src={avatar} alt="Avatar" />
          <div className="name-status">
            <h4>Bác sĩ</h4>
            <span className="online-status">
              <i className="fa fa-circle"></i> Online
            </span>
          </div>
        </div>
        <div className="listmenumain">
          <a href="/doctor/patients">
            <i className="fa fa-users"></i> Bệnh nhân của tôi
          </a>
          <a href="/doctor/lich-tiem">
            <i className="fa fa-calendar"></i> Lịch tiêm và Khách hàng
          </a>
          <a href="/doctor/chat">
            <i className="fa fa-envelope"></i> Tin nhắn
          </a>
          <a href="#" onClick={() => logout()}>
            <i className="fa fa-sign-out"></i> Đăng xuất
          </a>
        </div>
      </div>

      <div className="header">
        <div className="header-left"></div>
        <div className="header-right">
          <div className="profile">
            <img src={avatar} alt="Avatar" />
            <span>{user.email || "Bác sĩ"}</span>
          </div>
        </div>
      </div>

      <div className="contentadminweb">
        <div className="contentmain">
          <div className="table-section">{children}</div>
        </div>
      </div>
    </>
  );
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.replace("/login");
}

export default DoctorLayout;
