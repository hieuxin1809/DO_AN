import logo from '../../../assest/images/ivaccine-logo.jpg';
import { useState, useEffect } from 'react';
import { getMethod } from '../../../services/request';

var token = localStorage.getItem("token");

function Header() {
  import('../styles/styleuser.scss');

  const [danhMuc, setDanhMuc]   = useState([]);
  const [openMenu, setOpenMenu] = useState(null); // index of hovered parent item

  useEffect(() => {
    const getDanhMucCha = async () => {
      const response = await getMethod('/api/vaccine-type/find-primary');
      const result   = await response.json();
      setDanhMuc(result);
    };
    getDanhMucCha();
  }, []);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.replace('/');
  }

  const auth = token
    ? <>
        <a href="/tai-khoan"   style={topLinkStyle}>Tài khoản</a>
        <a onClick={logout}    style={{...topLinkStyle, color:'#e05c00', cursor:'pointer'}}>Đăng xuất</a>
      </>
    : <a href="/login" style={{...topLinkStyle, color:'#e05c00', fontWeight:'700'}}>Đăng nhập</a>;

  return (
    <div id="headerweb">

      {/* ── TOP ROW ───────────────────────────────────── */}
      <div className="container-web">
        <nav className="navbar navbar-expand-lg" style={{padding:'0'}}>
          <div className="container-fluid" style={{padding:'0'}}>

            {/* Logo */}
            <a className="navbar-brand" href="/">
              <img src={logo} className="imagelogoheader" alt="iVaccine" />
            </a>

            {/* Mobile toggle */}
            <button
              className="navbar-toggler"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#navbarMain"
              aria-controls="navbarMain"
              aria-expanded="false"
              aria-label="Toggle navigation"
            >
              <span className="navbar-toggler-icon" />
            </button>

            <div className="collapse navbar-collapse" id="navbarMain">
              <ul className="navbar-nav me-auto" />

              {/* Right actions */}
              <div style={{display:'flex', alignItems:'center', gap:'4px', flexWrap:'wrap'}}>
                <a href="/dang-ky-tiem-chung" style={topLinkStyle}>
                  <i className="fa fa-calendar" style={{marginRight:'5px'}} />
                  ĐĂNG KÝ TIÊM
                </a>
                <a href="tel:0342046981" style={{...topLinkStyle, color:'#e05c00', fontWeight:'700'}}>
                  HOTLINE: 0342.046.981
                </a>
                {auth}
              </div>

              {/* Search */}
              <form action="/tim-kiem-vaccine" className="d-flex" style={{marginLeft:'12px'}}>
                <input
                  name="search"
                  className="form-control"
                  placeholder="Tìm kiếm vaccine"
                  style={{
                    width:'180px', height:'34px',
                    fontSize:'13px', borderRadius:'6px',
                    border:'1px solid #d1d5db',
                  }}
                />
              </form>
            </div>
          </div>
        </nav>
      </div>

      {/* ── BOTTOM NAV ────────────────────────────────── */}
      <div style={{
        borderTop:'1px solid #e9ecef',
        background:'linear-gradient(90deg,#1e3a8a 0%,#2A388F 100%)',
      }}>
        <div className="container-web">
          <nav>
            <ul style={{
              display:'flex', flexWrap:'wrap',
              listStyle:'none', margin:0, padding:'0',
              alignItems:'center',
            }}>

              {/* Dynamic vaccine categories */}
              {danhMuc.map((item, index) => (
                <li
                  key={index}
                  style={{position:'relative'}}
                  onMouseEnter={() => setOpenMenu(index)}
                  onMouseLeave={() => setOpenMenu(null)}
                >
                  {/* Parent label */}
                  <a
                    href={item.vaccineTypes && item.vaccineTypes.length > 0
                      ? `/vaccine-danhmuc?danhmuc=${item.vaccineTypes[0].id}`
                      : '#'}
                    style={{
                      ...bottomLinkStyle,
                      background: openMenu === index ? 'rgba(255,255,255,0.15)' : 'transparent',
                      borderBottom: openMenu === index ? '2px solid #38bdf8' : '2px solid transparent',
                    }}
                    onClick={e => {
                      // prevent navigation on the parent itself; let dropdown handle it
                      // remove this if you want parent to navigate too
                    }}
                  >
                    {item.typeName}
                    <span style={{
                      marginLeft:'5px', fontSize:'10px',
                      opacity: 0.8,
                      display:'inline-block',
                      transform: openMenu === index ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition:'transform 0.2s',
                    }}>▼</span>
                  </a>

                  {/* Dropdown panel */}
                  {item.vaccineTypes && item.vaccineTypes.length > 0 && (
                    <div style={{
                      display:   openMenu === index ? 'block' : 'none',
                      position:  'absolute',
                      top:       '100%',
                      left:      '0',
                      minWidth:  '220px',
                      background:'#fff',
                      borderRadius:'0 0 10px 10px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                      zIndex:    2000,
                      border:    '1px solid #e2e8f0',
                      borderTop: '2px solid #0ea5e9',
                      overflow:  'hidden',
                      animation: 'fadeDown 0.15s ease',
                    }}>
                      {item.vaccineTypes.map((child, ci) => (
                        <a
                          key={ci}
                          href={`/vaccine-danhmuc?danhmuc=${child.id}`}
                          style={{
                            display:'block',
                            padding:'10px 18px',
                            fontSize:'13px',
                            color:'#1e293b',
                            textDecoration:'none',
                            fontWeight:'500',
                            borderBottom: ci < item.vaccineTypes.length - 1 ? '1px solid #f1f5f9' : 'none',
                            transition:'background 0.15s, color 0.15s, padding-left 0.15s',
                          }}
                          onMouseOver={e => {
                            e.currentTarget.style.background    = '#f0f9ff';
                            e.currentTarget.style.color         = '#0284c7';
                            e.currentTarget.style.paddingLeft   = '24px';
                          }}
                          onMouseOut={e => {
                            e.currentTarget.style.background    = '';
                            e.currentTarget.style.color         = '#1e293b';
                            e.currentTarget.style.paddingLeft   = '18px';
                          }}
                        >
                          <span style={{marginRight:'8px', fontSize:'11px', color:'#0ea5e9'}}>▶</span>
                          {child.typeName}
                        </a>
                      ))}
                    </div>
                  )}
                </li>
              ))}

              {/* Static: Tra cứu lịch tiêm */}
              <li>
                <a href="/tra-cuu-lich-tiem" style={bottomLinkStyle}
                  onMouseOver={e => {
                    e.currentTarget.style.background   = 'rgba(255,255,255,0.15)';
                    e.currentTarget.style.borderBottom = '2px solid #38bdf8';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.background   = 'transparent';
                    e.currentTarget.style.borderBottom = '2px solid transparent';
                  }}
                >
                  Tra cứu lịch tiêm
                </a>
              </li>

            </ul>
          </nav>
        </div>
      </div>

      {/* fade-down keyframe */}
      <style>{`
        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

/* ─── style tokens ──────────────────────────────────── */
const topLinkStyle = {
  display:        'inline-block',
  padding:        '8px 10px',
  textDecoration: 'none',
  color:          '#2A388F',
  fontSize:       '13px',
  fontWeight:     '600',
  letterSpacing:  '0.2px',
};

const bottomLinkStyle = {
  display:        'block',
  padding:        '11px 18px',
  color:          '#ffffff',
  textDecoration: 'none',
  fontSize:       '13px',
  fontWeight:     '600',
  letterSpacing:  '0.3px',
  textTransform:  'uppercase',
  whiteSpace:     'nowrap',
  borderBottom:   '2px solid transparent',
  transition:     'background 0.2s, border-bottom-color 0.2s',
};

export default Header;
