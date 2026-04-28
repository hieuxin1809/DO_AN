import React, { useState } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { postMethodPayload } from '../../services/request';
import Swal from 'sweetalert2';
import '../../layout/customer/styles/register.scss';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { GoogleLogin } from '@react-oauth/google';

function Register() {
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showRepeatPassword, setShowRepeatPassword] = useState(false);
    const [passwordVisible, setPasswordVisible] = useState(false);
    async function handleRegister(event) {
        event.preventDefault();
        setLoading(true);

        const payload = {
            email: event.target.elements.email.value.trim(),
            username: event.target.elements.username.value.trim(),
            password: event.target.elements.password.value,
            repeatPassword: event.target.elements.repeatPassword.value,
        };

        if (payload.password !== payload.repeatPassword) {
            toast.error('Mật khẩu không trùng khớp');
            setLoading(false);
            return;
        }

        if (payload.password.length < 6) {
            toast.error('Mật khẩu phải có ít nhất 6 ký tự');
            setLoading(false);
            return;
        }

        try {
            const res = await postMethodPayload('/api/user/public/register', payload);

            if (!res.ok) {
                const result = await res.json();
                Swal.fire({
                    icon: 'error',
                    title: 'Đăng ký thất bại',
                    text: result.errorMessage || 'Email đã được sử dụng',
                });
            } else {
                toast.success('Đăng ký thành công! Vui lòng kiểm tra email để kích hoạt tài khoản.');
                setTimeout(() => {
                    window.location.href = '/activate-account?email=' + encodeURIComponent(payload.email);
                }, 1500);
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Đăng ký thất bại',
                text: 'Không thể kết nối đến server',
            });
        } finally {
            setLoading(false);
        }
    }
    const handleLoginSuccess = async (accessToken) => {
        console.log(accessToken);

        var response = await fetch('http://localhost:8080/api/user/login/google', {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain'
            },
            body: accessToken.credential
        })
        var result = await response.json();
        if (response.status < 300) {
            processLogin(result.user, result.token)
        }
        if (response.status == 417) {
            toast.warning(result.defaultMessage);
        }
    };

    const handleLoginError = () => {
        toast.error("Đăng nhập google thất bại")
    };
    async function processLogin(user, token) {
        toast.success('Đăng nhập thành công!');
        await new Promise(resolve => setTimeout(resolve, 1500));
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        if (user.authorities.name === "Admin") {
            window.location.href = 'admin/index';
        }
        if (user.authorities.name === "Customer") {
            window.location.href = '/';
        }
        if (user.authorities.name === "Doctor") {

        }
        if (user.authorities.name === "Nurse") {
            window.location.href = 'staff/vaccine';
        }
        if (user.authorities.name === "Support Staff") {
            window.location.href = '/staff/chat';
        }
    }
    const togglePasswordVisibility = () => {
        setPasswordVisible(!passwordVisible);
    };
    return (
        <div className="register-container">
            <div className="register-card">
                <div className="register-image">
                    <h1>VaxMS</h1>
                    <p>Đăng ký tài khoản dễ dàng và nhanh chóng.</p>
                </div>
                <div className="register-form">
                    <h2>Tạo tài khoản</h2>
                    <form onSubmit={handleRegister} autoComplete="off">
                        <div className="form-group">
                            <label>Email *</label>
                            <input type="email" name="email" required placeholder="Nhập địa chỉ email" />
                        </div>
                        <div className="form-group">
                            <label>Tên người dùng *</label>
                            <input type="text" name="username" required placeholder="Nhập tên của bạn" />
                        </div>
                        <div className="form-group">
                            <label htmlFor="password">Mật khẩu</label>
                            <div className="password-wrapper">
                                <input
                                    type={passwordVisible ? 'text' : 'password'}
                                    name="password"
                                    required
                                    placeholder="Nhập mật khẩu"
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
                            <label htmlFor="password">Nhập lại mật khẩu</label>
                            <div className="password-wrapper">
                                <input
                                    type={passwordVisible ? 'text' : 'password'}
                                    name="repeatPassword"
                                    required
                                    placeholder="Nhập lại mật khẩu"
                                />
                                <span
                                    className="password-eye-icon"
                                    onClick={togglePasswordVisibility}
                                >
                                    {passwordVisible ? '👁️' : '🙈'}
                                </span>
                            </div>
                        </div>
                        <button type="submit" className="register-btn" disabled={loading}>
                            {loading ? 'Đang đăng ký...' : 'Đăng ký'}
                        </button>
                    </form>
                    <div className="or-divider">HOẶC</div>
                    <GoogleOAuthProvider clientId="107951312369-74pcdu34hcm30tp96l4m1pvi8kqtvqea.apps.googleusercontent.com">
                        <div className='divcenter' style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <GoogleLogin
                                onSuccess={handleLoginSuccess}
                                onError={handleLoginError}
                            />
                        </div>
                    </GoogleOAuthProvider>
                    <p className="register-footer">
                        Bằng cách nhấp vào Đăng ký hoặc Đăng nhập với Google, bạn đồng ý với{' '}
                        <a href="#">Điều khoản sử dụng</a> và <a href="#">Chính sách quyền riêng tư</a> của chúng tôi.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Register;