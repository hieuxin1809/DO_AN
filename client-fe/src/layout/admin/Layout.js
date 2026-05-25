import { useState, useEffect, useRef } from "react";
import avatar from "../../assest/images/user.svg";

const P  = "#2A388F";
const A  = "#0ea5e9";
const S  = "#10b981";
const B  = "#e2e8f0";
const T  = "#1e293b";
const T2 = "#64748b";

const NAV = [
  { href: "index",           icon: "fa-home",             label: "Trang chủ" },
  { href: "user",            icon: "fa-user",             label: "Quản lý tài khoản" },
  { href: "danhmuc",         icon: "fa-list",             label: "Quản lý danh mục" },
  { href: "center",          icon: "fa-hospital-o",       label: "Quản lý trung tâm" },
  { href: "lich-tiem-chung", icon: "fa-calendar-check-o", label: "Lịch tiêm chủng" },
  { href: "khach-hang",      icon: "fa-users",            label: "Quản lý khách hàng" },
  { href: "nhan-vien",       icon: "fa-user-md",          label: "Quản lý bác sỹ, y tá" },
  { href: "phan-hoi",        icon: "fa-comments",         label: "Phản hồi khách hàng" },
  { href: "certificates",    icon: "fa-certificate",      label: "Giấy chứng nhận" },
  { href: "reminders",       icon: "fa-bell",             label: "Hệ thống nhắc lịch" },
];

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.replace("../");
}

function Header({ children }) {
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef(null);

  /* close dropdown when clicking outside */
  useEffect(() => {
    const handleClick = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const user = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); }
    catch { return {}; }
  })();
  const displayName = user.fullName || user.email || "Admin";

  /* highlight active link */
  const currentSlug = window.location.pathname.split("/").filter(Boolean).pop() || "";

  return (
    <>
      {/* ── Sidebar ── */}
      <div style={{
        position: "fixed", top: 0, left: 0, height: "100vh", width: 240,
        background: `linear-gradient(180deg, ${T} 0%, #0f172a 100%)`,
        display: "flex", flexDirection: "column", zIndex: 200,
        boxShadow: "4px 0 20px rgba(0,0,0,.18)",
      }}>
        {/* brand */}
        <div style={{ padding: "20px 22px 16px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: `linear-gradient(135deg,${P},${A})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 4px 12px rgba(42,56,143,.4)`, flexShrink: 0,
            }}>
              <i className="fa fa-hospital-o" style={{ color: "#fff", fontSize: 17 }} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", letterSpacing: ".3px" }}>
                Ivaccine
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)", marginTop: 1 }}>
                Quản Trị Hệ Thống
              </div>
            </div>
          </div>
        </div>

        {/* nav items */}
        <nav style={{ flex: 1, padding: "12px 10px", overflowY: "auto" }}>
          {NAV.map((item) => {
            const active = currentSlug === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                style={{
                  display: "flex", alignItems: "center", gap: 11,
                  padding: "10px 14px", borderRadius: 10, marginBottom: 3,
                  textDecoration: "none", transition: "all .15s",
                  background: active ? `linear-gradient(135deg,${P},${A})` : "transparent",
                  color: active ? "#fff" : "rgba(255,255,255,.65)",
                  boxShadow: active ? `0 3px 10px rgba(42,56,143,.4)` : "none",
                  fontWeight: active ? 700 : 500, fontSize: 13.5,
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.background = "rgba(255,255,255,.06)";
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = "transparent";
                }}
              >
                <i className={`fa ${item.icon}`}
                  style={{ fontSize: 15, width: 18, textAlign: "center", flexShrink: 0 }} />
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* footer */}
        <div style={{ padding: "12px 10px", borderTop: "1px solid rgba(255,255,255,.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px" }}>
            <img src={avatar} alt=""
              style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 12.5, fontWeight: 700, color: "#fff",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {displayName}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%",
                  background: S, display: "inline-block" }} />
                <span style={{ fontSize: 11, color: S }}>Online</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Top Header ── */}
      <div style={{
        position: "fixed", top: 0, left: 240, right: 0, height: 60,
        background: "#fff", borderBottom: `1px solid ${B}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px", zIndex: 190, boxShadow: "0 1px 8px rgba(0,0,0,.05)",
      }}>
        {/* breadcrumb */}
        <div style={{ fontSize: 14, fontWeight: 600, color: T2 }}>
          <span style={{ color: T2 }}>Admin </span>
          <span style={{ color: B, margin: "0 6px" }}>›</span>
          <span style={{ color: T }}>
            {NAV.find((n) => n.href === currentSlug)?.label || "Dashboard"}
          </span>
        </div>

        {/* profile dropdown */}
        <div ref={dropRef} style={{ position: "relative" }}>
          <button
            onClick={() => setDropOpen(!dropOpen)}
            style={{
              display: "flex", alignItems: "center", gap: 9, padding: "6px 12px",
              background: dropOpen ? "#f1f5f9" : "#fff",
              border: `1px solid ${B}`, borderRadius: 10, cursor: "pointer",
              transition: "all .15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#f1f5f9"; }}
            onMouseLeave={(e) => { if (!dropOpen) e.currentTarget.style.background = "#fff"; }}
          >
            <img src={avatar} alt="" style={{ width: 28, height: 28, borderRadius: 7 }} />
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T, lineHeight: 1.2 }}>
                {displayName}
              </div>
              <div style={{ fontSize: 11, color: S }}>● Online</div>
            </div>
            <i className={`fa fa-chevron-${dropOpen ? "up" : "down"}`}
              style={{ fontSize: 11, color: T2, marginLeft: 2 }} />
          </button>

          {dropOpen && (
            <div style={{
              position: "absolute", top: "calc(100% + 8px)", right: 0,
              background: "#fff", borderRadius: 12, border: `1px solid ${B}`,
              boxShadow: "0 10px 30px rgba(0,0,0,.12)", minWidth: 180,
              zIndex: 9999, overflow: "hidden",
            }}>
              <div style={{
                padding: "12px 16px", borderBottom: `1px solid ${B}`,
                background: `linear-gradient(135deg,${P}08,${A}08)`,
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T }}>{displayName}</div>
                <div style={{ fontSize: 12, color: T2, marginTop: 2 }}>Quản trị viên</div>
              </div>
              <button
                onClick={logout}
                style={{
                  width: "100%", padding: "11px 16px", border: "none", background: "none",
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 9,
                  fontSize: 13.5, fontWeight: 600, color: "#ef4444",
                  transition: "background .15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#fef2f2"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
              >
                <i className="fa fa-sign-out" style={{ fontSize: 14 }} />
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Main Content ── */}
      <div style={{ marginLeft: 240, paddingTop: 60, minHeight: "100vh", background: "#f1f5f9" }}>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </>
  );
}

export default Header;
