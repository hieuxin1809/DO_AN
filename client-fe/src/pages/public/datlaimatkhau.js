import React, { useState } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { postMethod } from '../../services/request';
import Swal from 'sweetalert2';
import '../../layout/customer/styles/datlaimk.scss';

function DatLaiMatKhau() {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [repeatPasswordVisible, setRepeatPasswordVisible] = useState(false);

  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };

  const toggleRepeatPasswordVisibility = () => {
    setRepeatPasswordVisible(!repeatPasswordVisible);
  };

  async function handleDatLaiMk(event) {
    event.preventDefault();
    const newpass = event.target.elements.newpass.value.trim();
    const renewpass = event.target.elements.renewpass.value.trim();

    if (newpass !== renewpass) {
      toast.error('Mật khẩu không trùng khớp');
      return;
    }

    const uls = new URL(document.URL);
    const email = uls.searchParams.get('email');
    const key = uls.searchParams.get('key');
    const response = await postMethod(
      `/api/user/public/complete-forgot-password?email=${email}&key=${key}&password=${newpass}`
    );

    if (response.status < 300) {
      Swal.fire({
        title: 'Thông báo',
        text: 'Cập nhật mật khẩu thành công',
        preConfirm: () => {
          window.location.href = '/';
        },
      });
    } else {
      if (response.status === 417) {
        const result = await response.json();
        toast.warning(result.defaultMessage);
      } else {
        toast.error('Thất bại');
      }
    }
  }

  return (
    <div className="reset-password-container">
      <div className="reset-password-card">
        <div className="reset-password-image">
          <h1>Ivaccine</h1>
          <p>Đặt lại mật khẩu của bạn một cách an toàn.</p>
        </div>
        <div className="reset-password-form">
          <h2>Đặt lại mật khẩu</h2>
          <form onSubmit={handleDatLaiMk} autoComplete="off">
            <div className="form-group">
              <label htmlFor="newpass">Mật khẩu mới</label>
              <div className="password-wrapper">
                <input
                  type={passwordVisible ? 'text' : 'password'}
                  name="newpass"
                  id="newpass"
                  required
                  placeholder="Nhập mật khẩu mới"
                />
                <span
                  className="password-eye-icon"
                  onClick={togglePasswordVisibility}
                >
                  {passwordVisible ? '👁️' : '🙈'}
                </span>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="renewpass">Nhập lại mật khẩu</label>
              <div className="password-wrapper">
                <input
                  type={repeatPasswordVisible ? 'text' : 'password'}
                  name="renewpass"
                  id="renewpass"
                  required
                  placeholder="Nhập lại mật khẩu"
                />
                <span
                  className="password-eye-icon"
                  onClick={toggleRepeatPasswordVisibility}
                >
                  {repeatPasswordVisible ? '👁️' : '🙈'}
                </span>
              </div>
            </div>
            <button className="btn btn-primary" type="submit">
              Gửi
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default DatLaiMatKhau;